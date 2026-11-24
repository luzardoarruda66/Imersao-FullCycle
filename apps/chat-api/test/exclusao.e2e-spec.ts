import { chatMessageSchema } from 'chat-events';
import { v7 as uuidv7 } from 'uuid';
import { EDIT_WINDOW_MS } from '../src/config/values.js';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;
type Counts = { nao_lidas: number; mencoes: number };

describe('Exclusão da mensagem (e2e)', () => {
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
  const remove = (person: Person | { sid: undefined }, id: string, conversa = geral) => as(t, person.sid).delete(`/v1/conversas/${conversa}/mensagens/${id}`);
  const read = (person: Person, id: string) => as(t, person.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: id });
  const history = async () => (await as(t, caio.sid).get(`/v1/conversas/${geral}/mensagens`)).body.mensagens as { id: string; texto: string; apagada: boolean; mencoes: unknown[]; citacao: { apagada: boolean; trecho: string } | null }[];
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

  describe('quem pode apagar e até quando', () => {
    it('o autor apaga: devolve a mensagem apagada, sem texto, menções nem citação, e o texto sai do banco', async () => {
      const original = await send(bia, 'citada');
      const m = await send(ana, 'segredo @bia', geral, original.id);
      const res = await remove(ana, m.id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: m.id, texto: '', apagada: true, mencoes: [], citacao: null });
      expect(chatMessageSchema.parse(res.body)).toEqual(res.body);
      const [row] = await t.dataSource.query<{ text: string; deleted_at: Date | null }[]>(`SELECT text, deleted_at FROM messages WHERE id = $1`, [m.id]);
      expect(row!.text).toBe('');
      expect(row!.deleted_at).not.toBeNull();
      expect(await t.dataSource.query(`SELECT 1 FROM mentions WHERE message_id = $1`, [m.id])).toEqual([]);
    });

    it('o histórico mantém a mensagem na mesma posição, apagada e sem texto', async () => {
      await send(ana, 'primeira');
      const m = await send(ana, 'do meio');
      await send(ana, 'última');
      await remove(ana, m.id);
      const page = await history();
      expect(page.map((x) => x.texto)).toEqual(['primeira', '', 'última']);
      expect(page[1]).toMatchObject({ id: m.id, apagada: true, mencoes: [] });
    });

    it('outra pessoa recebe mensagem_de_outra_pessoa e nada muda', async () => {
      const m = await send(ana, 'minha');
      const res = await remove(bia, m.id);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('mensagem_de_outra_pessoa');
      expect((await history())[0]!.texto).toBe('minha');
    });

    it('aceita em exatamente 4 horas e recusa com 4 horas e 1 segundo', async () => {
      const a = await send(ana, 'no limite');
      const b = await send(ana, 'passou');
      await age(a.id, EDIT_WINDOW_MS);
      await age(b.id, EDIT_WINDOW_MS + 1000);
      expect((await remove(ana, a.id)).status).toBe(200);
      const late = await remove(ana, b.id);
      expect(late.status).toBe(422);
      expect(late.body.error.code).toBe('prazo_encerrado');
      expect(late.body.error.details).toEqual({ prazo_segundos: 4 * 60 * 60 });
      expect((await history()).map((x) => x.texto)).toEqual(['passou', '']);
    });

    it('responde mensagem_inexistente a id inexistente, que não é UUID ou de outra conversa', async () => {
      const outra = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'outra', tipo: 'publico' })).body.id as string;
      const m = await send(ana, 'aqui');
      for (const [id, conversa] of [[uuidv7(), geral], ['não-é-uuid', geral], [m.id, outra]] as const) {
        const res = await remove(ana, id, conversa);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('mensagem_inexistente');
      }
    });

    it('conversa alheia responde como inexistente e sem sessão responde 401', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id as string;
      const m = await send(ana, 'secreta', privado);
      const res = await remove(caio, m.id, privado);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('conversa_inexistente');
      expect((await remove({ sid: undefined }, m.id, privado)).status).toBe(401);
    });

    it('depois de apagada, editar é recusado e citar também', async () => {
      const m = await send(ana, 'vai sumir');
      await remove(ana, m.id);
      const edited = await as(t, ana.sid).patch(`/v1/conversas/${geral}/mensagens/${m.id}`, { texto: 'volta' });
      expect(edited.body.error.code).toBe('mensagem_apagada');
      const quoted = await as(t, bia.sid).post(`/v1/conversas/${geral}/mensagens`, { texto: 'r', citacao_id: m.id });
      expect(quoted.status).toBe(400);
    });
  });

  describe('apagar duas vezes', () => {
    it('em sequência, a segunda é sucesso sem efeito, mesmo depois do prazo, e não publica nada', async () => {
      const m = await send(ana, 'oi @bia');
      await remove(ana, m.id);
      const biaConn = await listen(bia);
      await age(m.id, EDIT_WINDOW_MS + 60_000);
      const again = await remove(ana, m.id);
      expect(again.status).toBe(200);
      expect(again.body).toMatchObject({ id: m.id, texto: '', apagada: true });
      await quiet();
      expect(eventsOf(biaConn, 'mensagem_apagada')).toEqual([]);
      expect(eventsOf(biaConn, 'contagem_atualizada')).toEqual([]);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('em paralelo, desconta uma vez só e publica uma vez só', async () => {
      await send(ana, 'antes');
      const m = await send(ana, 'oi @bia');
      const biaConn = await listen(bia);
      expect(await counts(bia)).toEqual({ nao_lidas: 2, mencoes: 1 });
      const results = await Promise.all([remove(ana, m.id), remove(ana, m.id), remove(ana, m.id)]);
      expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });
      await quiet();
      expect(eventsOf(biaConn, 'mensagem_apagada')).toHaveLength(1);
      expect(eventsOf(biaConn, 'contagem_atualizada')).toHaveLength(1);
    });
  });

  describe('tempo real', () => {
    it('chega a todos os participantes, inclusive as duas abas do autor, só com a conversa e o id, e a ninguém mais', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id as string;
      await as(t, ana.sid).post(`/v1/conversas/${privado}/participantes`, { membros_ids: [bia.id] });
      const m = await send(ana, 'antes', privado);
      const [anaTab1, anaTab2, biaConn, caioConn] = [await listen(ana), await listen(ana), await listen(bia), await listen(caio)];
      await remove(ana, m.id, privado);
      for (const conn of [anaTab1, anaTab2, biaConn]) {
        await conn.waitFor(() => eventsOf(conn, 'mensagem_apagada').length === 1);
        expect(eventsOf(conn, 'mensagem_apagada')[0]!.dados).toEqual({ conversa_id: privado, mensagem_id: m.id });
      }
      await quiet();
      expect(eventsOf(caioConn, 'mensagem_apagada')).toEqual([]);
    });

    it('entra na reposição de quem voltou depois de uma queda, sem o texto', async () => {
      const m = await send(ana, 'antes');
      const first = await listen(bia);
      const start = first.ready[0]!.ultimo_evento!;
      first.close();
      await remove(ana, m.id);
      const back = await t.connect({ cookie: bia.sid, lastEvent: start });
      await back.waitFor(() => back.ready.length === 1);
      expect(eventsOf(back, 'mensagem_apagada').map((e) => e.dados)).toEqual([{ conversa_id: geral, mensagem_id: m.id }]);
      expect(JSON.stringify(back.events)).not.toContain('antes');
    });
  });

  describe('contadores', () => {
    it('desconta a não lida e a menção de quem ainda não leu, e as menções da mensagem somem', async () => {
      const m = await send(ana, 'oi @bia');
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 1 });
      expect(await counts(caio)).toEqual({ nao_lidas: 1, mencoes: 0 });
      await remove(ana, m.id);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      expect(await counts(caio)).toEqual({ nao_lidas: 0, mencoes: 0 });
      expect(await counts(ana)).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('as outras mensagens não lidas continuam contando', async () => {
      const first = await send(ana, 'primeira @bia');
      await send(ana, 'segunda @bia');
      expect(await counts(bia)).toEqual({ nao_lidas: 2, mencoes: 2 });
      await remove(ana, first.id);
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 1 });
    });

    it('contagem_atualizada sai só para quem mudou, com as contagens novas', async () => {
      const m = await send(ana, 'oi @bia');
      await as(t, caio.sid).post(`/v1/conversas/${geral}/leitura`, { mensagem_id: m.id });
      const [biaConn, caioConn, anaConn] = [await listen(bia), await listen(caio), await listen(ana)];
      await remove(ana, m.id);
      await biaConn.waitFor(() => eventsOf(biaConn, 'contagem_atualizada').length === 1);
      expect(eventsOf(biaConn, 'contagem_atualizada')[0]!.dados).toEqual({ conversa_id: geral, nao_lidas: 0, mencoes: 0 });
      await quiet();
      // Quem já tinha lido a mensagem não muda, e o autor nunca contou a própria.
      expect(eventsOf(caioConn, 'contagem_atualizada')).toEqual([]);
      expect(eventsOf(anaConn, 'contagem_atualizada')).toEqual([]);
    });

    it('quem já leu a mensagem mencionando-o não tem os contadores mexidos, e nada fica negativo', async () => {
      await send(ana, 'antes');
      const m = await send(ana, 'oi @bia');
      await read(bia, m.id);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      await remove(ana, m.id);
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('a leitura seguinte não conta a mensagem apagada', async () => {
      const first = await send(ana, 'primeira');
      const m = await send(ana, 'do meio @bia');
      await send(ana, 'última');
      await remove(ana, m.id);
      expect(await read(bia, first.id).then((r) => r.body)).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('leitura e exclusão ao mesmo tempo nunca deixam contador negativo nem contam a apagada', async () => {
      for (let round = 0; round < 5; round++) {
        const first = await send(ana, `primeira ${round}`);
        const m = await send(ana, `do meio @bia ${round}`);
        await send(ana, `última ${round}`);
        await Promise.all([remove(ana, m.id), read(bia, first.id)]);
        // O que sobra depois da posição lida é só a última mensagem, sem menção.
        const final = await counts(bia);
        expect(final.nao_lidas).toBeGreaterThanOrEqual(0);
        expect(final.mencoes).toBeGreaterThanOrEqual(0);
        await read(bia, (await history()).at(-1)!.id);
        expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
      }
    });
  });

  describe('citação', () => {
    it('quem citou a mensagem apagada passa a mostrar "apagada", sem trecho', async () => {
      const original = await send(ana, 'segredo');
      await send(bia, 'resposta', geral, original.id);
      await remove(ana, original.id);
      const page = await history();
      expect(page.at(-1)!.citacao).toMatchObject({ apagada: true, trecho: '' });
      expect(JSON.stringify(page)).not.toContain('segredo');
    });
  });
});
