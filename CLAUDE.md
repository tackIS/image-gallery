# Claude Code 開発ガイド

このドキュメントは、Claude Codeを使ってこのプロジェクト（Image Gallery Manager）を開発する際のガイドラインです。

## プロジェクト概要

**Image Gallery Manager** は、ローカルの画像・動画ファイルを管理するためのmacOSデスクトップアプリケーションです。

### 技術スタック

#### フロントエンド
- **React 19.2.0** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite 7** - ビルドツール
- **Tailwind CSS v4** - スタイリング
  - ⚠️ v4では `@import "tailwindcss"` を使用（v3の `@tailwind` ディレクティブとは異なる）
  - ⚠️ `@theme` ブロックで色パレットを定義
  - ⚠️ `@variant dark` でダークモードバリアントを定義
- **Zustand** - 状態管理
- **React Router** - ルーティング
- **lucide-react** - アイコン

#### バックエンド
- **Tauri v2** - Rustベースのデスクトップアプリフレームワーク
- **SQLite** - データベース (tauri-plugin-sql)
- **Rust** - バックエンドロジック

### プロジェクト構造

```
image-gallery/                     # リポジトリルート
├── doc/                          # 設計ドキュメント
├── src/                          # Reactフロントエンド
│   ├── components/               # UIコンポーネント
│   │   ├── Header.tsx            # ヘッダー（ディレクトリ選択、統計）
│   │   ├── ImageGrid.tsx         # グリッド表示
│   │   ├── MediaCard.tsx         # メディアカード
│   │   ├── ImageDetail.tsx       # 詳細モーダル
│   │   ├── VideoPlayer.tsx       # カスタム動画プレイヤー
│   │   ├── SettingsModal.tsx     # 設定モーダル
│   │   ├── SlideshowControls.tsx # スライドショーコントロール
│   │   ├── ErrorBoundary.tsx     # エラーバウンダリ
│   │   ├── EmptyState.tsx        # 空状態表示
│   │   └── LoadingSpinner.tsx    # ローディング表示
│   ├── hooks/                    # カスタムフック
│   │   └── useTheme.ts           # テーマ管理フック
│   ├── store/                    # Zustand状態管理
│   │   └── imageStore.ts         # メイン状態ストア
│   ├── types/                    # TypeScript型定義
│   │   └── image.ts              # メディアファイル型
│   ├── utils/                    # ユーティリティ
│   │   └── tauri-commands.ts     # Tauri APIラッパー
│   ├── App.tsx                   # アプリケーションルート
│   ├── index.css                 # グローバルスタイル（Tailwind設定）
│   └── main.tsx                  # エントリーポイント
├── src-tauri/                    # Tauriバックエンド（Rust）
│   ├── src/
│   │   ├── main.rs               # エントリーポイント
│   │   ├── commands.rs           # Tauriコマンド定義
│   │   ├── db.rs                 # データベース管理
│   │   ├── fs_utils.rs           # ファイルシステムユーティリティ
│   │   └── video_utils.rs        # 動画処理（ffmpeg統合、メタデータ抽出、サムネイル生成）
│   └── tauri.conf.json           # Tauri設定
├── public/                       # 静的アセット
│   └── vite.svg
├── package.json                  # npm設定
├── package-lock.json             # npm依存関係ロック
├── vite.config.ts                # Vite設定
├── tsconfig.json                 # TypeScript設定（ベース）
├── tsconfig.app.json             # TypeScript設定（アプリ）
├── tsconfig.node.json            # TypeScript設定（Node）
├── eslint.config.js              # ESLint設定
├── tailwind.config.js            # Tailwind設定
├── postcss.config.js             # PostCSS設定
├── index.html                    # HTMLエントリーポイント
├── CLAUDE.md                     # このファイル（開発ガイド）
└── README.md                     # プロジェクト説明
```

## 開発時の重要な注意点

### 1. Tailwind CSS v4の使用

⚠️ **このプロジェクトはTailwind CSS v4を使用しています。v3とは構文が異なります。**

