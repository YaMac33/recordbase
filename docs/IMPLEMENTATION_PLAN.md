# 実装計画（タスク分解）

本書は `DESIGN.md` を一次情報として、実装フェーズのタスクを分解したもの。
コードはまだ書かない段階での「作業計画」であり、各タスクは独立して着手・検証できる粒度を目指す。

- 対象：kintone 型ノーコードアプリ作成ツール（メタ駆動モデル）
- 方針：データ層（`databases`/`fields`/`records`）とアプリ層（`apps`/`app_views`）を分離。汎用 JSON ＋昇格戦略。全テーブル `workspace_id` 付き。
- 関連：`DESIGN.md` §3 ADR、§6 データモデル、§9 楽観ロック、§10 DB 間参照。

## 全体の進め方
1. 縦に薄く通す（土台 → 1 つの DB で CRUD が動く）ことを最優先し、横（フィールド型・アプリビュー・権限）を後から肉付けする。
2. 大きな設計判断が出たら `docs/decisions/` に ADR を追加してから実装（CLAUDE.md の指示）。
3. スキーマ変更は必ず Drizzle マイグレーションとして残す。
4. `packages/shared` の Zod を唯一の型源とし、API／フォームで二重定義しない。

---

## フェーズ 0：プロジェクト基盤（monorepo の骨組み）
ゴール：`pnpm install` → `dev` が動き、空の web / api / shared が連携起動する。

- [ ] 0.1 monorepo セットアップ（DESIGN §8 の構成）。pnpm workspaces、ルート `package.json`、`tsconfig` ベース、`apps/web`・`apps/api`・`packages/shared` の雛形。
- [ ] 0.2 共通ツールチェイン：TypeScript（strict）、ESLint、Prettier、`.editorconfig`、`.gitignore`。
- [ ] 0.3 `packages/shared` 初期化：Zod を依存に追加し、空の型エクスポート＆ビルド（tsup 等）でフロント／バックから import できることを確認。
- [ ] 0.4 `apps/api`：Fastify 起動、`/healthz` エンドポイント、env 読み込み（Zod で env 検証）。
- [ ] 0.5 `apps/web`：React + Vite 起動、API への疎通（`/healthz` を叩く）確認。
- [ ] 0.6 ローカル開発用 PostgreSQL（docker-compose）と `.env.example`。
- [ ] 0.7 CI の最小形：型チェック＋lint＋build（GitHub Actions）。

## フェーズ 1：DB 層とマイグレーション基盤
ゴール：Drizzle スキーマとマイグレーションが回り、メタ駆動の中核テーブルが存在する。

- [ ] 1.1 Drizzle 導入：接続、`drizzle.config`、マイグレーション生成／適用スクリプト。
- [ ] 1.2 中核スキーマ定義（DESIGN §6）：`workspaces`・`databases`・`fields`・`records`・`apps`・`app_views`・`app_databases`・`relations`・`permissions`。全テーブルに `workspace_id`。
- [ ] 1.3 `records`：`data` JSONB、整数 `revision`、`created_at`/`updated_at`/`created_by`、`database_id`、`workspace_id`。冪等キー用にクライアント生成 ID ＋ユニーク制約（DESIGN §9 新規作成）。
- [ ] 1.4 基本インデックス：`workspace_id`／`database_id` 複合インデックス、`records.data` への GIN（昇格戦略の土台、DESIGN §5）。
- [ ] 1.5 シード／初期 workspace 投入スクリプト（当面シングルテナント）。

## フェーズ 2：認証（Better Auth）
ゴール：サインアップ／ログイン／セッションが成立し、API が `workspace_id` 込みでユーザーを識別できる。

- [ ] 2.1 Better Auth を api に統合（自ホスト、DESIGN §7 ADR-05）。管理テーブルを Drizzle スキーマと共存。
- [ ] 2.2 `users` と Better Auth の連携。ユーザー作成時に `workspace_id` を割り当て（当面 1 ユーザー＝1 ワークスペース or 共有ワークスペース、ADR を切る）。
- [ ] 2.3 Fastify 認証ミドルウェア：セッションから `userId`／`workspaceId` を解決し、リクエストコンテキストに載せる。
- [ ] 2.4 全データクエリを `workspace_id` でスコープする共通ヘルパ（設計の鉄則）。未スコープのクエリを防ぐ仕組み（ヘルパ経由を強制）。
- [ ] 2.5 web 側：ログイン／サインアップ画面、セッション状態、未認証リダイレクト。

## フェーズ 3：メタ定義 API（databases / fields）
ゴール：DB（テーブル定義）とフィールド定義を作成・編集でき、型が `packages/shared` に一元化される。

- [ ] 3.1 `shared`：フィールド型の Zod 定義（text/number/date/select/reference/lookup/related など）。`fields.options` のスキーマを型ごとに定義（DESIGN §10）。
- [ ] 3.2 `databases` CRUD API（Zod 検証、workspace スコープ）。
- [ ] 3.3 `fields` CRUD API。`type` と `options` の整合を Zod で検証。
- [ ] 3.4 レコードバリデータ生成：`fields` メタから、その DB のレコード `data` を検証する Zod スキーマを動的に組み立てる仕組み（メタ駆動の核）。
- [ ] 3.5 web：DB 一覧／作成、フィールドビルダー（dnd-kit で並べ替え、react-hook-form ＋ Zod）。

