import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { PASSWORD, createTestApp, sidFrom, type TestApp } from './support/test-app.js';

const EMAIL = 'ana@empresa.com';
const MINUTE = 60_000;

describe('Entrar, sessão e trocar a senha (e2e HTTP)', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    await t.people.create({ email: EMAIL, name: 'Ana', password: PASSWORD });
  });
  afterEach(() => t.close());

  const signIn = (body: object, ip = '10.0.0.1') =>
    t.http().post('/v1/sessoes').set('X-Forwarded-For', ip).send(body);
  const login = async (ip = '10.0.0.1') => {
    const res = await signIn({ email: EMAIL, senha: PASSWORD }, ip);
    expect(res.status).toBe(201);
    return sidFrom(res)!;
  };
  const me = (sid?: string) => (sid ? t.http().get('/v1/eu').set('Cookie', sid) : t.http().get('/v1/eu'));

  describe('POST /v1/sessoes', () => {
    it('entra com e-mail e senha certos e devolve o membro, sem token no corpo', async () => {
      const res = await signIn({ email: EMAIL, senha: PASSWORD });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        email: EMAIL,
        nome: 'Ana',
        administrador: false,
        permissao_dados: false,
      });
      expect(JSON.stringify(res.body)).not.toContain('sid');
      expect(sidFrom(res)).toBeDefined();
    });

    it('aceita maiúsculas e espaços nas pontas do e-mail', async () => {
      const res = await signIn({ email: '  ANA@Empresa.COM ', senha: PASSWORD });
      expect(res.status).toBe(201);
    });

    it('responde igual para e-mail inexistente e senha errada', async () => {
      const wrongPassword = await signIn({ email: EMAIL, senha: 'errada' });
      const unknownEmail = await signIn({ email: 'ninguem@empresa.com', senha: 'errada' });
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(wrongPassword.body.error).toEqual({ code: 'credenciais_invalidas', message: 'E-mail ou senha incorretos' });
      expect(sidFrom(wrongPassword)).toBeUndefined();
    });

    it('recusa e-mail malformado e campos em branco com dados_invalidos', async () => {
      for (const body of [{ email: 'não-é-email', senha: 'x' }, { email: EMAIL, senha: '' }, {}]) {
        const res = await signIn(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
    });

    it('grava o cookie com os atributos do LLD e só o hash do token no banco', async () => {
      const res = await signIn({ email: EMAIL, senha: PASSWORD });
      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('sid='))!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Max-Age=\d+/);
      expect(cookie).not.toMatch(/Domain=/i);

      const token = decodeURIComponent(cookie.split(';')[0]!.slice('sid='.length));
      const rows: { id: string }[] = await t.dataSource.query('SELECT id FROM sessions');
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).not.toBe(token);
      expect(rows[0]!.id).toBe(createHash('sha256').update(token).digest('base64url'));
    });

    describe('limite de tentativas', () => {
      const failTimes = async (n: number, ip = '10.0.0.1') => {
        let last;
        for (let i = 0; i < n; i++) last = await signIn({ email: EMAIL, senha: 'errada' }, ip);
        return last!;
      };

      it('depois de 5 erros seguidos, recusa até a senha certa e diz quanto falta', async () => {
        const fifth = await failTimes(5);
        expect(fifth.status).toBe(429);
        expect(fifth.body.error.code).toBe('tentativas_demais');
        expect(fifth.body.error.details.segundos_restantes).toBe(15 * 60);

        t.clock.advance(5 * MINUTE);
        const correct = await signIn({ email: EMAIL, senha: PASSWORD });
        expect(correct.status).toBe(429);
        expect(correct.body.error.details.segundos_restantes).toBe(10 * 60);
        expect(sidFrom(correct)).toBeUndefined();
      });

      it('registra no log, com nível warn e sem a senha, a tentativa bloqueada', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        await failTimes(5);
        await signIn({ email: EMAIL, senha: PASSWORD });
        const messages = warn.mock.calls.map(([message]) => String(message));
        expect(messages.length).toBeGreaterThanOrEqual(2);
        expect(messages.some((message) => message.includes(EMAIL))).toBe(true);
        expect(messages.join('\n')).not.toContain(PASSWORD);
        warn.mockRestore();
      });

      it('conta também o e-mail inexistente', async () => {
        for (let i = 0; i < 5; i++) await signIn({ email: 'ninguem@empresa.com', senha: 'x' });
        const res = await signIn({ email: 'ninguem@empresa.com', senha: 'x' });
        expect(res.status).toBe(429);
      });

      it('a espera termina sozinha', async () => {
        await failTimes(5);
        t.clock.advance(15 * MINUTE + 1000);
        const res = await signIn({ email: EMAIL, senha: PASSWORD });
        expect(res.status).toBe(201);
      });

      it('depois da espera, o contador recomeça', async () => {
        await failTimes(5);
        t.clock.advance(15 * MINUTE + 1000);
        const res = await failTimes(1);
        expect(res.status).toBe(401);
      });

      it('um acerto zera a contagem de erros', async () => {
        await failTimes(4);
        expect((await signIn({ email: EMAIL, senha: PASSWORD })).status).toBe(201);
        const res = await failTimes(4);
        expect(res.status).toBe(401);
      });

      it('os erros de outro IP não travam este IP', async () => {
        await failTimes(5, '10.0.0.9');
        const res = await signIn({ email: EMAIL, senha: PASSWORD }, '10.0.0.1');
        expect(res.status).toBe(201);
      });

      it('o teto por IP recusa a 31ª tentativa, mesmo com e-mails diferentes', async () => {
        let last: Awaited<ReturnType<typeof signIn>> | undefined;
        for (let i = 0; i < 31; i++) last = await signIn({ email: `pessoa${i}@empresa.com`, senha: 'x' }, '10.0.0.5');
        expect(last!.status).toBe(429);
        expect(last!.body.error.code).toBe('tentativas_demais');
        expect(last!.body.error.details.segundos_restantes).toBeGreaterThan(0);
      });
    });
  });

  describe('sessão', () => {
    it('GET /v1/eu devolve o membro com o cookie', async () => {
      const sid = await login();
      const res = await me(sid);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(EMAIL);
    });

    it('recusa sem cookie e com cookie inválido, com sessao_invalida', async () => {
      for (const res of [await me(), await me('sid=lixo')]) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('sessao_invalida');
      }
    });

    it('cada uso renova o prazo e a sessão vence depois de 30 dias sem uso', async () => {
      const sid = await login();
      for (let i = 0; i < 3; i++) {
        t.clock.advance(20 * 24 * 60 * MINUTE);
        expect((await me(sid)).status).toBe(200);
      }
      t.clock.advance(31 * 24 * 60 * MINUTE);
      expect((await me(sid)).status).toBe(401);
    });

    it('sair apaga só a sessão atual', async () => {
      const first = await login();
      const second = await login('10.0.0.2');
      const res = await t.http().delete('/v1/sessoes/atual').set('Cookie', first);
      expect(res.status).toBe(204);
      expect((res.headers['set-cookie'] as unknown as string[]).join(';')).toMatch(/sid=;/);
      expect((await me(first)).status).toBe(401);
      expect((await me(second)).status).toBe(200);
    });

    it('sair sem sessão é recusado', async () => {
      expect((await t.http().delete('/v1/sessoes/atual')).status).toBe(401);
    });
  });

  describe('PUT /v1/eu/senha', () => {
    const change = (sid: string, body: object) => t.http().put('/v1/eu/senha').set('Cookie', sid).send(body);

    it('com a senha atual errada, nada muda', async () => {
      const sid = await login();
      const res = await change(sid, { senha_atual: 'errada', nova_senha: 'Nova-Senha9' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('senha_atual_incorreta');
      expect((await signIn({ email: EMAIL, senha: PASSWORD })).status).toBe(201);
    });

    it('lista as regras que faltaram', async () => {
      const sid = await login();
      const res = await change(sid, { senha_atual: PASSWORD, nova_senha: 'abc' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('senha_fraca');
      expect(res.body.error.details.regras_faltando).toEqual(['minimo_8_caracteres', 'maiuscula', 'numero', 'simbolo']);
    });

    it('troca a senha, mantém a sessão atual e apaga as outras', async () => {
      const current = await login();
      const other = await login('10.0.0.2');
      const res = await change(current, { senha_atual: PASSWORD, nova_senha: 'Nova-Senha9' });
      expect(res.status).toBe(204);
      expect((await me(current)).status).toBe(200);
      expect((await me(other)).status).toBe(401);
      expect((await signIn({ email: EMAIL, senha: PASSWORD })).status).toBe(401);
      expect((await signIn({ email: EMAIL, senha: 'Nova-Senha9' })).status).toBe(201);
    });

    it('exige sessão', async () => {
      const res = await t.http().put('/v1/eu/senha').send({ senha_atual: PASSWORD, nova_senha: 'Nova-Senha9' });
      expect(res.status).toBe(401);
    });
  });

  describe('corpo de erro único', () => {
    it('rota inexistente', async () => {
      const res = await t.http().get('/v1/nada');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { code: 'nao_encontrado', message: expect.any(String) } });
    });

    it('JSON malformado', async () => {
      const res = await t.http().post('/v1/sessoes').set('Content-Type', 'application/json').send('{"email":');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('dados_invalidos');
    });
  });
});
