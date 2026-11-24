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

  describe('busca: GET /v1/pessoas', () => {
    const add = (name: string, username: string) =>
      t.createPerson({ email: `${username.replace(/[^a-z0-9]/g, '')}@empresa.com`, name, username });
    const search = async (term?: string, person: Person = ana) => {
      const res = await as(t, person.sid).get(term === undefined ? '/v1/pessoas' : `/v1/pessoas?busca=${encodeURIComponent(term)}`);
      expect(res.status, `busca=${term}`).toBe(200);
      return res.body.pessoas as { id: string; nome: string; usuario: string }[];
    };
    const names = async (term?: string, person?: Person) => (await search(term, person)).map((p) => p.nome);

    beforeEach(async () => {
      await add('Alfredo Luiz', 'alfredo.luiz');
      await add('Leonan Luppi', 'leonan.luppi');
      await add('Luiz Carlos', 'luiz.carlos');
      await add('Maria Souza', 'maria');
      await add('João Silva', 'joao.silva');
      await add('Beatriz Lima', 'bia.lima');
    });

    it('casa com parte do nome, em ordem alfabética', async () => {
      expect(await names('lui')).toEqual(['Alfredo Luiz', 'Luiz Carlos']);
    });

    it('casa com parte do @usuário', async () => {
      expect(await names('bia.')).toEqual(['Beatriz Lima']);
      expect(await names('joao.s')).toEqual(['João Silva']);
    });

    it('devolve id, nome e @usuário, e mais nada', async () => {
      const [maria] = await search('maria');
      expect(maria).toEqual({ id: expect.any(String), nome: 'Maria Souza', usuario: 'maria' });
    });

    it('trata `@maria` e `maria` do mesmo jeito', async () => {
      expect(await names('@maria')).toEqual(['Maria Souza']);
      expect(await names('@maria')).toEqual(await names('maria'));
      expect(await names('  @MARIA  ')).toEqual(['Maria Souza']);
    });

    it('ignora maiúsculas, minúsculas e acentos, no termo e no nome', async () => {
      expect(await names('JOAO')).toEqual(['João Silva']);
      expect(await names('joão')).toEqual(['João Silva']);
      expect(await names('JOÃO SILVA')).toEqual(['João Silva']);
      expect(await names('beatriz')).toEqual(['Beatriz Lima']);
    });

    it('não devolve quem busca', async () => {
      await add('Mariana Reis', 'mariana');
      expect(await names('ana')).toEqual(['Mariana Reis']);
      expect(await names('ana', bia)).toEqual(['Ana', 'Mariana Reis']);
    });

    it('sem resultado, devolve a lista vazia com sucesso', async () => {
      expect(await search('zzzz')).toEqual([]);
    });

    it('com a busca vazia ou ausente, devolve os primeiros membros em ordem alfabética, sem quem busca', async () => {
      const expected = ['Alfredo Luiz', 'Beatriz Lima', 'Bia', 'João Silva', 'Leonan Luppi', 'Luiz Carlos', 'Maria Souza'];
      expect(await names('')).toEqual(expected);
      expect(await names()).toEqual(expected);
      expect(await names('   ')).toEqual(expected);
    });

    it('devolve no máximo 20 resultados, os primeiros pela ordem do nome', async () => {
      for (let i = 1; i <= 25; i++) await add(`Pessoa ${String(i).padStart(2, '0')}`, `pessoa${String(i).padStart(2, '0')}`);
      const found = await names('pessoa');
      expect(found).toHaveLength(20);
      expect(found[0]).toBe('Pessoa 01');
      expect(found[19]).toBe('Pessoa 20');
      expect(await names('')).toHaveLength(20);
    });

    it('trata %, _ e a barra como texto comum', async () => {
      await add('Cem%Porcento', 'cemporcento');
      await add('Sub_Traço', 'sub_traco');
      expect(await names('%')).toEqual(['Cem%Porcento']);
      expect(await names('_')).toEqual(['Sub_Traço']);
      expect(await names('50%')).toEqual([]);
      expect(await names('\\')).toEqual([]);
      expect(await names('a_b')).toEqual([]);
    });

    it('recusa o parâmetro repetido, no corpo único de erro', async () => {
      const res = await as(t, ana.sid).get('/v1/pessoas?busca=a&busca=b');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('dados_invalidos');
    });
  });

  describe('acesso', () => {
    it('recusa as rotas de pessoas sem cookie, com cookie inválido e depois de encerrar as sessões', async () => {
      const ended = await signUp(t, 'dani@empresa.com', 'Dani', '10.0.0.4');
      await t.http().delete('/v1/sessoes/atual').set('Cookie', ended.sid).expect(204);
      for (const cookie of [undefined, 'sid=' + 'a'.repeat(43), ended.sid]) {
        for (const path of [`/v1/pessoas/${bia.id}`, '/v1/pessoas', '/v1/pessoas?busca=ana']) {
          const res = await as(t, cookie).get(path);
          expect(res.status, `${path} ${cookie}`).toBe(401);
          expect(res.body.error.code).toBe('sessao_invalida');
        }
      }
    });
  });
});
