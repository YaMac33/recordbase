# ADR-0001: monorepo の基盤ツール選定

- ステータス: 採択
- 日付: 2026-06-13
- 関連: DESIGN.md §7（技術スタック）, §8（リポジトリ構成）

## 背景
DESIGN.md でスタック（TypeScript / React+Vite / Fastify / Drizzle / Better Auth / Zod）と
monorepo 構成は確定済み。実装着手にあたり、設計書が言及していない「土台のビルド／実行ツール」を
ここで確定する。

## 決定
- パッケージマネージャ: **pnpm workspaces**（`apps/*`・`packages/*`）。
- 共有パッケージ `@recordbase/shared` のビルド: **tsup**（ESM + 型定義 `.d.ts` 出力）。
  フロント／バックは `workspace:*` 依存で `dist` を参照する。
- API のビルド: **tsup**、開発実行: **tsx**（`tsx watch`）。
- フロント: **Vite**（dev サーバ、`/api` を Fastify にプロキシ）。
- Lint/Format: **ESLint (flat config) + typescript-eslint**、**Prettier**。
- すべて ESM（`"type": "module"`）、TypeScript は strict + `noUncheckedIndexedAccess`。
- 型の唯一の源は `@recordbase/shared`。env も Zod で検証する。

## 帰結
- `pnpm build` は依存順（shared → api/web）で実行され、CI も build → typecheck → lint の順で回す。
- 将来 Drizzle / Better Auth / TanStack 等を各パッケージへ追加していく前提の最小骨格。
- 重い設計判断ではないため軽量 ADR とする。大きな変更時は別 ADR を追加する。
