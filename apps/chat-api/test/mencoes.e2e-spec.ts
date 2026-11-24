import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;
type Counts = { nao_lidas: number; mencoes: number };

describe('Menções (e2e)', () => {
  let t: TestApp;
  let ana: Person;
  let bia: Person;
  let caio: Person;

  beforeEach(async () => {
    t = await createTestApp();
    ana = await signUp(t, 'ana@empresa.com', 'Ana', '10.0.0.1');
    bia = await signUp(t, 'bia@empresa.com', 'Bia', '10.0.0.2');
    caio = await signUp(t, 'caio@empresa.com', 'Caio', '10.0.0.3');
  });
  afterEach(() => t.close());

  const channel = async (person: Person, nome: string, tipo: 'publico' | 'privado') =>
    (await as(t, person.sid).post('/v1/conversas/canais', { nome, tipo })).body.id as string;
  const send = (person: Person, conversa: string, texto: string) =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, { texto });
  const counts = async (person: Person): Promise<Record<string, Counts>> => {
    const body = (await as(t, person.sid).get('/v1/conversas')).body;
    const all = [...body.canais_publicos, ...body.canais_privados, ...body.diretas] as (Counts & { id: string })[];
    return Object.fromEntries(all.map((c) => [c.id, { nao_lidas: c.nao_lidas, mencoes: c.mencoes }]));
  };
  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);

  describe('no envio', () => {
    it('devolve a menção na mensagem e soma 1 ao contador do mencionado, com a não lida', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, 'Bom dia @bia, tudo certo?');
      expect(res.status).toBe(201);
      expect(res.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 1 });
      expect((await counts(caio))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('soma 1 por mensagem, mesmo com a pessoa citada duas vezes no texto', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, '@bia, @bia, olha isto');
      expect(res.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 1 });
      await send(ana, id, 'e de novo @bia');
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 2, mencoes: 2 });
    });

    it('menciona várias pessoas de uma vez', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, '@caio e @bia');
      expect(res.body.mencoes).toEqual([
        { id: caio.id, usuario: 'caio' },
        { id: bia.id, usuario: 'bia' },
      ]);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 1 });
      expect((await counts(caio))[id]).toEqual({ nao_lidas: 1, mencoes: 1 });
    });

    it('o autor mencionando a si mesmo não soma contador nem vira menção', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, 'lembrete para @ana');
      expect(res.body.mencoes).toEqual([]);
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('@ que não é de um participante fica como texto comum, sem erro', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, 'escreva para bia@empresa.com ou @ninguem ou @');
      expect(res.status).toBe(201);
      expect(res.body.texto).toBe('escreva para bia@empresa.com ou @ninguem ou @');
      expect(res.body.mencoes).toEqual([]);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('pontuação depois do @usuário não impede a menção', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(ana, id, 'Valeu, @bia.');
      expect(res.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
    });

    it('no canal privado, quem não participa não é mencionado nem alcançado', async () => {
      const id = await channel(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      const res = await send(ana, id, '@bia e @caio');
      expect(res.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 1 });
      expect(await counts(caio)).toEqual({});
    });

    it('funciona na conversa direta', async () => {
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id as string;
      const res = await send(ana, direta, 'oi @bia');
      expect(res.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
      expect((await counts(bia))[direta]).toEqual({ nao_lidas: 1, mencoes: 1 });
    });

    it('o histórico traz as menções de cada mensagem', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await send(ana, id, 'sem ninguém');
      await send(ana, id, 'com @bia');
      const page = await as(t, caio.sid).get(`/v1/conversas/${id}/mensagens`);
      expect(page.body.mensagens.map((m: { mencoes: unknown }) => m.mencoes)).toEqual([[], [{ id: bia.id, usuario: 'bia' }]]);
    });

    it('o mencionado recebe mensagem_criada com a menção e as contagens somadas', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const [biaConn, caioConn] = [await listen(bia), await listen(caio)];
      await send(ana, id, 'ei @bia');
      await biaConn.waitFor(() => eventsOf(biaConn, 'mensagem_criada').length === 1);
      await caioConn.waitFor(() => eventsOf(caioConn, 'mensagem_criada').length === 1);
      expect(eventsOf(biaConn, 'mensagem_criada')[0]!.dados).toMatchObject({
        mensagem: { mencoes: [{ id: bia.id, usuario: 'bia' }] },
        contagens: { nao_lidas: 1, mencoes: 1 },
      });
      expect(eventsOf(caioConn, 'mensagem_criada')[0]!.dados).toMatchObject({ contagens: { nao_lidas: 1, mencoes: 0 } });
    });
  });

  describe('leitura', () => {
    it('até a última mensagem zera as duas contagens', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await send(ana, id, '@bia 1');
      const last = (await send(ana, id, '@bia 2')).body.id as string;
      const read = await as(t, bia.sid).post(`/v1/conversas/${id}/leitura`, { mensagem_id: last });
      expect(read.body).toEqual({ nao_lidas: 0, mencoes: 0 });
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('até uma mensagem do meio conta as menções gravadas depois da posição', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const first = (await send(ana, id, '@bia 1')).body.id as string;
      await send(ana, id, 'sem menção');
      await send(ana, id, '@bia 3');
      await send(ana, id, '@caio 4');
      const read = await as(t, bia.sid).post(`/v1/conversas/${id}/leitura`, { mensagem_id: first });
      expect(read.body).toEqual({ nao_lidas: 3, mencoes: 1 });
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 3, mencoes: 1 });
    });
  });

  describe('lista de mencionáveis', () => {
    const mentionable = (person: Person, conversa: string, busca?: string) =>
      as(t, person.sid).get(`/v1/conversas/${conversa}/mencionaveis${busca === undefined ? '' : `?busca=${encodeURIComponent(busca)}`}`);

    it('traz os participantes da conversa, menos quem pede, ordenados por nome', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await mentionable(ana, id);
      expect(res.status).toBe(200);
      expect(res.body.pessoas).toEqual([
        { id: bia.id, nome: 'Bia', usuario: 'bia' },
        { id: caio.id, nome: 'Caio', usuario: 'caio' },
      ]);
    });

    it('no canal privado e na conversa direta, só quem participa', async () => {
      const privado = await channel(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${privado}/participantes`, { membros_ids: [bia.id] });
      expect((await mentionable(ana, privado)).body.pessoas).toEqual([{ id: bia.id, nome: 'Bia', usuario: 'bia' }]);
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: caio.id })).body.id as string;
      expect((await mentionable(caio, direta)).body.pessoas).toEqual([{ id: ana.id, nome: 'Ana', usuario: 'ana' }]);
    });

    it('filtra por nome ou @usuário, sem diferenciar maiúsculas e acentos, e ignora o @ inicial', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await t.people.create({ email: 'joao@empresa.com', username: 'jj.silva', name: 'João Silva', password: 'x' });
      expect((await mentionable(ana, id, 'JOAO')).body.pessoas.map((p: { usuario: string }) => p.usuario)).toEqual(['jj.silva']);
      expect((await mentionable(ana, id, '@jj')).body.pessoas.map((p: { usuario: string }) => p.usuario)).toEqual(['jj.silva']);
      expect((await mentionable(ana, id, 'zzz')).body.pessoas).toEqual([]);
    });

    it('conversa alheia responde como inexistente e sem sessão responde 401', async () => {
      const privado = await channel(ana, 'fechado', 'privado');
      const res = await mentionable(caio, privado);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('conversa_inexistente');
      expect((await mentionable({ ...ana, sid: undefined as unknown as string }, privado)).status).toBe(401);
    });
  });
});
