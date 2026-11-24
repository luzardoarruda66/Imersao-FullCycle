import { v7 as uuidv7 } from 'uuid';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Conversas em tempo real (e2e Socket.IO)', () => {
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

  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const quiet = () => new Promise((resolve) => setTimeout(resolve, 250));
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);
  const channel = async (person: Person, nome: string, tipo: 'publico' | 'privado') =>
    (await as(t, person.sid).post('/v1/conversas/canais', { nome, tipo })).body.id as string;

  describe('mensagem criada', () => {
    it('no canal público alcança todos os membros, inclusive as outras abas de quem enviou', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const [anaTab1, anaTab2, biaTab, caioTab] = [await listen(ana), await listen(ana), await listen(bia), await listen(caio)];
      const res = await as(t, ana.sid).post(`/v1/conversas/${id}/mensagens`, { texto: 'Bom dia' });
      for (const conn of [anaTab1, anaTab2, biaTab, caioTab]) {
        await conn.waitFor(() => eventsOf(conn, 'mensagem_criada').length === 1);
        expect(eventsOf(conn, 'mensagem_criada')[0]!.dados).toMatchObject({ conversa_id: id, mensagem: res.body });
      }
    });

    it('no canal privado alcança só os participantes, e nunca quem está fora', async () => {
      const id = await channel(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      const [anaConn, biaConn, caioConn] = [await listen(ana), await listen(bia), await listen(caio)];
      await as(t, bia.sid).post(`/v1/conversas/${id}/mensagens`, { texto: 'só nós' });
      await anaConn.waitFor(() => eventsOf(anaConn, 'mensagem_criada').length === 1);
      await biaConn.waitFor(() => eventsOf(biaConn, 'mensagem_criada').length === 1);
      await quiet();
      expect(eventsOf(caioConn, 'mensagem_criada')).toEqual([]);
    });

    it('na conversa direta alcança os dois e mais ninguém', async () => {
      const id = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      const [anaConn, biaConn, caioConn] = [await listen(ana), await listen(bia), await listen(caio)];
      await as(t, ana.sid).post(`/v1/conversas/${id}/mensagens`, { texto: 'oi, Bia' });
      await anaConn.waitFor(() => eventsOf(anaConn, 'mensagem_criada').length === 1);
      await biaConn.waitFor(() => eventsOf(biaConn, 'mensagem_criada').length === 1);
      await quiet();
      expect(eventsOf(caioConn, 'mensagem_criada')).toEqual([]);
    });

    it('não publica quando o envio é recusado', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const biaConn = await listen(bia);
      await as(t, ana.sid).post(`/v1/conversas/${id}/mensagens`, { texto: '   ' });
      const privado = await channel(ana, 'fechado', 'privado');
      await as(t, caio.sid).post(`/v1/conversas/${privado}/mensagens`, { texto: 'intruso' });
      await quiet();
      expect(eventsOf(biaConn, 'mensagem_criada')).toEqual([]);
    });
  });

  describe('conversa visível', () => {
    it('um canal público novo aparece para todos os membros', async () => {
      const [biaConn, caioConn] = [await listen(bia), await listen(caio)];
      const id = await channel(ana, 'geral', 'publico');
      for (const conn of [biaConn, caioConn]) {
        await conn.waitFor(() => eventsOf(conn, 'conversa_visivel').length === 1);
        expect(eventsOf(conn, 'conversa_visivel')[0]!.dados).toEqual({ conversa_id: id });
      }
    });

    it('um canal privado novo aparece só para quem o criou', async () => {
      const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
      const id = await channel(ana, 'fechado', 'privado');
      await anaConn.waitFor(() => eventsOf(anaConn, 'conversa_visivel').length === 1);
      expect(eventsOf(anaConn, 'conversa_visivel')[0]!.dados).toEqual({ conversa_id: id });
      await quiet();
      expect(eventsOf(biaConn, 'conversa_visivel')).toEqual([]);
    });

    it('uma conversa direta nova aparece para os dois, e abrir de novo não publica outra vez', async () => {
      const [anaConn, biaConn, caioConn] = [await listen(ana), await listen(bia), await listen(caio)];
      const id = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      await anaConn.waitFor(() => eventsOf(anaConn, 'conversa_visivel').length === 1);
      await biaConn.waitFor(() => eventsOf(biaConn, 'conversa_visivel').length === 1);
      expect(eventsOf(biaConn, 'conversa_visivel')[0]!.dados).toEqual({ conversa_id: id });
      await as(t, bia.sid).post('/v1/conversas/diretas', { membro_id: ana.id });
      await quiet();
      expect(eventsOf(anaConn, 'conversa_visivel')).toHaveLength(1);
      expect(eventsOf(caioConn, 'conversa_visivel')).toEqual([]);
    });

    it('um convite aparece só para quem foi convidado de fato, e repetir o convite não publica', async () => {
      const id = await channel(ana, 'fechado', 'privado');
      const [biaConn, caioConn] = [await listen(bia), await listen(caio)];
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      await biaConn.waitFor(() => eventsOf(biaConn, 'conversa_visivel').length === 1);
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      await quiet();
      expect(eventsOf(biaConn, 'conversa_visivel')).toHaveLength(1);
      expect(eventsOf(caioConn, 'conversa_visivel')).toEqual([]);
    });

    it('um convite recusado não publica nada', async () => {
      const id = await channel(ana, 'fechado', 'privado');
      const biaConn = await listen(bia);
      await as(t, caio.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [uuidv7()] });
      await quiet();
      expect(eventsOf(biaConn, 'conversa_visivel')).toEqual([]);
    });
  });

  describe('reposição', () => {
    it('quem voltou depois de uma queda recebe a mensagem que perdeu, no mesmo formato do ao vivo', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const first = await listen(bia);
      const start = first.ready[0]!.ultimo_evento!;
      first.close();
      const res = await as(t, ana.sid).post(`/v1/conversas/${id}/mensagens`, { texto: 'enquanto você estava fora' });
      const back = await t.connect({ cookie: bia.sid, lastEvent: start });
      await back.waitFor(() => back.ready.length === 1);
      const messages = eventsOf(back, 'mensagem_criada');
      expect(messages).toHaveLength(1);
      expect(messages[0]!.dados).toEqual({ conversa_id: id, mensagem: res.body, contagens: { nao_lidas: 1, mencoes: 0 } });
    });
  });
});
