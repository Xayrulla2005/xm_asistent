import { MigrationInterface, QueryRunner } from 'typeorm';

// Converts users.role from PostgreSQL enum type to varchar so we can store
// 'superadmin' without altering the enum every time a new role is added.
export class UsersRoleVarchar1003 implements MigrationInterface {
  name = 'UsersRoleVarchar1003';

  async up(qr: QueryRunner): Promise<void> {
    // Add superadmin to enum first (safe: IF NOT EXISTS equivalent via try/catch)
    try {
      await qr.query(`ALTER TYPE public.users_role_enum ADD VALUE IF NOT EXISTS 'superadmin';`);
    } catch { /* already exists */ }

    // Convert column to varchar
    await qr.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE varchar
      USING "role"::varchar;
    `);

    // Drop the now-unused enum type
    await qr.query(`DROP TYPE IF EXISTS public.users_role_enum;`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE public.users_role_enum AS ENUM ('superadmin','admin','manager','user');
    `);
    await qr.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE public.users_role_enum
      USING "role"::public.users_role_enum;
    `);
  }
}
