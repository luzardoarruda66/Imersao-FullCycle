import { v7 as uuidv7 } from 'uuid';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Mensagens (e2e HTTP)', () => {
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

  const send = (person: Person, conversa: string, texto: unknown) =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, { texto });
  const read = (person: Person, conversa: string) => as(t, person.sid).get(`/v1/conversas/${conversa}/mensagens`);

  /** Grava `count` mensagens antigas direto no banco, uma por minuto, da mais antiga para a mais nova. */
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

  it('envia uma mensagem e a devolve com autor e horário', async () => {
    const res = await send(ana, canal, 'Bom dia, time');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      conversa_id: canal,
      autor: { id: ana.id, nome: 'Ana', usuario: 'ana' },
      texto: 'Bom dia, time',
      criada_em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
      mencoes: [],
      citacao: null,
      editada_em: null,
      apagada: false,
    });
    const list = await read(bia, canal);
    expect(list.body.mensagens).toEqual([res.body]);
  });

  it('recusa mensagem vazia ou só de espaços e texto que não é string', async () => {
    for (const texto of ['', '   ', '\n\t ', 42, null, undefined]) {
      const res = await send(ana, canal, texto);
      expect(res.status, String(texto)).toBe(400);
      expect(res.body.error.code).toBe('dados_invalidos');
    }
    expect((await read(ana, canal)).body.mensagens).toEqual([]);
  });

  it('aceita 4.000 caracteres e recusa 4.001', async () => {
    expect((await send(ana, canal, 'a'.repeat(4000))).status).toBe(201);
    const res = await send(ana, canal, 'a'.repeat(4001));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('dados_invalidos');
  });

  it('conta os 4.000 caracteres depois de aparar os espaços das pontas', async () => {
    expect((await send(ana, canal, `  ${'a'.repeat(4000)}  `)).status).toBe(201);
  });

  it('devolve as 50 mais recentes em ordem cronológica quando a conversa tem mais de 50', async () => {
    await seed(canal, ana.id, 55);
    const res = await read(bia, canal);
    expect(res.status).toBe(200);
    const texts = res.body.mensagens.map((m: { texto: string }) => m.texto);
    expect(texts).toHaveLength(50);
    expect(texts[0]).toBe('mensagem 6');
    expect(texts[49]).toBe('mensagem 55');
    await send(bia, canal, 'a mais nova');
    const after = (await read(bia, canal)).body.mensagens.map((m: { texto: string }) => m.texto);
    expect(after).toHaveLength(50);
    expect(after[0]).toBe('mensagem 7');
    expect(after[49]).toBe('a mais nova');
  });

  it('o convidado de um canal privado lê todo o histórico, inclusive o anterior ao convite', async () => {
    const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id;
    await send(ana, privado, 'antes do convite');
    await as(t, ana.sid).post(`/v1/conversas/${privado}/participantes`, { membros_ids: [bia.id] });
    await send(bia, privado, 'depois do convite');
    const res = await read(bia, privado);
    expect(res.body.mensagens.map((m: { texto: string }) => m.texto)).toEqual(['antes do convite', 'depois do convite']);
  });

  it('responde a quem está fora igual a conversa inexistente, na leitura e no envio', async () => {
    const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id;
    const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
    await send(ana, privado, 'segredo');
    const inexistente = await read(caio, uuidv7());
    expect(inexistente.status).toBe(404);
    for (const id of [privado, direta]) {
      const reading = await read(caio, id);
      const sending = await send(caio, id, 'intruso');
      expect(reading.status).toBe(404);
      expect(reading.body).toEqual(inexistente.body);
      expect(sending.status).toBe(404);
      expect(sending.body).toEqual(inexistente.body);
    }
    expect(await t.dataSource.getRepository(MessageEntity).countBy({ text: 'intruso' })).toBe(0);
  });

  it('não grava o texto nem o devolve com espaços nas pontas', async () => {
    const res = await send(ana, canal, '  oi  ');
    expect(res.body.texto).toBe('oi');
  });
});
