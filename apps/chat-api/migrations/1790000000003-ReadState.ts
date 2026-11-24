import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Estado de leitura por pessoa e conversa (F1-04; LLD, seção 4, "Dados"). Nada é preenchido para trás. */
export class ReadState1790000000003 implements MigrationInterface {
  name = 'ReadState1790000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "conversation_read_states" (
      "conversation_id" uuid NOT NULL,
      "person_id" uuid NOT NULL,
      "last_read_message_id" uuid,
      "unread_count" integer NOT NULL DEFAULT 0,
      "mention_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_conversation_read_states" PRIMARY KEY ("conversation_id", "person_id"),
      CONSTRAINT "conversation_read_states_counts_check" CHECK ("unread_count" >= 0 AND "mention_count" >= 0),
      CONSTRAINT "conversation_read_states_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE,
      CONSTRAINT "conversation_read_states_person_fk" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE,
      CONSTRAINT "conversation_read_states_message_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "messages" ("id") ON DELETE SET NULL
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "conversation_read_states"`);
  }
}
