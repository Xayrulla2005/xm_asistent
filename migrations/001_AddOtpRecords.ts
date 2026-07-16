import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpRecords1001 implements MigrationInterface {
  name = 'AddOtpRecords1001';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "otp_records" (
        "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
        "key"         varchar       NOT NULL,
        "type"        varchar       NOT NULL,
        "code"        varchar,
        "expiresAt"   timestamptz,
        "attempts"    integer       NOT NULL DEFAULT 0,
        "lockedUntil" timestamptz,
        "updatedAt"   timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_records" PRIMARY KEY ("id")
      );
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_otp_records_key_type"
      ON "otp_records" ("key", "type");
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "otp_records";`);
  }
}
