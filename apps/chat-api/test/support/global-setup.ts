import pg from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../../src/database/data-source.js';

const ADMIN_URL = 'postgres://postgres:postgres@postgres:5432/postgres';
const TEST_URL = 'postgres://chat_api:chat_api@postgres:5432/chat_test';

/** Cria o banco `chat_test` se faltar e aplica as migrações. */
export default async function setup() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const { rowCount } = await admin.query(`SELECT 1 FROM pg_database WHERE datname = 'chat_test'`);
  if (!rowCount) await admin.query(`CREATE DATABASE chat_test OWNER chat_api`);
  await admin.end();

  const dataSource = new DataSource(buildDataSourceOptions(TEST_URL));
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
