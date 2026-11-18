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
    const result = await run('criar', 'Bia@Empresa.com', 'Bia', 'Souza');
    expect(result.code).toBe(0);
    const password = passwordFrom(result.out);
    expect(missingPasswordRules(password)).toEqual([]);
    const res = await signIn('bia@empresa.com', password);
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Bia Souza');
  });

  it('criar recusa e-mail que já existe, com qualquer combinação de maiúsculas', async () => {
    await run('criar', 'bia@empresa.com', 'Bia');
    const again = await run('criar', 'BIA@empresa.COM', 'Outra');
    expect(again.code).toBe(1);
    expect(again.err).toContain('Já existe uma conta');
  });

  it('redefinir-senha mostra a senha nova e encerra as sessões', async () => {
    await t.people.create({ email: 'ana@empresa.com', name: 'Ana', password: PASSWORD });
    const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
    const result = await run('redefinir-senha', 'ana@empresa.com');
    expect(result.code).toBe(0);
    expect((await t.http().get('/v1/eu').set('Cookie', sid)).status).toBe(401);
    expect((await signIn('ana@empresa.com', PASSWORD)).status).toBe(401);
    expect((await signIn('ana@empresa.com', passwordFrom(result.out))).status).toBe(201);
  });

  it('encerrar-sessoes corta o acesso em todos os navegadores', async () => {
    await t.people.create({ email: 'ana@empresa.com', name: 'Ana', password: PASSWORD });
    const sid = sidFrom(await signIn('ana@empresa.com', PASSWORD))!;
    expect((await run('encerrar-sessoes', 'ana@empresa.com')).code).toBe(0);
    expect((await t.http().get('/v1/eu').set('Cookie', sid)).status).toBe(401);
  });

  it('dá e tira o papel de administrador e a permissão de dados', async () => {
    await t.people.create({ email: 'ana@empresa.com', name: 'Ana', password: PASSWORD });
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

  it('subcomando desconhecido mostra o uso', async () => {
    const result = await run('xpto');
    expect(result.code).toBe(1);
    expect(result.err).toContain('Uso:');
  });
});
