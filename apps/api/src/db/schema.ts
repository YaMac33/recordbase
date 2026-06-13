import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * recordbase ドメインスキーマ（DESIGN.md §6 データモデル ＋ ADR-0002）。
 *
 * 設計の鉄則:
 * - 全テーブルに `workspace_id`（テナントキー）を持たせ、読むクエリは常に workspace_id でスコープする。
 * - レコード本体は汎用 JSON（`records.data` = JSONB）に保管し、よく検索する項目だけ後から
 *   生成列・インデックスへ「昇格」する（§5・フェーズ8）。
 * - 値の妥当性（フィールド型・role など）は packages/shared の Zod を一次とし、
 *   ここでは text 列＋アプリ層検証に寄せて、メタ追加時のマイグレーション負荷を避ける。
 *
 * ユーザー ID（`user_id` / `created_by`）は Better Auth が発行する文字列 ID を指す。
 * Better Auth のユーザーテーブル確定後（フェーズ2）に外部キー制約を付与する。
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** テナント。当面はユーザーごとに1つ（ADR-0002）。 */
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...timestamps,
});

/** ワークスペースのメンバーシップ。将来の招待・共同編集の土台（ADR-0002）。 */
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    // Better Auth のユーザー ID（フェーズ2で FK を付与）
    userId: text('user_id').notNull(),
    // owner / admin / member（値検証は shared の Zod 側）
    role: text('role').notNull().default('member'),
    ...timestamps,
  },
  (t) => [uniqueIndex('workspace_members_ws_user_uq').on(t.workspaceId, t.userId)],
);

/** 業務 DB の定義。 */
export const databases = pgTable(
  'databases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [index('databases_ws_idx').on(t.workspaceId)],
);

/** 項目定義。type と options（メタ）で表現する。 */
export const fields = pgTable(
  'fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    databaseId: uuid('database_id')
      .notNull()
      .references(() => databases.id, { onDelete: 'cascade' }),
    // records.data 内のキー
    key: text('key').notNull(),
    // text/number/date/select/reference/lookup/related など（値検証は shared の Zod）
    type: text('type').notNull(),
    // 参照先 DB・表示項目・単一/複数などのメタ（DESIGN §10）
    options: jsonb('options')
      .notNull()
      .default(sql`'{}'::jsonb`),
    // フォーム／一覧での並び順（dnd-kit ビルダー用）
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('fields_db_idx').on(t.databaseId),
    uniqueIndex('fields_db_key_uq').on(t.databaseId, t.key),
  ],
);

/** 業務データ本体。本体は data(JSONB)。楽観ロックは整数 revision（DESIGN §9）。 */
export const records = pgTable(
  'records',
  {
    // クライアント生成 UUID を許容し、PK 自体を冪等キーとする（再送は PK 衝突で弾く・§9）。
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    databaseId: uuid('database_id')
      .notNull()
      .references(() => databases.id, { onDelete: 'cascade' }),
    data: jsonb('data')
      .notNull()
      .default(sql`'{}'::jsonb`),
    // 楽観ロックのバージョン（衝突判定に使う。updated_at は表示・監査用）
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Better Auth のユーザー ID（フェーズ2で FK を付与）
    createdBy: text('created_by'),
  },
  (t) => [
    index('records_ws_db_idx').on(t.workspaceId, t.databaseId),
    // 昇格戦略の土台：data 全体への GIN（§5）
    index('records_data_gin').using('gin', t.data),
  ],
);

/** アプリ（ビューの束）。 */
export const apps = pgTable(
  'apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [index('apps_ws_idx').on(t.workspaceId)],
);

/** フォーム・一覧などのビュー定義。 */
export const appViews = pgTable(
  'app_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    // form / list（値検証は shared の Zod）
    kind: text('kind').notNull(),
    config: jsonb('config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('app_views_app_idx').on(t.appId)],
);

/** 1アプリ ↔ 複数 DB の対応。 */
export const appDatabases = pgTable(
  'app_databases',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    databaseId: uuid('database_id')
      .notNull()
      .references(() => databases.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.appId, t.databaseId] }),
    index('app_databases_ws_idx').on(t.workspaceId),
  ],
);

/** DB 間参照のメタ（reference/lookup/related・DESIGN §10）。 */
export const relations = pgTable(
  'relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    fromFieldId: uuid('from_field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    toDatabaseId: uuid('to_database_id')
      .notNull()
      .references(() => databases.id, { onDelete: 'cascade' }),
    // reference / lookup / related
    kind: text('kind').notNull(),
    options: jsonb('options')
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [
    index('relations_ws_idx').on(t.workspaceId),
    index('relations_from_field_idx').on(t.fromFieldId),
  ],
);

/** 権限（当面アプリ単位＋作成者ベース・DESIGN §11）。 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull(),
    role: text('role').notNull(),
    ...timestamps,
  },
  (t) => [index('permissions_app_idx').on(t.appId)],
);
