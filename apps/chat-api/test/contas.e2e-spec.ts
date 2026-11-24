import { runContas } from '../src/cli/contas.command.js';
import { missingPasswordRules } from '../src/accounts/password-rule.js';
import { PASSWORD, createTestApp, sidFrom, type TestApp } from './support/test-app.js';

describe('Comando contas (e2e)', () => {
  let t: TestApp;
  const run = (...argv: string[]) => runContas(argv, t.app);
  const passwordFrom = (out: string) => /Senha \(mostrada uma vez só\): (\S+)/.exec(out)![1]!;
  const signIn = (email: string, senha: string) => t.http().post('/v1/sessoes').send({ email, senha });

  beforeEach(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.close());

  it('criar gera uma senha que cumpre a regra e com a qual a pessoa entra', async () => {
    const result = await run('criar', 'Bia@Empresa.com', 'bia', 'Bia', 'Souza');
    expect(result.code).toBe(0);
    const password = passwordFrom(result.out);
    expect(missingPasswordRules(password)).toEqual([]);
    const res = await signIn('bia@empresa.com', password);
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Bia Souza');
  });

  it('criar recusa e-mail que já existe, com qualquer combinação de maiúsculas', async () => {
    await run('criar', 'bia@empresa.com', 'bia', 'Bia');
    const again = await run('criar', 'BIA@empresa.COM', 'outra', 'Outra');
    expect(again.code).toBe(1);
    expect(again.err).toContain('Já existe uma conta');
  });

  it('redefinir-senha mostra a senha nova e encerra as sessões', async () => {
    await t.createPerson({ email: 'ana@empresa.com', name: 'Ana' });
    const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
    const result = await run('redefinir-senha', 'ana@empresa.com');
    expect(result.code).toBe(0);
    expect((await t.http().get('/v1/eu').set('Cookie', sid)).status).toBe(401);
    expect((await signIn('ana@empresa.com', PASSWORD)).status).toBe(401);
    expect((await signIn('ana@empresa.com', passwordFrom(result.out))).status).toBe(201);
  });

  it('encerrar-sessoes corta o acesso em todos os navegadores', async () => {
    await t.createPerson({ email: 'ana@empresa.com', name: 'Ana' });
    const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
    expect((await run('encerrar-sessoes', 'ana@empresa.com')).code).toBe(0);
    expect((await t.http().get('/v1/eu').set('Cookie', sid)).status).toBe(401);
  });

  it('dá e tira o papel de administrador e a permissão de dados', async () => {
    await t.createPerson({ email: 'ana@empresa.com', name: 'Ana' });
    const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
    const eu = async () => (await t.http().get('/v1/eu').set('Cookie', sid)).body;

    await run('dar-admin', 'ana@empresa.com');
    await run('dar-permissao-dados', 'ana@empresa.com');
    expect(await eu()).toMatchObject({ administrador: true, permissao_dados: true });

    await run('tirar-admin', 'ana@empresa.com');
    await run('tirar-permissao-dados', 'ana@empresa.com');
    expect(await eu()).toMatchObject({ administrador: false, permissao_dados: false });
  });

  it('diz com clareza quando o e-mail não tem conta', async () => {
    for (const sub of ['redefinir-senha', 'encerrar-sessoes', 'dar-admin', 'tirar-permissao-dados']) {
      const result = await run(sub, 'ninguem@empresa.com');
      expect(result.code).toBe(1);
      expect(result.err).toContain('Não existe conta com o e-mail ninguem@empresa.com');
    }
  });

  it('criar recusa e-mail malformado', async () => {
    const result = await run('criar', 'nao-e-email', 'bia', 'Bia');
    expect(result.code).toBe(1);
    expect(result.err).toContain('E-mail inválido');
  });

  describe('@usuário', () => {
    it('criar mostra o @usuário da conta', async () => {
      const result = await run('criar', 'bia@empresa.com', 'bia', 'Bia');
      expect(result.code).toBe(0);
      expect(result.out).toContain('@bia');
    });

    it('criar aceita o @ inicial e qualquer caixa, e recusa o mesmo @usuário depois', async () => {
      const first = await run('criar', 'bia@empresa.com', '@Bia.Souza', 'Bia');
      expect(first.code).toBe(0);
      expect(first.out).toContain('@bia.souza');
      const again = await run('criar', 'outra@empresa.com', 'BIA.souza', 'Outra');
      expect(again.code).toBe(1);
      expect(again.err).toContain('@bia.souza já está em uso');
      expect((await signIn('outra@empresa.com', 'qualquer')).status).toBe(401);
    });

    it('criar recusa @usuário fora do formato, com mensagem clara', async () => {
      for (const username of ['ab', 'joão', 'a!b', 'x'.repeat(31)]) {
        const result = await run('criar', 'bia@empresa.com', username, 'Bia');
        expect(result.code, username).toBe(1);
        expect(result.err, username).toContain('formato');
      }
    });

    it('criar pede e-mail, @usuário e nome', async () => {
      for (const argv of [['criar'], ['criar', 'bia@empresa.com'], ['criar', 'bia@empresa.com', 'bia']]) {
        const result = await run(...argv);
        expect(result.code, argv.join(' ')).toBe(1);
        expect(result.err, argv.join(' ')).toContain('criar <email> <usuario> <nome>');
      }
    });

    it('dois cadastros ao mesmo tempo com o mesmo @usuário terminam com uma conta só', async () => {
      const results = await Promise.all([
        run('criar', 'a@empresa.com', 'bia', 'A'),
        run('criar', 'b@empresa.com', 'bia', 'B'),
      ]);
      expect(results.map((r) => r.code).sort((a, b) => a - b)).toEqual([0, 1]);
      expect(results.find((r) => r.code === 1)!.err).toContain('já está em uso');
    });
  });

  describe('definir-usuario', () => {
    it('troca o @usuário, aceitando o @ inicial e qualquer caixa, e libera o antigo', async () => {
      await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
      const result = await run('definir-usuario', 'ana@empresa.com', '@Ana.Nova');
      expect(result.code).toBe(0);
      expect(result.out).toContain('@ana.nova');

      const taken = await run('criar', 'outra@empresa.com', 'ana.nova', 'Outra');
      expect(taken.err).toContain('@ana.nova já está em uso');
      const freed = await run('criar', 'bia@empresa.com', 'ana', 'Bia');
      expect(freed.code).toBe(0);
    });

    it('aceita o @usuário que a conta já tem', async () => {
      await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
      expect((await run('definir-usuario', 'ana@empresa.com', 'ana')).code).toBe(0);
    });

    it('recusa conta que não existe', async () => {
      const result = await run('definir-usuario', 'ninguem@empresa.com', 'novo');
      expect(result.code).toBe(1);
      expect(result.err).toContain('Não existe conta com o e-mail ninguem@empresa.com');
    });

    it('recusa @usuário em uso por outra conta, sem alterar nada', async () => {
      await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
      await t.createPerson({ email: 'bia@empresa.com', name: 'Bia', username: 'bia' });
      const result = await run('definir-usuario', 'bia@empresa.com', 'ANA');
      expect(result.code).toBe(1);
      expect(result.err).toContain('@ana já está em uso');
      // Continua com o @usuário de antes: ninguém mais consegue pegá-lo.
      const still = await run('criar', 'cris@empresa.com', 'bia', 'Cris');
      expect(still.err).toContain('@bia já está em uso');
    });

    it('recusa @usuário fora do formato', async () => {
      await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
      for (const username of ['ab', 'joão', 'a!b', 'x'.repeat(31)]) {
        const result = await run('definir-usuario', 'ana@empresa.com', username);
        expect(result.code, username).toBe(1);
        expect(result.err, username).toContain('formato');
      }
    });

    it('pede o e-mail e o @usuário', async () => {
      for (const argv of [['definir-usuario'], ['definir-usuario', 'ana@empresa.com']]) {
        const result = await run(...argv);
        expect(result.code, argv.join(' ')).toBe(1);
        expect(result.err, argv.join(' ')).toContain('definir-usuario <email> <usuario>');
      }
    });

    it('não encerra as sessões da conta', async () => {
      await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
      const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
      await run('definir-usuario', 'ana@empresa.com', 'ana.nova');
      expect((await t.http().get('/v1/eu').set('Cookie', sid)).status).toBe(200);
    });
  });

  it('subcomando desconhecido mostra o uso', async () => {
    const result = await run('xpto');
    expect(result.code).toBe(1);
    expect(result.err).toContain('Uso:');
  });
});
