import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // generate は接続不要だが、migrate / studio で必要になる
  console.warn('[drizzle] DATABASE_URL が未設定です（migrate/studio には .env が必要）');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl ?? 'postgresql://recordbase:recordbase@localhost:5432/recordbase',
  },
  verbose: true,
  strict: true,
});
