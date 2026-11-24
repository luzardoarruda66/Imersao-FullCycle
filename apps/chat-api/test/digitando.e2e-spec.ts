import { as, signUp } from './support/http.js';
import { createTestApp, type ClientConnection, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('"Digitando" (e2e Socket.IO)', () => {
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

  const listen = async (person: Person, lastEvent?: string) => {
    const conn = await t.connect({ cookie: person.sid, lastEvent });
    await conn.waitFor(() => conn.ready.length === 1);
    return conn;
  };
  const typing = (conn: ClientConnection) => conn.events.filter((e) => e.tipo === 'digitando');
  const quiet = () => new Promise((resolve) => setTimeout(resolve, 250));
  const channel = async (person: Person, nome: string, tipo: 'publico' | 'privado') =>
    (await as(t, person.sid).post('/v1/conversas/canais', { nome, tipo })).body.id as string;

  it('chega aos outros participantes, com a conversa e o @usuário, e não a quem digita nem às outras abas dele', async () => {
    const id = await channel(ana, 'geral', 'publico');
    const [anaTab1, anaTab2, biaConn] = [await listen(ana), await listen(ana), await listen(bia)];
    anaTab1.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 1);
    expect(typing(biaConn)[0]!.dados).toEqual({ conversa_id: id, pessoa: { id: ana.id, usuario: 'ana' } });
    await quiet();
    expect(typing(anaTab1)).toEqual([]);
    expect(typing(anaTab2)).toEqual([]);
  });

  it('funciona na conversa direta e não chega a quem não participa', async () => {
    const id = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
    const [anaConn, biaConn, caioConn] = [await listen(ana), await listen(bia), await listen(caio)];
    anaConn.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 1);
    await quiet();
    expect(typing(caioConn)).toEqual([]);
  });

  it('quem não participa do canal privado é ignorado, sem derrubar a conexão e sem avisar os participantes', async () => {
    const id = await channel(ana, 'fechado', 'privado');
    await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
    const [biaConn, caioConn] = [await listen(bia), await listen(caio)];
    caioConn.socket.emit('digitando', { conversa_id: id });
    await quiet();
    expect(typing(biaConn)).toEqual([]);
    expect(caioConn.socket.connected).toBe(true);
  });

  it('ignora formato inválido e conversa que não existe, sem derrubar a conexão', async () => {
    const id = await channel(ana, 'geral', 'publico');
    const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
    for (const payload of [undefined, null, 'x', {}, { conversa_id: 1 }, { conversa_id: 'nao-e-uuid' }, { conversa_id: '0192f4a0-0000-7000-8000-000000000001' }]) {
      anaConn.socket.emit('digitando', payload);
    }
    await quiet();
    expect(typing(biaConn)).toEqual([]);
    expect(anaConn.socket.connected).toBe(true);
    anaConn.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 1);
  });

  it('o repetido da mesma pessoa e conversa em menos de 1 s é ignorado', async () => {
    const id = await channel(ana, 'geral', 'publico');
    const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
    anaConn.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 1);
    t.clock.advance(999);
    anaConn.socket.emit('digitando', { conversa_id: id });
    await quiet();
    expect(typing(biaConn)).toHaveLength(1);
    t.clock.advance(1);
    anaConn.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 2);
  });

  it('o intervalo é por conversa: outra conversa não é ignorada', async () => {
    const [a, b] = [await channel(ana, 'geral', 'publico'), await channel(ana, 'outro', 'publico')];
    const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
    anaConn.socket.emit('digitando', { conversa_id: a });
    anaConn.socket.emit('digitando', { conversa_id: b });
    await biaConn.waitFor(() => typing(biaConn).length === 2);
  });

  describe('limite de 15 membros', () => {
    const fill = async (total: number) => {
      for (let i = 4; i <= total; i++) await t.createPerson({ email: `p${i}@empresa.com`, name: `Pessoa ${i}` });
    };

    it('com 15 membros no canal público é repassado', async () => {
      await fill(15);
      const id = await channel(ana, 'geral', 'publico');
      const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
      anaConn.socket.emit('digitando', { conversa_id: id });
      await biaConn.waitFor(() => typing(biaConn).length === 1);
    });

    it('com 16 membros no canal público não é repassado', async () => {
      await fill(16);
      const id = await channel(ana, 'geral', 'publico');
      const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
      anaConn.socket.emit('digitando', { conversa_id: id });
      await quiet();
      expect(typing(biaConn)).toEqual([]);
    });
  });

  it('não entra na reposição depois de uma reconexão', async () => {
    const id = await channel(ana, 'geral', 'publico');
    const first = await listen(bia);
    const cursor = first.ready[0]!.ultimo_evento!;
    first.close();
    const anaConn = await listen(ana);
    anaConn.socket.emit('digitando', { conversa_id: id });
    await quiet();
    await as(t, ana.sid).post(`/v1/conversas/${id}/mensagens`, { texto: 'oi' });
    const back = await listen(bia, cursor);
    await back.waitFor(() => back.events.some((e) => e.tipo === 'mensagem_criada'));
    expect(typing(back)).toEqual([]);
  });

  it('o digitando não move o ponto de reposição da aba', async () => {
    const id = await channel(ana, 'geral', 'publico');
    const [anaConn, biaConn] = [await listen(ana), await listen(bia)];
    anaConn.socket.emit('digitando', { conversa_id: id });
    await biaConn.waitFor(() => typing(biaConn).length === 1);
    expect(typing(biaConn)[0]!.id).toMatch(/^ao_vivo-/);
  });
});
