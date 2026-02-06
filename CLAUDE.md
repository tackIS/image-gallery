# Image Gallery Manager — Claude Code 開発ガイド

ローカルの画像・動画ファイルを管理するmacOSデスクトップアプリケーション。

## 技術スタック

- **フロントエンド**: React 19 / TypeScript / Vite 7 / Tailwind CSS v4 / Zustand / React Router / lucide-react
- **バックエンド**: Tauri v2（Rust） / SQLite（tauri-plugin-sql）
- **動画処理**: ffmpeg（メタデータ抽出・サムネイル生成）

## プロジェクト構造

```
src/                    # React フロントエンド
  components/           # UIコンポーネント（19ファイル）
  hooks/useTheme.ts     # テーマ管理
  store/imageStore.ts   # Zustand 状態管理（persist）
  types/image.ts        # 型定義
  utils/tauri-commands.ts # Tauri APIラッパー
  App.tsx / main.tsx / index.css
src-tauri/src/          # Rust バックエンド
  commands.rs           # Tauriコマンド（API層 + バリデーション）
  db.rs                 # DB初期化・マイグレーション
  fs_utils.rs           # ファイルスキャン・拡張子判定
  video_utils.rs        # ffmpeg連携
  lib.rs / main.rs
doc/                    # 設計ドキュメント
```

## Tailwind CSS v4（重要）

⚠️ **v4はv3と構文が異なる。以下を厳守。**

```css
/* ✅ v4 正しい */
@import "tailwindcss";
@theme { --color-gray-50: oklch(0.985 0 0); }
@variant dark (&:where(.dark, .dark *));

/* ❌ v3 使用禁止 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 開発コマンド

| コマンド | 用途 |
|----------|------|
| `npm run dev` | フロントエンドのみ起動 |
| `npm run tauri:dev` | Tauriアプリ起動（フル） |
| `npm run build` | フロントエンドビルド |
| `npm run tauri:build` | アプリビルド |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 型チェック |
| `cargo check -p image-gallery` | Rustチェック |
| `cargo clippy -p image-gallery` | Rust lint |

## コミット規約

```
<type>: <subject>

<body>

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**type**: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore`

## ブランチ命名

- 機能: `feature/issue-<N>-<description>`
- 修正: `fix/issue-<N>-<description>`

## コーディング規約

- `any` 禁止、`interface` より `type` を使用
- 関数コンポーネントのみ（クラスコンポーネント禁止）
- 100行超のコンポーネントは分割を検討
- すべてのコンポーネントはダークモード対応必須
- 命名: コンポーネント=PascalCase、関数/変数=camelCase、定数=UPPER_SNAKE_CASE

## 詳細ルール

領域別の詳細規約は `.claude/rules/` を参照:
- `frontend-react.md` — React/TypeScript規約
- `frontend-styling.md` — Tailwind v4/ダークモード
- `backend-rust.md` — Rust/Tauri/SQLite規約
- `testing.md` — テストチェックリスト

## カスタムコマンド

- `/issue` — GitHub Issue作成
- `/fix-issue` — Issue対応開始（ブランチ作成）
- `/pr` — PR作成
- `/dev` — 開発サーバー起動
- `/build` — ビルド＆チェック
- `/review` — 変更セルフレビュー
