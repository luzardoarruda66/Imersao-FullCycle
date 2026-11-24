import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Edição, citação e exclusão da mensagem, e as menções (F1-05; LLD, seção 4, "Dados"). Nada é preenchido para
 * trás: as mensagens existentes ficam sem edição, sem citação, sem exclusão e sem menções.
 */
export class Mentions1790000000004 implements MigrationInterface {
  name = 'Mentions1790000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages"
      ADD COLUMN "edited_at" timestamptz,
      ADD COLUMN "deleted_at" timestamptz,
      ADD COLUMN "quoted_message_id" uuid,
      ADD CONSTRAINT "messages_quoted_message_fk" FOREIGN KEY ("quoted_message_id") REFERENCES "messages" ("id") ON DELETE SET NULL`);
    await queryRunner.query(`CREATE TABLE "mentions" (
      "message_id" uuid NOT NULL,
      "person_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_mentions" PRIMARY KEY ("message_id", "person_id"),
      CONSTRAINT "mentions_message_fk" FOREIGN KEY ("message_id") REFERENCES "messages" ("id") ON DELETE CASCADE,
      CONSTRAINT "mentions_person_fk" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE
    )`);
    // A F1-06 lê as menções de uma pessoa; a leitura recalcula a contagem por pessoa.
    await queryRunner.query(`CREATE INDEX "mentions_person_idx" ON "mentions" ("person_id", "message_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mentions"`);
    await queryRunner.query(`ALTER TABLE "messages"
      DROP CONSTRAINT "messages_quoted_message_fk",
      DROP COLUMN "quoted_message_id",
      DROP COLUMN "deleted_at",
      DROP COLUMN "edited_at"`);
  }
}
