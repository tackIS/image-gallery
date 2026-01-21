# Image Gallery Manager

ローカルの画像・動画ファイルを管理するためのmacOSデスクトップアプリケーションです。

## 主な機能

- **メディアファイル管理**: ディレクトリをスキャンして画像・動画を一覧表示
- **動画対応**: MP4動画の再生、サムネイル表示、カスタムプレイヤー
- **メタデータ編集**: コメント、タグ、評価の追加・編集
- **お気に入り機能**: 画像・動画をお気に入りに登録して一覧表示
- **検索・フィルタリング**:
  - ファイル名による検索
  - ファイル種別フィルター（全て/画像のみ/動画のみ）
  - 評価フィルター（最低評価値の設定）
  - タグフィルター（AND/OR検索モード対応）
  - お気に入りのみ表示
- **ソート機能**: 名前、作成日時、評価による並び替え（昇順/降順）
- **ダークモード**: システム設定に応じた自動切り替え、手動トグル機能
- **レスポンシブ対応**: モバイル、タブレット、デスクトップに最適化されたUI（開発時のプレビューに対応）
- **スライドショー**: 自動再生、速度調整（3秒/5秒/10秒）、前後スキップ
- **データ永続化**: SQLiteによるメタデータ管理
- **エラーハンドリング**: メディアファイル読み込みエラーの適切な処理

## サポートフォーマット

### 画像
- JPG / JPEG
- PNG
- GIF
- WebP

### 動画
- MP4

## 技術スタック

### フロントエンド
- React 19.2.0
- TypeScript
- Vite 7
- Tailwind CSS v4 ⚠️ (v3とは構文が異なります - [CLAUDE.md](./CLAUDE.md)参照)
- Zustand (状態管理)
- React Router (ルーティング)
- lucide-react (アイコン)

### バックエンド
- Tauri v2 (Rustベースのデスクトップアプリフレームワーク)
- SQLite (tauri-plugin-sql)
- tauri-plugin-dialog (ディレクトリ選択)
- tauri-plugin-fs (ファイルシステムアクセス)

## 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- Rust（Tauriの依存）
- macOS（開発ターゲット）

### インストール

```bash
# 依存関係のインストール
npm install

# Tauriのセットアップ（初回のみ）
npm run tauri -- info
```

### 開発サーバーの起動

```bash
# フロントエンドとバックエンドを同時起動
npm run tauri:dev
```

### ビルド

```bash
# 本番用ビルド
npm run tauri:build
```

生成されたアプリケーションは `src-tauri/target/release/bundle/` に配置されます。

## プロジェクト構成

```
image-gallery/                     # リポジトリルート
├── doc/                           # ドキュメント（プロジェクト計画・要件定義）
│   ├── 01_requirement             # 要件定義
│   ├── 02_mp4-support-plan        # Phase 1 実装プラン
│   └── 03_phase2-proposal         # Phase 2 開発提案
└── image-gallery/                 # アプリケーション本体
    ├── src/                       # React フロントエンドコード
    │   ├── components/            # UIコンポーネント
    │   │   ├── Header.tsx         # ヘッダー（ディレクトリ選択、統計表示）
    │   │   ├── ImageGrid.tsx      # グリッド表示
    │   │   ├── MediaCard.tsx      # メディアカード（画像/動画）
    │   │   ├── ImageDetail.tsx    # 詳細モーダル
    │   │   ├── VideoPlayer.tsx    # カスタム動画プレイヤー
    │   │   ├── SettingsModal.tsx  # 設定モーダル
    │   │   ├── SlideshowControls.tsx # スライドショーコントロール
    │   │   ├── ErrorBoundary.tsx  # エラーバウンダリ
    │   │   ├── EmptyState.tsx     # 空状態表示
    │   │   └── LoadingSpinner.tsx # ローディング表示
    │   ├── hooks/                 # カスタムフック
    │   │   └── useTheme.ts        # テーマ管理フック
    │   ├── store/                 # Zustand状態管理
    │   ├── types/                 # TypeScript型定義
    │   ├── utils/                 # ユーティリティ関数
    │   ├── App.tsx                # アプリケーションルート
    │   ├── index.css              # グローバルスタイル（Tailwind設定）
    │   └── main.tsx               # エントリーポイント
    ├── src-tauri/                 # Tauri バックエンドコード（Rust）
    │   ├── src/
    │   │   ├── main.rs            # エントリーポイント
    │   │   ├── commands.rs        # Tauriコマンド定義
    │   │   ├── db.rs              # データベース管理
    │   │   └── fs_utils.rs        # ファイルシステムユーティリティ
    │   └── tauri.conf.json        # Tauri設定
    ├── CLAUDE.md                  # Claude Code 開発ガイド
    └── README.md                  # このファイル
```