#### ❌ 間違い (v3の書き方)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### ✅ 正しい (v4の書き方)
```css
@import "tailwindcss";

@theme {
  --color-gray-50: oklch(0.985 0 0);
  /* ... 色パレット定義 ... */
}

@variant dark (&:where(.dark, .dark *));
```

#### スタイルガイドライン
- **グローバルスタイルは最小限に**: `src/index.css` には必要最小限のスタイルのみ記述
- **Viteのデフォルトスタイルは削除済み**: `:root`, `button`, `h1` などの固定スタイルは使用しない
- **ユーティリティクラスを優先**: インラインスタイルではなくTailwindクラスを使用

### 2. ダークモード対応

- すべての新しいコンポーネントは **ダークモード対応必須**
- `dark:` プレフィックスを使用して、ダーク時のスタイルを定義
- テキスト: `text-gray-900 dark:text-gray-100`
- 背景: `bg-white dark:bg-gray-800`
- ボーダー: `border-gray-300 dark:border-gray-600`

### 3. レスポンシブ対応

このアプリは主にmacOSデスクトップアプリですが、開発時のUX向上のため、基本的なレスポンシブ対応を推奨します。

#### ブレークポイント
- `sm:` - 640px以上（タブレット）
- `md:` - 768px以上
- `lg:` - 1024px以上
- `xl:` - 1280px以上

#### 例：モバイル対応ヘッダー
```tsx
<button className="px-2 sm:px-4 py-2">
  <Icon size={20} />
  <span className="hidden sm:inline">Button Text</span>
</button>
```

### 4. データベース操作

#### スキーマ
```sql
CREATE TABLE images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_type TEXT DEFAULT 'image',  -- 'image' または 'video'
    comment TEXT,
    tags TEXT,                        -- JSON配列形式
    rating INTEGER DEFAULT 0,         -- 0-5
    is_favorite INTEGER DEFAULT 0,    -- 0: 通常, 1: お気に入り
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    -- Phase 3: 動画メタデータ（Migration v4で追加）
    duration_seconds REAL,            -- 動画の長さ（秒）
    width INTEGER,                    -- 解像度（幅）
    height INTEGER,                   -- 解像度（高さ）
    video_codec TEXT,                 -- ビデオコーデック
    audio_codec TEXT,                 -- オーディオコーデック
    thumbnail_path TEXT               -- サムネイル画像パス
);
```

#### データベース操作時の注意
- **マイグレーションは自動実行**: アプリ起動時に自動的にマイグレーション
- **トランザクション使用**: 複数の書き込み操作は必ずトランザクション内で
- **エラーハンドリング必須**: データベースエラーは適切にキャッチして表示

### 5. Tauri APIの使用

#### ファイルシステムアクセス
```typescript
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';

// ディレクトリ選択
const path = await selectDirectory();

// ディレクトリスキャン
const images = await scanDirectory(path);
```

#### データベース操作
```typescript
import { saveMetadata, loadMetadata } from '../utils/tauri-commands';

// メタデータ保存
await saveMetadata(imageId, { comment, tags, rating });

// メタデータ読み込み
const metadata = await loadMetadata(imageId);
```

### 6. 状態管理（Zustand）

すべてのグローバル状態は `imageStore.ts` で管理します。

```typescript
// ストアの使用例
const { images, setImages, selectedImageId, setSelectedImageId } = useImageStore();
```

#### 状態の種類
- **images**: 読み込まれたメディアファイルのリスト
- **selectedImageId**: 現在選択中の画像ID
- **sortBy / sortOrder**: ソート設定
- **filterSettings**: フィルター設定
- **searchQuery**: 検索クエリ

## コーディング規約

### TypeScript
- **厳格な型定義**: `any` の使用は避ける
- **interfaceよりtype**: オブジェクト型は `type` を使用
- **関数コンポーネント**: クラスコンポーネントは使用しない

### コンポーネント設計
- **単一責任の原則**: 1つのコンポーネントは1つの責任のみ
- **Props型定義**: すべてのPropsは明示的に型定義
- **コンポーネント分割**: 100行を超えたら分割を検討

