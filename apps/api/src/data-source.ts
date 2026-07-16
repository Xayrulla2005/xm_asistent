import 'dotenv/config';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Used by TypeORM CLI: npx typeorm migration:generate / migration:run
export const AppDataSource = new DataSource({
  type:     'postgres',
  host:     process.env['DB_HOST']     ?? 'localhost',
  port:     Number(process.env['DB_PORT'] ?? 5432),
  username: process.env['DB_USER']     ?? 'xm_user',
  password: process.env['DB_PASSWORD'] ?? 'xm_password',
  database: process.env['DB_NAME']     ?? 'xm_db',
  entities:   [path.join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: false,
});
