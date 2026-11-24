import { v7 as uuidv7 } from 'uuid';
import { ConversationParticipantEntity } from '../src/database/entities/conversation-participant.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Conversas (e2e HTTP)', () => {
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

  const createChannel = (person: Person, nome: string, tipo: 'publico' | 'privado' = 'publico') =>
    as(t, person.sid).post('/v1/conversas/canais', { nome, tipo });
  const idOf = async (person: Person, nome: string, tipo: 'publico' | 'privado' = 'publico') =>
    (await createChannel(person, nome, tipo)).body.id as string;

  describe('criar canal', () => {
    it('cria canal público e privado, com o nome sem os espaços das pontas', async () => {
      const publico = await createChannel(ana, '  geral  ');
      expect(publico.status).toBe(201);
      expect(publico.body).toEqual({ id: expect.any(String), tipo: 'canal_publico', nome: 'geral' });
      const privado = await createChannel(ana, 'segredo', 'privado');
      expect(privado.status).toBe(201);
      expect(privado.body.tipo).toBe('canal_privado');
    });

    it('recusa nome em branco, com mais de 80 caracteres e tipo inválido ou ausente, no corpo único de erro', async () => {
      for (const body of [
        { nome: '', tipo: 'publico' },
        { nome: '   ', tipo: 'publico' },
        { nome: 'a'.repeat(81), tipo: 'publico' },
        { nome: 'geral', tipo: 'secreto' },
        { nome: 'geral' },
        {},
      ]) {
        const res = await as(t, ana.sid).post('/v1/conversas/canais', body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
      expect((await createChannel(ana, 'a'.repeat(80))).status).toBe(201);
    });

    it('recusa nome repetido sem diferenciar maiúsculas, com espaços nas pontas e entre público e privado', async () => {
      await createChannel(ana, 'Geral');
      for (const [nome, tipo] of [['geral', 'publico'], ['  GERAL ', 'publico'], ['gErAl', 'privado']] as const) {
        const res = await createChannel(bia, nome, tipo);
        expect(res.status, nome).toBe(409);
        expect(res.body.error.code).toBe('nome_canal_em_uso');
      }
    });

    it('grava o criador como participante do privado e nenhum participante do público', async () => {
      const publico = await idOf(ana, 'aberto');
      const privado = await idOf(ana, 'fechado', 'privado');
      const repo = t.dataSource.getRepository(ConversationParticipantEntity);
      expect(await repo.countBy({ conversationId: publico })).toBe(0);
      expect(await repo.find({ where: { conversationId: privado } })).toMatchObject([{ personId: ana.id }]);
    });
  });

  describe('lista de conversas', () => {
    it('separa por tipo, em ordem alfabética sem diferenciar maiúsculas, e mostra a direta pelo nome do outro', async () => {
      await createChannel(ana, 'zeta');
      await createChannel(bia, 'Alfa');
      await createChannel(ana, 'beta', 'privado');
      await createChannel(ana, 'Acervo', 'privado');
      const direta = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id });
      const res = await as(t, ana.sid).get('/v1/conversas');
      expect(res.status).toBe(200);
      expect(res.body.canais_publicos.map((c: { nome: string }) => c.nome)).toEqual(['Alfa', 'zeta']);
      expect(res.body.canais_privados.map((c: { nome: string }) => c.nome)).toEqual(['Acervo', 'beta']);
      expect(res.body.diretas).toEqual([{ id: direta.body.id, tipo: 'direta', nome: 'Bia' }]);
    });

    it('mostra o canal público de outro membro, mas não o privado nem a direta alheios', async () => {
      await createChannel(ana, 'aberto');
      await createChannel(ana, 'fechado', 'privado');
      await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id });
      const caioList = (await as(t, caio.sid).get('/v1/conversas')).body;
      expect(caioList.canais_publicos.map((c: { nome: string }) => c.nome)).toEqual(['aberto']);
      expect(caioList.canais_privados).toEqual([]);
      expect(caioList.diretas).toEqual([]);
      const biaList = (await as(t, bia.sid).get('/v1/conversas')).body;
      expect(biaList.diretas).toMatchObject([{ nome: 'Ana' }]);
      expect(biaList.canais_privados).toEqual([]);
    });
  });

  describe('abrir uma conversa', () => {
    it('devolve o canal público de outro membro', async () => {
      const id = await idOf(ana, 'aberto');
      const res = await as(t, caio.sid).get(`/v1/conversas/${id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id, tipo: 'canal_publico', nome: 'aberto' });
    });

    it('responde ao canal privado alheio e à direta alheia igual a um id que nunca existiu', async () => {
      const privado = await idOf(ana, 'fechado', 'privado');
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      const inexistente = await as(t, caio.sid).get(`/v1/conversas/${uuidv7()}`);
      expect(inexistente.status).toBe(404);
      expect(inexistente.body.error.code).toBe('conversa_inexistente');
      for (const id of [privado, direta]) {
        const res = await as(t, caio.sid).get(`/v1/conversas/${id}`);
        expect(res.status).toBe(inexistente.status);
        expect(res.body).toEqual(inexistente.body);
      }
      expect((await as(t, caio.sid).get('/v1/conversas/nao-e-uuid')).body).toEqual(inexistente.body);
    });

    it('traz os participantes do canal privado e o nome do outro na conversa direta', async () => {
      const privado = await idOf(ana, 'fechado', 'privado');
      const res = await as(t, ana.sid).get(`/v1/conversas/${privado}`);
      expect(res.body).toEqual({
        id: privado,
        tipo: 'canal_privado',
        nome: 'fechado',
        participantes: [{ id: ana.id, nome: 'Ana' }],
      });
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      expect((await as(t, bia.sid).get(`/v1/conversas/${direta}`)).body).toEqual({ id: direta, tipo: 'direta', nome: 'Ana' });
    });
  });

  describe('conversa direta', () => {
    it('abrir duas vezes devolve a mesma conversa, de qualquer lado', async () => {
      const first = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id });
      expect(first.status).toBe(200);
      expect(first.body).toEqual({ id: expect.any(String), tipo: 'direta', nome: 'Bia' });
      const again = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id });
      const other = await as(t, bia.sid).post('/v1/conversas/diretas', { membro_id: ana.id });
      expect(again.body.id).toBe(first.body.id);
      expect(other.body.id).toBe(first.body.id);
    });

    it('abrir ao mesmo tempo, uma requisição de cada lado, termina em uma conversa só', async () => {
      const [a, b] = await Promise.all([
        as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id }),
        as(t, bia.sid).post('/v1/conversas/diretas', { membro_id: ana.id }),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(a.body.id).toBe(b.body.id);
      const rows = await t.dataSource.query(`SELECT count(*)::int AS n FROM conversations WHERE type = 'direta'`);
      expect(rows[0].n).toBe(1);
    });

    it('recusa abrir uma conversa direta consigo mesmo, com membro inexistente e com dados malformados', async () => {
      const self = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: ana.id });
      expect(self.status).toBe(422);
      expect(self.body.error.code).toBe('conversa_direta_consigo_mesmo');
      const missing = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: uuidv7() });
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('nao_encontrado');
      for (const body of [{}, { membro_id: 'x' }]) {
        const res = await as(t, ana.sid).post('/v1/conversas/diretas', body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
    });
  });

  describe('ids em maiúsculas', () => {
    it('a conversa direta consigo mesmo é recusada, e a do par não duplica, mesmo com o id em maiúsculas', async () => {
      const self = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: ana.id.toUpperCase() });
      expect(self.status).toBe(422);
      expect(self.body.error.code).toBe('conversa_direta_consigo_mesmo');
      const lower = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id });
      const upper = await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id.toUpperCase() });
      expect(upper.status).toBe(200);
      expect(upper.body.id).toBe(lower.body.id);
      const rows = await t.dataSource.query(`SELECT count(*)::int AS n FROM conversations WHERE type = 'direta'`);
      expect(rows[0].n).toBe(1);
    });

    it('o convite com o id em maiúsculas não duplica quem já participa', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      const res = await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id.toUpperCase(), ana.id.toUpperCase()] });
      expect(res.status).toBe(200);
      expect(res.body.participantes).toHaveLength(2);
    });
  });

  describe('membros', () => {
    it('lista só id e nome, em ordem alfabética', async () => {
      const res = await as(t, ana.sid).get('/v1/membros');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        membros: [
          { id: ana.id, nome: 'Ana' },
          { id: bia.id, nome: 'Bia' },
          { id: caio.id, nome: 'Caio' },
        ],
      });
    });
  });

  describe('convidar para canal privado', () => {
    it('convida quem está no canal, e o convidado passa a ver o canal', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      const res = await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      expect(res.status).toBe(200);
      expect(res.body.participantes).toEqual([{ id: ana.id, nome: 'Ana' }, { id: bia.id, nome: 'Bia' }]);
      expect((await as(t, bia.sid).get('/v1/conversas')).body.canais_privados).toMatchObject([{ id, nome: 'fechado' }]);
      expect((await as(t, bia.sid).get(`/v1/conversas/${id}`)).status).toBe(200);
      expect((await as(t, caio.sid).get('/v1/conversas')).body.canais_privados).toEqual([]);
    });

    it('um participante convidado também pode convidar', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      const res = await as(t, bia.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [caio.id] });
      expect(res.status).toBe(200);
      expect(res.body.participantes).toHaveLength(3);
    });

    it('convidar quem já participa não duplica nem dá erro', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] });
      const again = await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [bia.id, ana.id] });
      expect(again.status).toBe(200);
      expect(again.body.participantes).toHaveLength(2);
      expect(await t.dataSource.getRepository(ConversationParticipantEntity).countBy({ conversationId: id })).toBe(2);
    });

    it('recusa o convite de quem está fora do canal, igual a conversa inexistente', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      const res = await as(t, caio.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [caio.id] });
      const inexistente = await as(t, caio.sid).post(`/v1/conversas/${uuidv7()}/participantes`, { membros_ids: [caio.id] });
      expect(res.status).toBe(404);
      expect(res.body).toEqual(inexistente.body);
      expect((await as(t, caio.sid).get('/v1/conversas')).body.canais_privados).toEqual([]);
    });

    it('recusa convite em canal público e em conversa direta', async () => {
      const publico = await idOf(ana, 'aberto');
      const direta = (await as(t, ana.sid).post('/v1/conversas/diretas', { membro_id: bia.id })).body.id;
      for (const id of [publico, direta]) {
        const res = await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, { membros_ids: [caio.id] });
        expect(res.status, id).toBe(422);
        expect(res.body.error.code).toBe('conversa_nao_aceita_convite');
      }
    });

    it('recusa dados malformados e membro inexistente', async () => {
      const id = await idOf(ana, 'fechado', 'privado');
      for (const body of [{}, { membros_ids: [] }, { membros_ids: ['x'] }, { membros_ids: [uuidv7()] }]) {
        const res = await as(t, ana.sid).post(`/v1/conversas/${id}/participantes`, body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(res.body.error.code).toBe('dados_invalidos');
      }
    });
  });

  describe('acesso', () => {
    it('recusa toda rota sem cookie, com cookie inválido e depois de encerrar as sessões', async () => {
      const id = await idOf(ana, 'aberto');
      const ended = await signUp(t, 'dani@empresa.com', 'Dani', '10.0.0.4');
      await t.http().delete('/v1/sessoes/atual').set('Cookie', ended.sid).expect(204);
      const calls: [string, string, object?][] = [
        ['get', '/v1/conversas'],
        ['post', '/v1/conversas/canais', { nome: 'x', tipo: 'publico' }],
        ['post', '/v1/conversas/diretas', { membro_id: bia.id }],
        ['get', `/v1/conversas/${id}`],
        ['post', `/v1/conversas/${id}/participantes`, { membros_ids: [bia.id] }],
        ['get', `/v1/conversas/${id}/mensagens`],
        ['post', `/v1/conversas/${id}/mensagens`, { texto: 'oi' }],
        ['get', '/v1/membros'],
      ];
      for (const cookie of [undefined, 'sid=' + 'a'.repeat(43), ended.sid]) {
        for (const [method, path, body] of calls) {
          const api = as(t, cookie);
          const res = method === 'get' ? await api.get(path) : await api.post(path, body);
          expect(res.status, `${method} ${path} ${cookie}`).toBe(401);
          expect(res.body.error.code).toBe('sessao_invalida');
        }
      }
    });

    it('responde JSON malformado no corpo único de erro', async () => {
      const res = await t.http().post('/v1/conversas/canais').set('Cookie', ana.sid).set('Content-Type', 'application/json').send('{ruim');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('dados_invalidos');
    });
  });
});
