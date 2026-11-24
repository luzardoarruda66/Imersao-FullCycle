import { chatMessageSchema } from 'chat-events';
import { v7 as uuidv7 } from 'uuid';
import { MessageEntity } from '../src/database/entities/message.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Citação (e2e)', () => {
  let t: TestApp;
  let ana: Person;
  let bia: Person;
  let geral: string;

  beforeEach(async () => {
    t = await createTestApp();
    ana = await signUp(t, 'ana@empresa.com', 'Ana', '10.0.0.1');
    bia = await signUp(t, 'bia@empresa.com', 'Bia', '10.0.0.2');
    geral = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'geral', tipo: 'publico' })).body.id;
  });
  afterEach(() => t.close());

  const send = (person: Person, conversa: string, texto: string, citacao_id?: unknown) =>
    as(t, person.sid).post(`/v1/conversas/${conversa}/mensagens`, citacao_id === undefined ? { texto } : { texto, citacao_id });
  const first = async (texto = 'Alguém viu o aviso de acessibilidade?') => (await send(ana, geral, texto)).body as { id: string };
  const history = async (conversa = geral) => (await as(t, bia.sid).get(`/v1/conversas/${conversa}/mensagens`)).body.mensagens as {
    id: string;
    citacao: unknown;
  }[];
  const listen = async (person: Person) => {
    const conn = await t.connect({ cookie: person.sid });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const eventsOf = (conn: ClientConnection, tipo: string) => conn.events.filter((e) => e.tipo === tipo);

  it('a mensagem sem citação traz citacao nula', async () => {
    expect((await send(ana, geral, 'oi')).body.citacao).toBeNull();
  });

  it('a mensagem citada vai na resposta, no histórico e no evento, com autor e trecho', async () => {
    const original = await first();
    const biaConn = await listen(bia);
    const res = await send(bia, geral, 'Vi sim, já abri uma correção.', original.id);
    expect(res.status).toBe(201);
    const quote = { id: original.id, autor: { id: ana.id, nome: 'Ana', usuario: 'ana' }, trecho: 'Alguém viu o aviso de acessibilidade?', apagada: false };
    expect(res.body.citacao).toEqual(quote);
    expect(chatMessageSchema.parse(res.body)).toEqual(res.body);
    expect((await history()).at(-1)!.citacao).toEqual(quote);
    await biaConn.waitFor(() => eventsOf(biaConn, 'mensagem_criada').length === 1);
    expect(eventsOf(biaConn, 'mensagem_criada')[0]!.dados).toMatchObject({ mensagem: { citacao: quote } });
  });

  it('corta o trecho em 140 caracteres com reticências, e deixa inteiro o de 140', async () => {
    const long = await first('a'.repeat(200));
    const exact = await first('b'.repeat(140));
    expect((await send(bia, geral, 'r1', long.id)).body.citacao.trecho).toBe(`${'a'.repeat(140)}…`);
    expect((await send(bia, geral, 'r2', exact.id)).body.citacao.trecho).toBe('b'.repeat(140));
  });

  it('conta o corte por caracteres, sem partir um emoji ao meio', async () => {
    const original = await first('😀'.repeat(150));
    expect((await send(bia, geral, 'r', original.id)).body.citacao.trecho).toBe(`${'😀'.repeat(140)}…`);
  });

  it('a citação mostra o texto atual da mensagem editada', async () => {
    const original = await first('texto antigo');
    await send(bia, geral, 'r', original.id);
    await t.dataSource.getRepository(MessageEntity).update(original.id, { text: 'texto novo', editedAt: new Date() });
    expect(((await history()).at(-1)!.citacao as { trecho: string }).trecho).toBe('texto novo');
  });

  it('a citação de uma mensagem apagada vem apagada e sem texto', async () => {
    const original = await first('segredo');
    await send(bia, geral, 'r', original.id);
    await t.dataSource.getRepository(MessageEntity).update(original.id, { text: '', deletedAt: new Date() });
    expect((await history()).at(-1)!.citacao).toEqual({
      id: original.id,
      autor: { id: ana.id, nome: 'Ana', usuario: 'ana' },
      trecho: '',
      apagada: true,
    });
  });

  it('recusa citar mensagem apagada, de outra conversa, inexistente ou com id que não é UUID', async () => {
    const original = await first();
    const outra = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'outra', tipo: 'publico' })).body.id as string;
    const deleted = await first('vai sumir');
    await t.dataSource.getRepository(MessageEntity).update(deleted.id, { text: '', deletedAt: new Date() });
    for (const [conversa, id] of [
      [outra, original.id],
      [geral, deleted.id],
      [geral, uuidv7()],
      [geral, 'não-é-uuid'],
      [geral, 42],
    ] as const) {
      const res = await send(bia, conversa, 'r', id);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('dados_invalidos');
    }
    // Nada foi gravado pelas tentativas recusadas.
    expect((await history()).filter((m) => m.citacao !== null)).toEqual([]);
  });

  it('não deixa citar uma mensagem de canal privado a quem não participa dele', async () => {
    const privado = (await as(t, ana.sid).post('/v1/conversas/canais', { nome: 'fechado', tipo: 'privado' })).body.id as string;
    const secreta = (await send(ana, privado, 'só nós')).body.id as string;
    expect((await send(bia, privado, 'r', secreta)).status).toBe(404);
    expect((await send(bia, geral, 'r', secreta)).status).toBe(400);
  });

  it('o autor pode citar a própria mensagem, e citar não cria menção nem contador extra', async () => {
    const original = await first();
    const res = await send(ana, geral, 'complemento', original.id);
    expect(res.status).toBe(201);
    expect(res.body.citacao.autor.id).toBe(ana.id);
    expect(res.body.mencoes).toEqual([]);
  });
});
