import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { workspaceMembers, workspaces } from './schema.js';

/**
 * 初期データ投入（フェーズ1）。当面シングルテナント運用のため、
 * 既定ワークスペースと、その owner メンバーシップ（ダミーユーザー）を1件作る。
 * フェーズ2で Better Auth のサインアップフックに置き換える。
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL が未設定です。.env を確認してください。');
  }

  const { db, client } = createDb(databaseUrl);
  try {
    const name = 'Default Workspace';
    const existing = await db.select().from(workspaces).where(eq(workspaces.name, name)).limit(1);
    if (existing.length > 0) {
      console.log(`[seed] 既定ワークスペースは既に存在します: ${existing[0]!.id}`);
      return;
    }

    const [ws] = await db.insert(workspaces).values({ name }).returning();
    await db.insert(workspaceMembers).values({
      workspaceId: ws!.id,
      userId: 'seed-user',
      role: 'owner',
    });
    console.log(`[seed] 既定ワークスペースを作成しました: ${ws!.id}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
