import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeLastLoginAt1002 implements MigrationInterface {
  name = 'EmployeeLastLoginAt1002';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamptz;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "employees" DROP COLUMN IF EXISTS "lastLoginAt";
    `);
  }
}