## フェーズ 4：レコード CRUD ＋楽観ロック（縦に通す MVP）
ゴール：1 つの DB に対して、フォーム入力 → 保存 → 一覧表示 → 編集（競合制御込み）が動く。

- [ ] 4.1 レコード作成 API：冪等キー（クライアント生成 ID）＋ユニーク制約で二重送信を防止（DESIGN §9）。`data` をフェーズ 3.4 の動的 Zod で検証。
- [ ] 4.2 レコード取得／一覧 API：workspace＋database スコープ、ページング、`revision` を含めて返す。
- [ ] 4.3 条件付き更新 API：`id AND workspace_id AND revision = N` の UPDATE。影響行数 1＝成功で `revision` N+1 を返す、0＝衝突（DESIGN §9）。
- [ ] 4.4 衝突応答（第 1 段階）：409 ＋最新 `revision`＋`data` を同梱。削除済み判定の分岐。
- [ ] 4.5 条件付き削除 API：`revision` 条件付き delete（古い版での誤削除防止）。
- [ ] 4.6 web：レコードフォーム（react-hook-form＋動的 Zod）、一覧（TanStack Table）、TanStack Query で取得・楽観更新・409 リトライ UX。
- [ ] 4.7 結合検証：DB 作成→フィールド定義→レコード作成→編集→競合再現、まで E2E で 1 本通す。

## フェーズ 5：DB 間参照（reference / lookup / related）
ゴール：DB をまたいだ参照・ルックアップ・関連レコードが表示でき、N+1 を避けて解決される。

- [ ] 5.1 `reference` 型：相手レコード ID のみを JSON 保持（単一／複数）。`relations` メタとの対応（DESIGN §10）。
- [ ] 5.2 書き込み時整合性検証：参照先が存在し同一 workspace であることをアプリ層で検証（ソフト参照）。
- [ ] 5.3 `lookup` 解決：読み取り時に派生値を解決。一覧では参照先 DB ごとに ID をまとめて `IN (...)` で一括解決（N+1 回避）。
- [ ] 5.4 `related`（関連レコード）：逆方向 1 対多の引き当て、workspace スコープ。
- [ ] 5.5 削除ポリシー：参照されているレコードの削除をデフォルト restrict。relation ごとに restrict／set null を切替（DESIGN §10）。
- [ ] 5.6 web：参照ピッカー UI、ルックアップ／関連レコードの表示コンポーネント。

## フェーズ 6：アプリ層（ビュー定義）
ゴール：1 アプリが複数 DB を束ね、フォーム／一覧ビューを設定として保存・描画できる。

- [ ] 6.1 `apps` CRUD と `app_databases`（1 アプリ ↔ 複数 DB）。
- [ ] 6.2 `app_views`：kind=form/list、`config`(JSON) の Zod スキーマ（表示項目・並び順・フィルタ等）。
- [ ] 6.3 web：アプリビルダー（フォームレイアウト・一覧カラム設定を `config` に保存）、保存された `config` からの描画。

## フェーズ 7：権限（アプリ単位＋作成者ベース）
ゴール：DESIGN §11 の初期権限モデルが効く。

- [ ] 7.1 `permissions`：scope／role の最小定義（アプリ単位＋作成者ベース）。
- [ ] 7.2 API ガード：閲覧／編集／削除を権限と `created_by` で判定。
- [ ] 7.3 web：権限が無い操作の非表示／無効化。

## フェーズ 8：昇格の仕組み（性能の後付け補強）
ゴール：メタ定義から生成列・インデックスを発行する内部処理（DESIGN §5／§11）。

- [ ] 8.1 ADR：昇格の発行設計（メタ → 生成列 → インデックス → 任意で FK）を `docs/decisions/` に起票。
- [ ] 8.2 フィールドを「昇格対象」に指定するメタフラグと、対応するマイグレーション自動生成／適用。
- [ ] 8.3 参照 ID の生成列昇格＋インデックス、必要時に本物の FK 制約（DESIGN §10 性能・整合性の昇格）。

## フェーズ 9：デプロイ／運用
ゴール：GitHub push → Render 自動デプロイ、managed Postgres ＋ PITR。

- [ ] 9.1 Render 設定（web 静的配信／api サービス／managed Postgres、DESIGN §7 ADR-08）。
- [ ] 9.2 本番マイグレーション手順（デプロイ時適用、ロールバック方針）。
- [ ] 9.3 env／シークレット管理、バックアップ（PITR）確認。

---

## 将来の宿題（着手対象外・記録のみ）
- マルチテナント昇格（組織・招待・課金）。`workspace_id` 前提を活かす（DESIGN §11）。
- 楽観ロック第 2 段階：3-way マージ（同フィールド衝突のみ真の衝突）（DESIGN §9）。
- soft-delete（`deleted_at`）による監査・復元（DESIGN §9）。
- フィールド単位の権限（DESIGN §11）。
- 物理テーブル動的生成（超高頻度・大量レコードの基幹 DB 限定の例外手段、DESIGN §5）。

## クリティカルパス（依存順の要約）
フェーズ 0 → 1 → 2 → 3 → 4 が MVP の一本道（ここで「1 DB の CRUD が動く」）。
フェーズ 5・6・7 は 4 完了後におおむね並行可能。8・9 は随時。
