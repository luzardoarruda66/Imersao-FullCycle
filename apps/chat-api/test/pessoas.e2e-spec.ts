import { v7 as uuidv7 } from 'uuid';
import { PersonEntity } from '../src/database/entities/person.entity.js';
import { as, signUp } from './support/http.js';
import { createTestApp, type TestApp } from './support/test-app.js';

type Person = Awaited<ReturnType<typeof signUp>>;

describe('Pessoas e perfis (e2e HTTP)', () => {
  let t: TestApp;
  let ana: Person;
  let bia: Person;

  beforeEach(async () => {
    t = await createTestApp();
    ana = await signUp(t, 'ana@empresa.com', 'Ana', '10.0.0.1');
    bia = await signUp(t, 'bia@empresa.com', 'Bia', '10.0.0.2');
  });
  afterEach(() => t.close());

  describe('perfil: GET /v1/pessoas/:id', () => {
    const fill = (person: Person, data: { jobTitle?: string; phone?: string; statusText?: string }) =>
      t.dataSource.getRepository(PersonEntity).update({ id: person.id }, data);

    it('devolve nome, @usuário, cargo, telefone e status de outro membro', async () => {
      await fill(bia, { jobTitle: 'Product Designer', phone: '(11) 91234-5678', statusText: 'Em reunião até as 15h' });
      const res = await as(t, ana.sid).get(`/v1/pessoas/${bia.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: bia.id,
        nome: 'Bia',
        usuario: 'bia',
        cargo: 'Product Designer',
        telefone: '(11) 91234-5678',
        status: 'Em reunião até as 15h',
      });
    });

    it('devolve nulo nos campos que a pessoa não preencheu', async () => {
      const res = await as(t, ana.sid).get(`/v1/pessoas/${bia.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: bia.id, nome: 'Bia', usuario: 'bia', cargo: null, telefone: null, status: null });
    });

    it('devolve o Perfil do próprio membro igual ao dos outros', async () => {
      const res = await as(t, ana.sid).get(`/v1/pessoas/${ana.id}`);
      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['cargo', 'id', 'nome', 'status', 'telefone', 'usuario']);
      expect(res.body.id).toBe(ana.id);
    });

    it('nunca devolve e-mail, papel de administrador nem permissão de dados', async () => {
      await t.dataSource.getRepository(PersonEntity).update({ id: bia.id }, { isAdmin: true, hasDataPermission: true });
      const res = await as(t, ana.sid).get(`/v1/pessoas/${bia.id}`);
      expect(Object.keys(res.body).sort()).toEqual(['cargo', 'id', 'nome', 'status', 'telefone', 'usuario']);
      expect(JSON.stringify(res.body)).not.toContain('bia@empresa.com');
    });

    it('aceita o id em maiúsculas', async () => {
      const res = await as(t, ana.sid).get(`/v1/pessoas/${bia.id.toUpperCase()}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(bia.id);
    });

    it('responde igual para o id que não existe e para o que não é um UUID', async () => {
      const missing = await as(t, ana.sid).get(`/v1/pessoas/${uuidv7()}`);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('pessoa_inexistente');
      for (const id of ['abc', '123', 'bia', `${bia.id}x`]) {
        const res = await as(t, ana.sid).get(`/v1/pessoas/${id}`);
        expect(res.status, id).toBe(404);
        expect(res.body, id).toEqual(missing.body);
      }
    });
  });

  describe('acesso', () => {
    it('recusa as rotas de pessoas sem cookie, com cookie inválido e depois de encerrar as sessões', async () => {
      const ended = await signUp(t, 'dani@empresa.com', 'Dani', '10.0.0.4');
      await t.http().delete('/v1/sessoes/atual').set('Cookie', ended.sid).expect(204);
      for (const cookie of [undefined, 'sid=' + 'a'.repeat(43), ended.sid]) {
        for (const path of [`/v1/pessoas/${bia.id}`]) {
          const res = await as(t, cookie).get(path);
          expect(res.status, `${path} ${cookie}`).toBe(401);
          expect(res.body.error.code).toBe('sessao_invalida');
        }
      }
    });
  });
});
