# CLAUDE.md

## プロジェクト概要
kintone 型のノーコードアプリ作成ツール。データ層とアプリ層を分離した**メタ駆動モデル**が中核。一般向けオンライン SaaS（個人開発）。

## 現在のフェーズ
**設計確定済み・実装未着手。** 詳細は `docs/DESIGN.md` を一次情報とすること。実装に入る前に、DESIGN.md の「決定記録（ADR）」と「データモデル」を必ず読むこと。

## 技術スタック（確定）
- 言語：TypeScript（フロント／バック共通）
- フロント：React + Vite ／ TanStack Query ／ TanStack Table ／ react-hook-form ／ dnd-kit ／ Zod
- バック：Fastify ／ Drizzle（ORM）／ Better Auth ／ Zod
- DB：PostgreSQL（JSONB）
- 共有：`packages/shared` の Zod スキーマを唯一の型源とする
- ホスティング：Render（managed Postgres）

## 設計の鉄則
- データは汎用 JSON（`records.data` = JSONB）に保管する。検索・集計で多用するフィールドだけ生成列・インデックスへ「昇格」する。むやみに物理テーブルを増やさない。
- すべてのテーブルに `workspace_id` を持たせる（テナントキー）。データを読むクエリは常に `workspace_id` でスコープすること。
- 型はメタ定義→API→フォームで `packages/shared` の Zod を共有する。同じ型を二重定義しない。
- 認証は Better Auth に委譲する。パスワードのハッシュ化やセッション管理を自前で実装しない。

## 進め方
- 大きな設計変更が必要なときは、まず `docs/decisions/` に ADR を追加してから実装する。
- スキーマ変更は Drizzle のマイグレーションとして必ず残す。

## やらないこと
- LGWAN／三層分離／ガバメントクラウド向けの制約は対象外（オンライン・一般向けに方針変更済み）。
- 明示の指示があるまで、アプリ本体コードの大量生成を先行しない。