import { v7 as uuidv7 } from 'uuid';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Leitura e histórico paginado (e2e)', () => {
  let t: TestApp;
  let ana: Person;
  let bia: Person;
  let caio: Person;
  let canal: string;

  beforeEach(async () => {
    t = await createTestApp();
    ana = await signUp(t, 'ana@empresa.com', 'Ana', '10.0.0.1');
    bia = await signUp(t, 'bia@empresa.com', 'Bia', '10.0.0.2');
    caio = await signUp(t, 'caio@empresa.com', 'Caio', '10.0.0.3');
    canal = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'geral', tipo: 'publico' })).body.id;
  });
  afterEach(() => t.close());

  const send = (person: Person, conversa: string, texto = 'oi') =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, { texto });
  const read = (person: Person, conversa: string, mensagem_id: unknown) =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/leitura`, { mensagem_id });
  const page = (person: Person, conversa: string, antes?: string) =>
    as(t, person.sid).get(`/v1/conversas/${conversa}/mensagens${antes ? `?antes=${antes}` : ''}`);
  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);
  const quiet = () => new Promise((resolve) => setTimeout(resolve, 250));
  const counts = async (person: Person, id = canal) => {
    const body = (await as(t, person.sid).get('/v1/conversas')).body;
    const found = [...body.canais_publicos, ...body.canais_privados, ...body.diretas].find((c: { id: string }) => c.id === id);
    return { nao_lidas: found.nao_lidas, mencoes: found.mencoes };
  };

  describe('leitura', () => {
    it('até a última mensagem zera as duas contagens e devolve as contagens', async () => {
      await send(ana, canal);
      const last = (await send(ana, canal)).body.id;
      const res = await read(bia, canal, last);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ nao_lidas: 0, mencoes: 0 });
      expect(await counts(bia)).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('publica contagem_atualizada só para quem leu, nas duas abas dele', async () => {
      const first = (await send(ana, canal)).body.id;
      const [bia1, bia2, anaConn] = [await listen(bia), await listen(bia), await listen(ana)];
      await read(bia, canal, first);
      for (const conn of [bia1, bia2]) {
        await conn.waitFor(() => eventsOf(conn, 'contagem_atualizada').length === 1);
        expect(eventsOf(conn, 'contagem_atualizada')[0]!.dados).toEqual({ conversa_id: canal, nao_lidas: 0, mencoes: 0 });
      }
      await quiet();
      expect(eventsOf(anaConn, 'contagem_atualizada')).toEqual([]);
    });

    it('até uma mensagem do meio deixa as mensagens de outras pessoas depois dela', async () => {
      const first = (await send(ana, canal)).body.id;
      await send(ana, canal);
      await send(caio, canal);
      await send(bia, canal);
      const res = await read(bia, canal, first);
      expect(res.body).toEqual({ nao_lidas: 2, mencoes: 0 });
      expect(await counts(bia)).toEqual({ nao_lidas: 2, mencoes: 0 });
    });

    it('posição igual ou anterior à gravada não muda nada e não publica evento', async () => {
      const first = (await send(ana, canal)).body.id;
      const second = (await send(ana, canal)).body.id;
      await read(bia, canal, second);
      await send(ana, canal);
      const conn = await listen(bia);
      for (const stale of [second, first]) {
        const res = await read(bia, canal, stale);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nao_lidas: 1, mencoes: 0 });
      }
      await quiet();
      expect(eventsOf(conn, 'contagem_atualizada')).toEqual([]);
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('uma leitura atrasada não apaga mensagem nova', async () => {
      const first = (await send(ana, canal)).body.id;
      const second = (await send(ana, canal)).body.id;
      await read(bia, canal, second);
      await send(ana, canal);
      await read(bia, canal, first);
      expect(await counts(bia)).toEqual({ nao_lidas: 1, mencoes: 0 });
    });

    it('a mensagem gravada durante a leitura é contada', async () => {
      const first = (await send(ana, canal)).body.id;
      await Promise.all([read(bia, canal, first), send(caio, canal), send(ana, canal)]);
      expect(await counts(bia)).toEqual({ nao_lidas: 2, mencoes: 0 });
    });

    it('as mensagens do próprio leitor depois da posição não contam', async () => {
      const first = (await send(ana, canal)).body.id;
      await send(bia, canal);
      expect((await read(bia, canal, first)).body).toEqual({ nao_lidas: 0, mencoes: 0 });
    });

    it('recusa conversa alheia como inexistente e mensagem de outra conversa como dados inválidos', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id;
      const inPrivate = (await send(ana, privado)).body.id;
      const inPublic = (await send(ana, canal)).body.id;
      const outsider = await read(bia, privado, inPrivate);
      expect(outsider.status).toBe(404);
      expect(outsider.body.error.code).toBe('conversa_inexistente');
      const wrong = await read(bia, canal, inPrivate);
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.code).toBe('dados_invalidos');
      expect((await read(bia, canal, inPublic)).status).toBe(200);
    });

    it('recusa corpo malformado', async () => {
      for (const body of [undefined, 'x', 1, null, {}]) {
        const res = await read(bia, canal, body);
        expect(res.status, JSON.stringify(body) ?? 'undefined').toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
    });

    it('recusa sem sessão e com cookie inválido', async () => {
      const id = (await send(ana, canal)).body.id;
      expect((await read({ sid: undefined } as unknown as Person, canal, id)).status).toBe(401);
      expect((await read({ sid: 'sid=invalido' } as unknown as Person, canal, id)).body.error.code).toBe('sessao_invalida');
    });
  });

  describe('histórico paginado', () => {
    const seed = async (conversa: string, authorId: string, count: number) => {
      const base = Date.now() - count * 60_000;
      const rows = Array.from({ length: count }, (_, i) => ({
        id: uuidv7({ msecs: base + i * 60_000 }),
        conversationId: conversa,
        authorId,
        text: `mensagem ${i + 1}`,
        createdAt: new Date(base + i * 60_000),
      }));
      await t.dataSource.getRepository(MessageEntity).insert(rows);
    };
    const texts = (res: { body: { mensagens: { texto: string }[] } }) => res.body.mensagens.map((m) => m.texto);

    it('120 mensagens em três páginas (50, 50, 20) sem repetição nem falta', async () => {
      await seed(canal, ana.id, 120);
      const p1 = await page(bia, canal);
      expect(p1.body.mensagens).toHaveLength(50);
      expect(p1.body.tem_mais).toBe(true);
      expect(texts(p1)[0]).toBe('mensagem 71');
      expect(texts(p1)[49]).toBe('mensagem 120');
      const p2 = await page(bia, canal, p1.body.mensagens[0].id);
      expect(p2.body.mensagens).toHaveLength(50);
      expect(p2.body.tem_mais).toBe(true);
      expect(texts(p2)[0]).toBe('mensagem 21');
      expect(texts(p2)[49]).toBe('mensagem 70');
      const p3 = await page(bia, canal, p2.body.mensagens[0].id);
      expect(p3.body.mensagens).toHaveLength(20);
      expect(p3.body.tem_mais).toBe(false);
      expect(texts(p3)[0]).toBe('mensagem 1');
      expect(texts(p3)[19]).toBe('mensagem 20');
    });

    it('exatamente 50 mensagens: uma página e sem mais', async () => {
      await seed(canal, ana.id, 50);
      const res = await page(bia, canal);
      expect(res.body.mensagens).toHaveLength(50);
      expect(res.body.tem_mais).toBe(false);
    });

    it('conversa vazia devolve lista vazia e sem mais', async () => {
      const res = await page(bia, canal);
      expect(res.body).toEqual({ mensagens: [], tem_mais: false });
    });

    it('uma mensagem nova entre duas páginas não desloca a seguinte', async () => {
      await seed(canal, ana.id, 120);
      const p1 = await page(bia, canal);
      await send(caio, canal, 'chegou agora');
      const p2 = await page(bia, canal, p1.body.mensagens[0].id);
      expect(texts(p2)[0]).toBe('mensagem 21');
      expect(texts(p2)[49]).toBe('mensagem 70');
    });

    it('âncora que não é UUID ou que é de outra conversa recusa com dados inválidos', async () => {
      const outro = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'outro', tipo: 'publico' })).body.id;
      const foreign = (await send(ana, outro)).body.id;
      for (const antes of ['nao-e-uuid', foreign, uuidv7()]) {
        const res = await page(bia, canal, antes);
        expect(res.status, antes).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
    });

    it('conversa alheia responde como inexistente', async () => {
      const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id;
      const first = (await send(ana, privado)).body.id;
      const res = await page(bia, privado, first);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('conversa_inexistente');
    });
  });
});
