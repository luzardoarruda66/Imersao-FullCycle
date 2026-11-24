import { v7 as uuidv7 } from 'uuid';
import { ConversationEntity, type ConversationType } from '../src/database/entities/conversation.entity.js';
import { createTestApp, type TestApp } from './support/test-app.js';

describe('Unicidade das conversas no banco (e2e)', () => {
  let t: TestApp;

  const insert = (type: ConversationType, fields: { name?: string; directKey?: string }) =>
    t.dataSource.getRepository(ConversationEntity).insert({
      id: uuidv7(),
      type,
      name: fields.name ?? null,
      directKey: fields.directKey ?? null,
    });

  const sqlStateOf = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: { driverError?: { code?: string }; code?: string }) => error.driverError?.code ?? error.code,
    );

  beforeEach(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.close());

  it('dois canais não têm o mesmo nome, sem diferenciar maiúsculas, nem entre público e privado', async () => {
    await insert('canal_publico', { name: 'Geral' });
    expect(await sqlStateOf(insert('canal_publico', { name: 'geral' }))).toBe('23505');
    expect(await sqlStateOf(insert('canal_privado', { name: 'GERAL' }))).toBe('23505');
    expect(await sqlStateOf(insert('canal_publico', { name: 'Outro' }))).toBeUndefined();
  });

  it('um par de membros tem uma conversa direta só', async () => {
    await insert('direta', { directKey: 'a:b' });
    expect(await sqlStateOf(insert('direta', { directKey: 'a:b' }))).toBe('23505');
    expect(await sqlStateOf(insert('direta', { directKey: 'a:c' }))).toBeUndefined();
  });

  it('o formato da linha é imposto: canal sem nome e direta com nome são recusados', async () => {
    expect(await sqlStateOf(insert('canal_publico', {}))).toBe('23514');
    expect(await sqlStateOf(insert('direta', { name: 'x', directKey: 'a:b' }))).toBe('23514');
  });
});
