# recordbase

kintone 型のノーコードアプリ作成ツール。データ層とアプリ層を分離した**メタ駆動モデル**が中核。

設計の一次情報は [`docs/DESIGN.md`](docs/DESIGN.md)、実装計画は
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) を参照。

## 構成（monorepo）

```
apps/
  api/        # Fastify + (Drizzle/Better Auth は今後)
  web/        # React + Vite
packages/
  shared/     # 共有 Zod スキーマ・型の唯一の源
docs/
  DESIGN.md
  IMPLEMENTATION_PLAN.md
  decisions/  # ADR
```

## セットアップ

前提: Node.js 20+ / pnpm 10 / Docker（DB 用）。

```bash
pnpm install
cp .env.example .env
pnpm db:up        # ローカル PostgreSQL を起動（フェーズ1以降で使用）
pnpm dev          # shared を build 後、api と web を並列起動
```

- web: http://localhost:5173 （`/api/*` は API:3001 へプロキシ）
- api: http://localhost:3001/healthz

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | shared を build 後、api/web を並列起動 |
| `pnpm build` | 全パッケージを依存順にビルド |
| `pnpm typecheck` | 型チェック |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 整形 |
| `pnpm db:up` / `pnpm db:down` | ローカル PostgreSQL の起動／停止 |

## 現在のフェーズ

フェーズ0（基盤）完了：monorepo・web/api/shared の疎通・CI・ローカル DB。
次フェーズは [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) を参照。
