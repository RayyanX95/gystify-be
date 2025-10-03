import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';

// Auto-detect: use .ts in dev (ts-node), .js in prod (compiled)
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT
    ? parseInt(process.env.DATABASE_PORT, 10)
    : undefined,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  entities: [`${__dirname}/src/entities/**/*.${ext}`],
  migrations: [`${__dirname}/src/migrations/*.${ext}`],

  synchronize: false,
  logging: true,
});
