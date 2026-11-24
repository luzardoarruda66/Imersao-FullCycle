import { chatMessageSchema } from 'chat-events';
import { v7 as uuidv7 } from 'uuid';
import { EDIT_WINDOW_MS } from '../src/config/values.js';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;
type Counts = { nao_lidas: number; mencoes: number };

describe('Edição da mensagem (e2e)', () => {
  let t: TestApp;
  let ana: Person;
  let bia: Person;
  let caio: Person;
  let geral: string;

  beforeEach(async () => {
    t = await createTestApp();
    ana = await signUp(t, 'ana@empresa.com', 'Ana', '10.0.0.1');
    bia = await signUp(t, 'bia@empresa.com', 'Bia', '10.0.0.2');
    caio = await signUp(t, 'caio@empresa.com', 'Caio', '10.0.0.3');
    geral = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'geral', tipo: 'publico' })).body.id;
  });
  afterEach(() => t.close());

  const send = async (person: Person, texto: string, conversa = geral, citacao_id?: string) =>
    (await as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, citacao_id ? { texto, citacao_id } : { texto })).body as { id: string };
  const edit = (person: Person | { sid: undefined }, id: string, texto: unknown, conversa = geral) =>
    as(t, person.sid).patch(`/v1/conversas/${conversa}/mensagens/${id}`, { texto });
  const counts = async (person: Person): Promise<Counts> => {
    const body = (await as(t, person.sid).get('/v1/conversas')).body;
    const c = [...body.canais_publicos, ...body.canais_privados, ...body.diretas].find((x: { id: string }) => x.id === geral);
    return { nao_lidas: c.nao_lidas, mencoes: c.mencoes };
  };
  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);
  const quiet = () => new Promise((resolve) => setTimeout(resolve, 250));
  const age = (id: string, ms: number) => t.dataSource.getRepository(MessageEntity).update(id, { createdAt: new Date(t.clock.now() - ms) });

  describe('quem pode editar e até quando', () => {
    it('o autor edita: devolve a mensagem com o texto novo e editada_em, e o histórico a mostra', async () => {
      const m = await send(ana, 'texto antigo');
      const res = await edit(ana, m.id, '  texto novo  ');
      expect(res.status).toBe(200);
      expect(res.body.texto).toBe('texto novo');
      expect(res.body.editada_em).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/));
      expect(chatMessageSchema.parse(res.body)).toEqual(res.body);
      const page = (await as(t, bia.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens;
      expect(page).toEqual([res.body]);
    });

    it('a mensagem fica na mesma posição, com a mesma data de envio', async () => {
      const first = await send(ana, 'primeira');
      await send(ana, 'segunda');
      const original = (await as(t, bia.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens[0];
      await edit(ana, first.id, 'primeira, editada');
      const page = (await as(t, bia.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens;
      expect(page.map((x: { texto: string }) => x.texto)).toEqual(['primeira, editada', 'segunda']);
      expect(page[0].criada_em).toBe(original.criada_em);
    });

    it('outra pessoa recebe mensagem_de_outra_pessoa e nada muda', async () => {
      const m = await send(ana, 'minha');
      const res = await edit(bia, m.id, 'sequestrada');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('mensagem_de_outra_pessoa');
      expect((await as(t, ana.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens[0].texto).toBe('minha');
    });

    it('aceita em exatamente 4 horas e recusa com 4 horas e 1 segundo, com o prazo em segundos', async () => {
      const m = await send(ana, 'tarde');
      await age(m.id, EDIT_WINDOW_MS);
      expect((await edit(ana, m.id, 'ainda dá')).status).toBe(200);
      await age(m.id, EDIT_WINDOW_MS + 1000);
      const late = await edit(ana, m.id, 'agora não');
      expect(late.status).toBe(422);
      expect(late.body.error.code).toBe('prazo_encerrado');
      expect(late.body.error.details).toEqual({ prazo_segundos: 4 * 60 * 60 });
      expect((await as(t, ana.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens[0].texto).toBe('ainda dá');
    });

    it('recusa editar mensagem apagada', async () => {
      const m = await send(ana, 'vai sumir');
      await t.dataSource.getRepository(MessageEntity).update(m.id, { text: '', deletedAt: new Date() });
      const res = await edit(ana, m.id, 'ressuscitar');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('mensagem_apagada');
    });

    it('responde mensagem_inexistente a id inexistente, que não é UUID ou de outra conversa', async () => {
      const outra = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'outra', tipo: 'publico' })).body.id as string;
      const m = await send(ana, 'aqui');
      for (const [id, conversa] of [[uuidv7(), geral], ['não-é-uuid', geral], [m.id, outra]] as const) {
        const res = await edit(ana, id, 'x', conversa);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('mensagem_inexistente');
      }
    });

    it('conversa alheia responde como inexistente e sem sessão responde 401', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id as string;
      const m = await send(ana, 'secreta', privado);
      const res = await edit(caio, m.id, 'x', privado);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('conversa_inexistente');
      expect((await edit({ sid: undefined }, m.id, 'x', privado)).status).toBe(401);
    });
  });

  describe('texto', () => {
    it('recusa vazio, só espaços, não string e acima de 4.000 caracteres; aceita 4.000', async () => {
      const m = await send(ana, 'oi');
      for (const texto of ['', '   ', 42, null, 'x'.repeat(4001)]) {
        const res = await edit(ana, m.id, texto);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
      expect((await edit(ana, m.id, 'x'.repeat(4000))).status).toBe(200);
    });

    it('texto igual ao gravado não muda nada: sem editada_em e sem evento', async () => {
      const m = await send(ana, 'igual');
      const biaConn = await listen(bia);
      const res = await edit(ana, m.id, '  igual  ');
      expect(res.status).toBe(200);
      expect(res.body.editada_em).toBeNull();
      await quiet();
      expect(eventsOf(biaConn, 'mensagem_editada')).toEqual([]);
      expect(eventsOf(biaConn, 'contagem_atualizada')).toEqual([]);
    });
  });

  describe('tempo real', () => {
    it('chega a todos os participantes, inclusive as duas abas de quem editou, e a ninguém mais', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id as string;
      await as(t, ana.sid).post(`/v1/conversas/${privado}/participantes`, { membros_ids: [bia.id] });
      const m = await send(ana, 'antes', privado);
      const [anaTab1, anaTab2, biaConn, caioConn] = [await listen(ana), await listen(ana), await listen(bia), await listen(caio)];
      const res = await edit(ana, m.id, 'depois', privado);
      for (const conn of [anaTab1, anaTab2, biaConn]) {
        await conn.waitFor(() => eventsOf(conn, 'mensagem_editada').length === 1);
        expect(eventsOf(conn, 'mensagem_editada')[0]!.dados).toEqual({ conversa_id: privado, mensagem: res.body });
      }
      await quiet();
      expect(eventsOf(caioConn, 'mensagem_editada')).toEqual([]);
    });

    it('entra na reposição de quem voltou depois de uma queda', async () => {
      const m = await send(ana, 'antes');
      const first = await listen(bia);
      const start = first.ready[0]!.ultimo_evento!;
      first.close();
      const res = await edit(ana, m.id, 'depois');
      const back = await t.connect({ cookie: bia.sid, lastEvent: start });
      await back.waitFor(() => back.ready.length === 1);
      expect(eventsOf(back, 'mensagem_editada').map((e) => e.dados)).toEqual([{ conversa_id: geral, mensagem: res.body }]);
    });
  });

  describe('menções e contadores', () => {
    it('menção acrescentada soma ao novo, a mantida não soma de novo, a removida desconta', async () => {
      const m = await send(ana, 'oi');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });

      await edit(ana, m.id, 'oi @bia');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 1 });

      const both = await edit(ana, m.id, 'oi @bia e @caio');
      expect(both.body.mencoes).toEqual([
        { id: bia.id, usuario: 'bia' },
        { id: caio.id, usuario: 'caio' },
      ]);
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 1 });
      expect(await counts(caio)).toEqual({ nao_lidas: 1, mencoes: 1 });

      await edit(ana, m.id, 'só @caio');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });
      expect(await counts(caio)).toEqual({ nao_lidas: 1, mencoes: 1 });
      await edit(ana, m.id, 'ninguém');
      expect(await counts(caio)).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('contagem_atualizada sai só para quem mudou, com as contagens novas', async () => {
      const m = await send(ana, 'oi');
      const [biaConn, caioConn, anaConn] = [await listen(bia), await listen(caio), await listen(ana)];
      await edit(ana, m.id, 'oi @bia');
      await biaConn.waitFor(() => eventsOf(biaConn, 'contagem_atualizada').length === 1);
      expect(eventsOf(biaConn, 'contagem_atualizada')[0]!.dados).toEqual({ conversa_id: geral, nao_lidas: 1, mencoes: 1 });
      await quiet();
      expect(eventsOf(caioConn, 'contagem_atualizada')).toEqual([]);
      expect(eventsOf(anaConn, 'contagem_atualizada')).toEqual([]);
      // Editar de novo, sem mexer nas menções, não publica contagem.
      await edit(ana, m.id, 'oi @bia, tudo bem?');
      await quiet();
      expect(eventsOf(biaConn, 'contagem_atualizada')).toHaveLength(1);
    });

    it('quem já leu a mensagem não tem o contador mexido, nem ao ser mencionado nem ao deixar de ser', async () => {
      const m = await send(ana, 'oi');
      await as(t, bia.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: m.id });
      const biaConn = await listen(bia);
      const added = await edit(ana, m.id, 'oi @bia');
      expect(added.body.mencoes).toEqual([{ id: bia.id, usuario: 'bia' }]);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      await edit(ana, m.id, 'oi sem ninguém');
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      await quiet();
      expect(eventsOf(biaConn, 'contagem_atualizada')).toEqual([]);
    });

    it('lido até uma mensagem do meio: a editada depois da leitura conta, a anterior não', async () => {
      const before = await send(ana, 'antes');
      await send(ana, 'depois');
      await as(t, bia.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: before.id });
      const later = (await as(t, bia.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens[1].id as string;
      await edit(ana, before.id, 'antes @bia');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });
      await edit(ana, later, 'depois @bia');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 1 });
    });

    it('o contador nunca fica negativo e o autor mencionando a si mesmo não vira menção', async () => {
      const m = await send(ana, 'oi @bia');
      await as(t, bia.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: m.id });
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      const res = await edit(ana, m.id, 'oi @ana');
      expect(res.body.mencoes).toEqual([]);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      expect(await counts(ana)).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('a leitura seguinte conta as menções gravadas pela edição', async () => {
      const first = await send(ana, 'primeira');
      const second = await send(ana, 'segunda');
      await edit(ana, second.id, 'segunda @bia');
      const read = await as(t, bia.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: first.id });
      expect(read.body).toEqual({ nao_lidas: 1, mencoes: 1 });
    });
  });

  it('uma citação a uma mensagem editada mostra o texto atual', async () => {
    const original = await send(ana, 'texto antigo');
    await send(bia, 'resposta', geral, original.id);
    await edit(ana, original.id, 'texto novo');
    const page = (await as(t, caio.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens;
    expect(page.at(-1).citacao.trecho).toBe('texto novo');
  });
});
