import { v7 as uuidv7 } from 'uuid';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Não lidas e menções (e2e)', () => {
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
  const send = (person: Person, conversa: string, texto = 'oi') =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, { texto });
  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);
  /** As contagens que a lista de conversas mostra para a pessoa, por id de conversa. */
  const counts = async (person: Person) => {
    const body = (await as(t, person.sid).get('/v1/conversas')).body;
    const all = [...body.canais_publicos, ...body.canais_privados, ...body.diretas] as {
      id: string;
      nao_lidas: number;
      mencoes: number;
    }[];
    return Object.fromEntries(all.map((c) => [c.id, { nao_lidas: c.nao_lidas, mencoes: c.mencoes }]));
  };

  describe('contador na transação da mensagem', () => {
    it('soma 1 para cada mensagem de outra pessoa e não soma para o autor', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await send(bia, id);
      await send(bia, id);
      await send(ana, id);
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 2, mencoes: 0 });
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('no canal público soma para todos os membros menos o autor', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await send(ana, id);
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
      expect((await counts(caio))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('no canal privado e na conversa direta soma só para quem participa', async () => {
      const privado = await channel(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${privado}/participantes`, { membros_ids: [bia.id] });
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      await send(ana, privado);
      await send(ana, direta);
      expect(await counts(bia)).toMatchObject({ [privado]: { nao_lidas: 1 }, [direta]: { nao_lidas: 1 } });
      expect(await counts(caio)).toEqual({});
    });

    it('duas mensagens ao mesmo tempo de dois autores somam 2, sem perda', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await Promise.all([send(bia, id), send(caio, id)]);
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 2, mencoes: 0 });
    });

    it('rajadas de mensagens de vários autores não perdem nenhuma contagem', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await Promise.all([...Array(10)].flatMap(() => [send(bia, id), send(caio, id)]));
      expect((await counts(ana))[id]).toEqual({ nao_lidas: 20, mencoes: 0 });
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 10, mencoes: 0 });
    });

    it('mensagens anteriores à existência da conta não contam como não lidas', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await t.dataSource.getRepository(MessageEntity).insert({
        id: uuidv7(),
        conversationId: id,
        authorId: ana.id,
        text: 'antiga',
        createdAt: new Date(Date.now() - 86_400_000),
      });
      const dani = await signUp(t, 'dani@empresa.com', 'Dani', '10.0.0.4');
      expect((await counts(dani))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
      await send(ana, id);
      expect((await counts(dani))[id]).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('a conversa sem nenhuma mensagem de outra pessoa mostra zeros', async () => {
      const id = await channel(ana, 'geral', 'publico');
      expect((await counts(bia))[id]).toEqual({ nao_lidas: 0, mencoes: 0 });
    });
  });

  describe('acesso', () => {
    it('as rotas novas recusam sem cookie, com cookie inválido e depois de a sessão ser encerrada', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const message = (await send(ana, id)).body.id;
      const ended = { ...bia };
      await t.http().delete('/v1/sessoes/atual').set('Cookie', ended.sid).send();
      const routes = [
        (sid: string | undefined) => as(t, sid).get(`/v1/conversas/${id}/mensagens?antes=${message}`),
        (sid: string | undefined) => as(t, sid).post(`/v1/conversas/${id}/leitura`, { mensagem_id: message }),
        (sid: string | undefined) => as(t, sid).get('/v1/conversas'),
      ];
      for (const call of routes) {
        for (const sid of [undefined, 'sid=invalido', ended.sid]) {
          const res = await call(sid);
          expect(res.status).toBe(401);
          expect(res.body.error.code).toBe('sessao_invalida');
        }
      }
    });

    it('quem não participa não recebe a mensagem nem na reposição depois de reconexão', async () => {
      const id = await channel(ana, 'fechado', 'privado');
      const first = await listen(caio);
      const cursor = first.ready[0]!.ultimo_evento!;
      first.close();
      await send(ana, id);
      const back = await t.connect({ cookie: caio.sid, lastEvent: cursor });
      await back.waitFor(() => back.ready.length === 1);
      expect(eventsOf(back, 'mensagem_criada')).toEqual([]);
    });
  });

  describe('evento mensagem_criada', () => {
    it('leva as contagens de cada pessoa já com a soma, e as do autor não mudam', async () => {
      const id = await channel(ana, 'geral', 'publico');
      await send(bia, id);
      const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
      const res = await send(bia, id, 'segunda');
      await anaConn.waitFor(() => eventsOf(anaConn, 'mensagem_criada').length === 1);
      await biaConn.waitFor(() => eventsOf(biaConn, 'mensagem_criada').length === 1);
      expect(eventsOf(anaConn, 'mensagem_criada')[0]!.dados).toEqual({
        conversa_id: id,
        mensagem: res.body,
        contagens: { nao_lidas: 2, mencoes: 0 },
      });
      expect(eventsOf(biaConn, 'mensagem_criada')[0]!.dados.contagens).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('a mensagem traz o @usuário do autor', async () => {
      const id = await channel(ana, 'geral', 'publico');
      const res = await send(bia, id);
      expect(res.body.autor).toEqual({ id: bia.id, nome: 'Bia', usuario: 'bia' });
    });
  });
});
