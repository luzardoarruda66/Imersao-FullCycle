import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Conversas, participantes e mensagens (F1-02; LLD, seção 4, "Dados"). */
export class Conversations1790000000001 implements MigrationInterface {
  name = 'Conversations1790000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "conversations" (
      "id" uuid NOT NULL,
      "type" text NOT NULL,
      "name" text,
      "direct_key" text,
      "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
      CONSTRAINT "conversations_type_check" CHECK ("type" IN ('canal_publico', 'canal_privado', 'direta')),
      CONSTRAINT "conversations_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "people" ("id") ON DELETE SET NULL,
      CONSTRAINT "conversations_shape_check" CHECK (
        ("type" = 'direta' AND "name" IS NULL AND "direct_key" IS NOT NULL)
        OR ("type" <> 'direta' AND "name" IS NOT NULL AND "direct_key" IS NULL)
      )
    )`);
    // O índice decide a corrida: dois canais com o mesmo nome (sem diferenciar maiúsculas) não coexistem.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "conversations_channel_name_key" ON "conversations" (lower("name")) WHERE "type" <> 'direta'`,
    );
    // A chave do par é "menorId:maiorId", então a ordem do par não importa.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "conversations_direct_key_key" ON "conversations" ("direct_key") WHERE "type" = 'direta'`,
    );

    await queryRunner.query(`CREATE TABLE "conversation_participants" (
      "conversation_id" uuid NOT NULL,
      "person_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_conversation_participants" PRIMARY KEY ("conversation_id", "person_id"),
      CONSTRAINT "conversation_participants_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE,
      CONSTRAINT "conversation_participants_person_fk" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "conversation_participants_person_idx" ON "conversation_participants" ("person_id")`,
    );

    await queryRunner.query(`CREATE TABLE "messages" (
      "id" uuid NOT NULL,
      "conversation_id" uuid NOT NULL,
      "author_id" uuid NOT NULL,
      "text" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
      CONSTRAINT "messages_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE,
      CONSTRAINT "messages_author_fk" FOREIGN KEY ("author_id") REFERENCES "people" ("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "messages_conversation_created_idx" ON "messages" ("conversation_id", "created_at", "id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversation_participants"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