### 命名規則
- **コンポーネント**: PascalCase (`ImageGrid`, `MediaCard`)
- **関数/変数**: camelCase (`handleClick`, `isLoading`)
- **定数**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **ファイル名**: PascalCase (コンポーネント), camelCase (ユーティリティ)

## 開発ワークフロー

### 1. 新機能開発の流れ

```bash
# 1. Issueを作成（gh issue create）
gh issue create --title "新機能: 説明" --body "詳細"

# 2. mainブランチから最新を取得
git checkout main
git pull

# 3. featureブランチを作成
git checkout -b feature/new-feature-name

# 4. 開発
npm run dev  # または npm run tauri:dev

# 5. コミット
git add .
git commit -m "feat: 新機能の説明

詳細な説明...

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. プッシュ & PR作成
git push -u origin feature/new-feature-name
gh pr create --title "タイトル" --body "説明" --base main
```

### 2. バグ修正の流れ

```bash
# 1. Issueを作成（gh issue create）
gh issue create --title "バグ: 説明" --body "詳細"

# 2. fixブランチを作成
git checkout -b fix/issue-XX-description

# 3. 修正 & PR作成
# ... 開発 ...
git commit -m "fix: Issue #XX の説明

Fixes #XX"
```

### 3. コミットメッセージ規約

```
<type>: <subject>

<body>

<footer>
```

#### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: スタイル修正（フォーマット、セミコロンなど）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセス、補助ツールの変更

#### 例
```
feat: 動画サムネイル生成機能を追加

MP4ファイルの最初のフレームをサムネイルとして表示する機能を追加。
- VideoThumbnail コンポーネント作成
- サムネイルキャッシュ機能

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## テスト

### 手動テスト項目
新機能追加時は以下を確認：

- [ ] ライトモードで正常動作
- [ ] ダークモードで正常動作
- [ ] モバイルサイズ（375px）で表示が崩れない
- [ ] タブレットサイズ（768px）で正常表示
- [ ] デスクトップサイズ（1440px）で正常表示
- [ ] エラー時の適切なエラーメッセージ表示
- [ ] データベース操作の成功

## トラブルシューティング

### Tailwind CSSが効かない

**症状**: `bg-blue-500` などのクラスが効かない

**原因**: `src/index.css` に不要なグローバルスタイルが混入

**対処**:
```css
/* src/index.css は以下のみ */
@import "tailwindcss";

@theme {
  /* 色パレット定義 */
}

@variant dark (&:where(.dark, .dark *));

body {
  margin: 0;
}
```

### ダークモードが動作しない

**症状**: テーマ切り替えボタンをクリックしても変わらない

**確認事項**:
1. `src/index.css` に `@variant dark` が定義されているか
2. `useTheme` フックで `dark` クラスが `<html>` に追加されているか
3. コンポーネントで `dark:` プレフィックスを使用しているか

### データベースエラー

**症状**: "no such column" エラー

**対処**:
```bash
# データベースを削除して再作成
rm ~/Library/Application\ Support/com.imagegallery/gallery.db
# アプリを再起動（マイグレーション自動実行）
```

## 参考リンク

### 公式ドキュメント
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### プロジェクト内ドキュメント
- [README.md](./README.md) - プロジェクト概要

## Claude Codeとの協働のコツ

### 効果的な依頼方法

#### ✅ 良い例
```
「モバイルサイズでヘッダーレイアウトが崩れる問題を修正してください。
ボタンのテキストを sm: ブレークポイント以下では非表示にして、
アイコンのみ表示するようにしたいです。」
```

#### ❌ 悪い例
```
「ヘッダーを直して」
```

### コンテキストの提供

- 関連するファイルパスを明示
- 期待される動作を具体的に説明
- エラーメッセージがあれば全文を提供
- スクリーンショットがあれば説明に含める

### Issue起票の推奨

大きな変更の前に、Issueを起票してから実装することを推奨：

```bash
gh issue create --title "機能: XXXを追加" --body "詳細な説明"
```
