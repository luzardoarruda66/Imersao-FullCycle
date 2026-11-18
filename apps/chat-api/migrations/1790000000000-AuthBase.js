export class AuthBase1790000000000 {
    name = 'AuthBase1790000000000';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "people" (
      "id" uuid NOT NULL,
      "email" text NOT NULL,
      "name" text NOT NULL,
      "password_hash" text NOT NULL,
      "is_admin" boolean NOT NULL DEFAULT false,
      "has_data_permission" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_people_email" UNIQUE ("email"),
      CONSTRAINT "PK_people_id" PRIMARY KEY ("id")
    )`);
        await queryRunner.query(`CREATE TABLE "sessions" (
      "id" text NOT NULL,
      "user_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "last_active_at" timestamptz NOT NULL,
      "mfa" text,
      "metadata" jsonb,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
    )`);
        await queryRunner.query(`CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at")`);
        await queryRunner.query(`CREATE TABLE "login_attempts" (
      "id" uuid NOT NULL,
      "email" text NOT NULL,
      "ip" text NOT NULL,
      "failures" integer NOT NULL DEFAULT 0,
      "blocked_until" timestamptz,
      "last_failure_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "login_attempts_email_ip_key" UNIQUE ("email", "ip"),
      CONSTRAINT "PK_login_attempts_id" PRIMARY KEY ("id")
    )`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "login_attempts"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "people"`);
    }
}
//# sourceMappingURL=1790000000000-AuthBase.js.map