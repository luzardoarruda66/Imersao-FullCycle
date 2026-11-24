import type { MigrationInterface, QueryRunner } from 'typeorm';

// A migração é congelada: o formato do @usuário vive aqui por inteiro, e não importa a regra da aplicação,
// que pode mudar depois sem alterar o que esta migração fez.
const MIN = 3;
const MAX = 30;

/**
 * Deriva o @usuário de cada conta existente a partir do e-mail, na ordem recebida: a parte antes do `@`, em
 * minúsculas, com `_` no lugar do que está fora do formato, completada com `_` até 3 caracteres e truncada em 30.
 * Em colisão, acrescenta `-2`, `-3` e assim por diante, ainda dentro dos 30 caracteres.
 */
export function deriveUsernames(emails: string[]): string[] {
  const taken = new Set<string>();
  return emails.map((email) => {
    const at = email.indexOf('@');
    const local = at === -1 ? email : email.slice(0, at);
    const base = local.toLowerCase().replace(/[^a-z0-9._-]/g, '_').padEnd(MIN, '_').slice(0, MAX);
    let candidate = base;
    for (let n = 2; taken.has(candidate); n++) {
      const suffix = `-${n}`;
      candidate = `${base.slice(0, MAX - suffix.length)}${suffix}`;
    }
    taken.add(candidate);
    return candidate;
  });
}

/** @usuário e dados opcionais do Perfil nas pessoas (F1-03; LLD, seção 4, "Dados"). */
export class Username1790000000002 implements MigrationInterface {
  name = 'Username1790000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // A busca de pessoas ignora acentos (LLD, "Dados"). A extensão é "trusted": o dono do banco a cria.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await queryRunner.query(`ALTER TABLE "people"
      ADD COLUMN "username" text,
      ADD COLUMN "job_title" text,
      ADD COLUMN "phone" text,
      ADD COLUMN "status_text" text`);

    const rows: { id: string; email: string }[] = await queryRunner.query(
      `SELECT "id", "email" FROM "people" ORDER BY "created_at", "id"`,
    );
    const usernames = deriveUsernames(rows.map((row) => row.email));
    for (const [index, row] of rows.entries()) {
      await queryRunner.query(`UPDATE "people" SET "username" = $1 WHERE "id" = $2`, [usernames[index], row.id]);
    }

    await queryRunner.query(`ALTER TABLE "people" ALTER COLUMN "username" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "people" ADD CONSTRAINT "UQ_people_username" UNIQUE ("username")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "people" DROP CONSTRAINT "UQ_people_username"`);
    await queryRunner.query(`ALTER TABLE "people"
      DROP COLUMN "username",
      DROP COLUMN "job_title",
      DROP COLUMN "phone",
      DROP COLUMN "status_text"`);
    // A extensão `unaccent` fica: outras consultas podem usá-la, e criá-la de novo é idempotente.
  }
}