## 使い方

1. **ディレクトリを選択**: 「Select Directory」ボタンをクリックして、画像・動画が含まれるフォルダを選択
2. **メディアを閲覧**: グリッド表示で一覧を確認。動画には再生アイコンが表示されます
3. **詳細を表示**: メディアをクリックして詳細モーダルを開く
   - 画像: 高品質プレビュー表示
   - 動画: カスタムプレイヤーで再生（再生/一時停止、シーク、音量、フルスクリーン対応）
4. **メタデータを編集**: 詳細モーダルでコメント、タグ、評価を追加・編集
5. **ナビゲーション**: 前へ/次へボタンで他のメディアに移動

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev                # フロントエンドのみ
npm run tauri:dev          # フロントエンド + Tauri

# ビルド
npm run build              # フロントエンドビルド
npm run tauri:build        # アプリケーション全体のビルド

# リント
npm run lint               # ESLintチェック

# Tauriコマンド
npm run tauri -- [command] # Tauri CLIの実行
```

## データベース

アプリケーションはSQLiteを使用してメタデータを保存します。データベースファイルは以下の場所に作成されます：

```
~/Library/Application Support/com.imagegallery/gallery.db
```

**注意**: 旧バージョン（v0.1.0以前）では `~/.image_gallery/gallery.db` にデータベースが保存されていました。アプリケーションは初回起動時に自動的に新しい場所へ移行します。

### データベーススキーマ

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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### データベースのマイグレーション

アプリケーションは起動時に自動的にデータベースマイグレーションを実行します。新しいバージョンにアップデートした際、データベーススキーマが自動的に更新されます。

**マイグレーション履歴:**
- Version 1: 初期テーブル作成
- Version 2: `file_type`カラム追加（MP4動画対応）
- Version 3: `is_favorite`カラム追加（お気に入り機能）

### データベースのバックアップ

データベースファイルを手動でバックアップできます：

```bash
# バックアップ作成
cp ~/Library/Application\ Support/com.imagegallery/gallery.db ~/Library/Application\ Support/com.imagegallery/gallery.db.backup

# バックアップから復元
cp ~/Library/Application\ Support/com.imagegallery/gallery.db.backup ~/Library/Application\ Support/com.imagegallery/gallery.db
```

### データベースのリセット

データベースをクリーンな状態にリセットする場合：

```bash
# 1. アプリケーションを終了

# 2. データベースファイルを削除
rm ~/Library/Application\ Support/com.imagegallery/gallery.db

# 3. アプリケーションを再起動
# 起動時に最新のスキーマで新しいデータベースが自動作成されます
```

**注意**: データベースを削除すると、すべてのメタデータ（コメント、タグ、評価）が失われます。必要に応じて事前にバックアップを作成してください。

## トラブルシューティング

### Tailwind CSSのスタイルが効かない

**症状**: ボタンの色やダークモードが正しく表示されない

**原因**: `src/index.css` に不要なグローバルスタイルが混入している可能性

**解決方法**:
- [CLAUDE.md](./CLAUDE.md) のトラブルシューティングセクションを参照
- `src/index.css` は以下の構造であるべき：
  ```css
  @import "tailwindcss";

  @theme {
    /* 色パレット定義 */
  }

  @variant dark (&:where(.dark, .dark *));

  body {
    margin: 0;
  }
  ```

### 「no such column: file_type」エラーが発生する

**症状**: ディレクトリを選択すると「error returned from database: (code: 1) no such column: file_type」というエラーが表示される

**原因**: 古いバージョンのアプリケーションで作成されたデータベースを使用しているため、`file_type`カラムが存在しない

**解決方法**:

```bash
# 1. アプリケーションを終了

