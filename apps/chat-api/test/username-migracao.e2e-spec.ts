import { Username1790000000002 } from '../migrations/1790000000002-Username.js';
import { isValidUsername } from '../src/accounts/username-rule.js';
import { createTestApp, type TestApp } from './support/test-app.js';

describe('Migração do @usuário (e2e)', () => {
  let t: TestApp;
  const migration = new Username1790000000002();

  beforeEach(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.close());

  /** Insere uma conta no formato de antes da F1-03, sem @usuário. */
  const insertOld = (qr: { query: (sql: string, params?: unknown[]) => Promise<unknown> }, email: string, createdAt: string) =>
    qr.query(
      `INSERT INTO "people" ("id", "email", "name", "password_hash", "created_at") VALUES (gen_random_uuid(), $1, 'Nome', 'hash', $2)`,
      [email, createdAt],
    );

  it('dá a cada conta antiga um @usuário válido e único, sem apagar os dados', async () => {
    const qr = t.dataSource.createQueryRunner();
    try {
      await migration.down(qr);
      await insertOld(qr, 'ana@a.com', '2026-01-01T10:00:00Z');
      await insertOld(qr, 'ana@b.com', '2026-01-01T11:00:00Z');
      await insertOld(qr, 'jo@empresa.com', '2026-01-02T10:00:00Z');
      await insertOld(qr, 'joão.vendas@empresa.com', '2026-01-03T10:00:00Z');
      await insertOld(qr, `${'x'.repeat(40)}@empresa.com`, '2026-01-04T10:00:00Z');

      await migration.up(qr);

      const rows: { email: string; username: string; name: string; job_title: string | null; phone: string | null; status_text: string | null }[] =
        await qr.query(`SELECT "email", "username", "name", "job_title", "phone", "status_text" FROM "people" ORDER BY "created_at"`);
      expect(rows.map((r) => [r.email, r.username])).toEqual([
        ['ana@a.com', 'ana'],
        ['ana@b.com', 'ana-2'],
        ['jo@empresa.com', 'jo_'],
        ['joão.vendas@empresa.com', 'jo_o.vendas'],
        [`${'x'.repeat(40)}@empresa.com`, 'x'.repeat(30)],
      ]);
      expect(rows.every((r) => isValidUsername(r.username))).toBe(true);
      expect(rows.every((r) => r.name === 'Nome')).toBe(true);
      expect(rows.every((r) => r.job_title === null && r.phone === null && r.status_text === null)).toBe(true);
    } finally {
      await qr.release();
    }
  });

  it('depois da migração, o @usuário é obrigatório e único', async () => {
    await t.createPerson({ email: 'ana@empresa.com', name: 'Ana', username: 'ana' });
    const qr = t.dataSource.createQueryRunner();
    try {
      await expect(
        qr.query(`INSERT INTO "people" ("id", "email", "name", "password_hash") VALUES (gen_random_uuid(), 'x@y.com', 'X', 'hash')`),
      ).rejects.toThrow(/username/);
      await expect(
        qr.query(
          `INSERT INTO "people" ("id", "email", "name", "password_hash", "username") VALUES (gen_random_uuid(), 'x@y.com', 'X', 'hash', 'ana')`,
        ),
      ).rejects.toThrow(/UQ_people_username/);
    } finally {
      await qr.release();
    }
  });

  it('volta e avança de novo sem erro', async () => {
    const qr = t.dataSource.createQueryRunner();
    try {
      await migration.down(qr);
      await migration.up(qr);
      const columns: { column_name: string }[] = await qr.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'people' AND column_name IN ('username', 'job_title', 'phone', 'status_text')`,
      );
      expect(columns.map((c) => c.column_name).sort()).toEqual(['job_title', 'phone', 'status_text', 'username']);
    } finally {
      await qr.release();
    }
  });

  it('a extensão unaccent está instalada, para a busca de pessoas', async () => {
    const [row] = await t.dataSource.query(`SELECT unaccent('João') AS value`);
    expect(row.value).toBe('Joao');
  });
});
