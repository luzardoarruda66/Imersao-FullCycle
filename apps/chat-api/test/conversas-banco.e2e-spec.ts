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

  describe('menções e colunas novas da mensagem (F1-05)', () => {
    const column = async (table: string, name: string) =>
      (
        await t.dataSource.query<{ is_nullable: string; data_type: string }[]>(
          `SELECT is_nullable, data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
          [table, name],
        )
      )[0];

    const seedMessage = async () => {
      const person = uuidv7();
      await t.dataSource.query(
        `INSERT INTO people (id, email, password_hash, name, username) VALUES ($1, $2, 'x', 'Ana', $3)`,
        [person, `${person}@e.com`, `u${person.slice(-8)}`],
      );
      const conversation = uuidv7();
      await t.dataSource.query(`INSERT INTO conversations (id, type, name) VALUES ($1, 'canal_publico', $2)`, [conversation, `c${conversation.slice(-6)}`]);
      const message = uuidv7();
      await t.dataSource.query(`INSERT INTO messages (id, conversation_id, author_id, text) VALUES ($1, $2, $3, 'oi')`, [message, conversation, person]);
      return { person, conversation, message };
    };

    it('a mensagem ganha edição, citação e exclusão, todas opcionais', async () => {
      for (const name of ['edited_at', 'deleted_at']) {
        expect(await column('messages', name)).toEqual({ is_nullable: 'YES', data_type: 'timestamp with time zone' });
      }
      expect(await column('messages', 'quoted_message_id')).toEqual({ is_nullable: 'YES', data_type: 'uuid' });
    });

    it('a menção é única na dupla (mensagem, pessoa) e some com a mensagem', async () => {
      const { person, message } = await seedMessage();
      const mention = () => t.dataSource.query(`INSERT INTO mentions (message_id, person_id) VALUES ($1, $2)`, [message, person]);
      await mention();
      expect(await sqlStateOf(mention())).toBe('23505');
      await t.dataSource.query(`DELETE FROM messages WHERE id = $1`, [message]);
      expect(await t.dataSource.query(`SELECT 1 FROM mentions WHERE message_id = $1`, [message])).toEqual([]);
    });

    it('a citação aponta para uma mensagem que existe', async () => {
      const { message } = await seedMessage();
      expect(await sqlStateOf(t.dataSource.query(`UPDATE messages SET quoted_message_id = $1 WHERE id = $2`, [uuidv7(), message]))).toBe('23503');
    });
  });
});