# 2. （オプション）既存データをバックアップ
cp ~/Library/Application\ Support/com.imagegallery/gallery.db ~/Library/Application\ Support/com.imagegallery/gallery.db.backup

# 3. データベースを削除
rm ~/Library/Application\ Support/com.imagegallery/gallery.db

# 4. アプリケーションを再起動
# 新しいスキーマでデータベースが再作成されます
```

**注意**: 旧バージョン（v0.1.0以前）を使用していた場合、データベースは `~/.image_gallery/gallery.db` にあります。新バージョンでは自動的に新しい場所へ移行されます。

### 動画のサムネイルが表示されない

**症状**: MP4ファイルがグリッド表示で黒い画面や空白として表示される

**解決方法**:
- アプリケーションを最新バージョンにアップデートしてください
- 動画ファイルが破損していないか確認してください
- 動画形式がMP4であることを確認してください（他の形式は現在サポートされていません）

### アプリケーションが起動しない

**解決方法**:
1. データベースファイルを一時的に移動して起動を試みる：
   ```bash
   mv ~/Library/Application\ Support/com.imagegallery/gallery.db ~/Library/Application\ Support/com.imagegallery/gallery.db.old
   ```
2. 旧場所のデータベースファイルも確認：
   ```bash
   # 旧場所にファイルが残っている場合は削除
   rm ~/.image_gallery/gallery.db
   ```
3. ログを確認する（開発モードで実行）：
   ```bash
   npm run tauri:dev
   ```

## 開発者向け情報

### Claude Codeでの開発

このプロジェクトはClaude Codeでの開発に最適化されています。開発を始める前に **[CLAUDE.md](./CLAUDE.md)** を必ずお読みください。

**CLAUDE.mdの内容:**
- プロジェクト構造の詳細説明
- Tailwind CSS v4の重要な注意点
- ダークモード対応のガイドライン
- コーディング規約
- 開発ワークフロー
- トラブルシューティング
- Claude Codeとの協働のコツ

### 開発ワークフロー

```bash
# 1. mainブランチから最新を取得
git checkout main && git pull

# 2. featureブランチを作成
git checkout -b feature/new-feature-name

# 3. 開発
npm run dev  # または npm run tauri:dev

# 4. コミット（Conventional Commits形式）
git commit -m "feat: 新機能の説明

詳細な説明...

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 5. プッシュ & PR作成
git push -u origin feature/new-feature-name
gh pr create --title "タイトル" --body "説明" --base main
```

### コミットメッセージ規約

- `feat:` - 新機能
- `fix:` - バグ修正
- `docs:` - ドキュメント更新
- `style:` - スタイル修正
- `refactor:` - リファクタリング
- `test:` - テスト追加・修正
- `chore:` - ビルドプロセス、補助ツールの変更

詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。

**貢献する前に:**
1. [CLAUDE.md](./CLAUDE.md) を読んで、プロジェクトの構造とコーディング規約を理解してください
2. 大きな変更の場合は、まずIssueを作成して議論することを推奨します
3. コミットメッセージはConventional Commits形式に従ってください
4. ダークモード対応とレスポンシブ対応を忘れずに実装してください

## 今後の予定

- 他の動画フォーマット対応（MOV, AVI, MKVなど）
- 動画サムネイル生成機能
- キーボードショートカット
- 画像編集機能（回転、トリミング）
