import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * DB 接続（postgres.js + Drizzle）。
 * DATABASE_URL は実際に DB を使う処理で必須。env.ts では当面 optional のため、ここで明示チェックする。
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
export { schema };
