import * as fs from 'fs';
import * as path from 'path';

// Load .env from apps/api/.env if it exists (for CLI usage from workspace root)
const envPath = path.join(process.cwd(), 'apps/api/.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

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
