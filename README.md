# Image Gallery Manager

ローカルの画像・動画ファイルを管理するためのmacOSデスクトップアプリケーションです。

## 主な機能

- **メディアファイル管理**: ディレクトリをスキャンして画像・動画を一覧表示
- **動画対応**: MP4/WebM/MOV動画の再生、自動サムネイル生成、メタデータ抽出（長さ・解像度・コーデック情報）、カスタムプレイヤー
- **メタデータ編集**: コメント、タグ（オートコンプリート付き）、評価の追加・編集
- **お気に入り機能**: 画像・動画をお気に入りに登録して一覧表示
- **検索・フィルタリング**:
  - ファイル名による検索
  - ファイル種別フィルター（全て/画像のみ/動画のみ）
  - 評価フィルター（最低評価値の設定）
  - タグフィルター（AND/OR検索モード対応）
  - お気に入りのみ表示
- **表示モード**: グリッド / リスト / タイムライン（年月別グルーピング）、グリッド密度設定（compact/normal/comfortable）
- **仮想スクロール**: 大量の画像・動画でも快適に閲覧（VirtualGrid / VirtualList）
- **ソート機能**: 名前、作成日時、評価による並び替え（昇順/降順）
- **グループ管理**: グループの作成/編集/削除、画像の複数選択→グループ追加、代表画像設定、D&Dによる並べ替え
- **グループアルバムビュー**: グループ内の画像一覧表示、コメント機能
- **マルチディレクトリ管理**: 複数ディレクトリの追加/削除/有効無効切替/リスキャン、ファイルウォッチャーによる自動検出
- **Undo/Redo**: メタデータ編集操作の取り消し・やり直し
- **エクスポート/インポート**: メタデータのJSON/CSV形式でのエクスポート、JSONからのインポート
- **スライドショー**: 自動再生、速度調整（3秒/5秒/10秒）、前後スキップ
- **ダークモード**: システム設定に応じた自動切り替え、手動トグル機能
- **レスポンシブ対応**: モバイル、タブレット、デスクトップに最適化されたUI
- **データ永続化**: SQLiteによるメタデータ管理
- **テスト基盤**: Vitest + React Testing Library によるユニットテスト

## サポートフォーマット

### 画像
- JPG / JPEG
- PNG
- GIF
- WebP

### 動画
- MP4
- WebM
- MOV

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
- ffmpeg/ffprobe (動画メタデータ抽出、サムネイル生成)

### テスト
- Vitest (テストランナー)
- React Testing Library (コンポーネントテスト)
- happy-dom (ブラウザ環境)

詳細なアーキテクチャについては [doc/architecture.md](./doc/architecture.md) を参照してください。

## 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- Rust（Tauriの依存）
- macOS（開発ターゲット）
- ffmpeg（動画メタデータ抽出とサムネイル生成に必要）

#### ffmpegのインストール

```bash
# Homebrewでインストール
brew install ffmpeg

# インストール確認
ffmpeg -version
```

**注意**: ffmpegがインストールされていない場合、動画は再生できますが、サムネイル生成とメタデータ抽出（長さ・解像度・コーデック情報）が利用できません。

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
├── doc/                           # ドキュメント
│   ├── architecture.md            # アーキテクチャ概要
│   ├── er-diagram.md              # ER図（Mermaid）
│   └── commands-reference.md      # Tauriコマンドリファレンス
├── src/                           # React フロントエンドコード
│   ├── __mocks__/                 # Tauriモック（テスト用）
│   ├── components/                # UIコンポーネント
│   │   ├── detail/                # 詳細表示関連
│   │   │   ├── ImageViewer        # 画像・動画ビューア
│   │   │   ├── MetadataPanel      # メタデータ編集パネル
│   │   │   ├── TagAutocomplete    # タグオートコンプリート
│   │   │   └── RatingStars        # 評価星
│   │   ├── grid/                  # グリッド・リスト表示
│   │   │   ├── VirtualGrid        # 仮想スクロールグリッド
│   │   │   ├── VirtualList        # 仮想スクロールリスト
│   │   │   ├── TimelineView       # タイムラインビュー
│   │   │   └── ListItem           # リスト項目
│   │   ├── header/                # ヘッダー関連
│   │   │   ├── SearchBar          # 検索バー
│   │   │   ├── FilterPanel        # フィルターパネル
│   │   │   ├── SortControls       # ソートコントロール
│   │   │   └── ViewModeToggle     # 表示モード切替
│   │   ├── directory/             # ディレクトリ管理
│   │   │   ├── DirectoryManager   # ディレクトリ管理パネル
│   │   │   └── DirectoryItem      # ディレクトリ項目
│   │   ├── dnd/                   # ドラッグ&ドロップ
│   │   │   ├── DndProvider        # D&Dプロバイダー
│   │   │   └── DragOverlay        # ドラッグオーバーレイ
│   │   ├── settings/              # 設定関連
│   │   │   ├── ExportSection      # エクスポート
│   │   │   └── ImportSection      # インポート
│   │   ├── Header                 # ヘッダー
│   │   ├── Sidebar                # サイドバー
│   │   ├── MainGallery            # メインギャラリー
│   │   ├── ImageGrid              # メディアグリッド
│   │   ├── MediaCard              # メディアカード
│   │   ├── ImageDetail            # 詳細モーダル
│   │   ├── VideoPlayer            # カスタム動画プレイヤー
│   │   ├── GroupModal             # グループ作成・編集モーダル
│   │   ├── GroupAlbumView         # グループアルバムビュー
│   │   ├── GroupItem              # グループ項目
│   │   ├── GroupComments          # グループコメント
│   │   ├── AlbumHeader            # アルバムヘッダー
│   │   ├── Breadcrumb             # パンくずナビ
│   │   ├── SelectionBar           # 選択モードバー
│   │   ├── UndoRedoBar            # Undo/Redoバー
│   │   ├── Toast                  # トースト通知
│   │   ├── SettingsModal          # 設定モーダル
│   │   ├── SlideshowControls      # スライドショーコントロール
│   │   ├── ErrorBoundary          # エラーバウンダリ
│   │   ├── EmptyState             # 空状態表示
│   │   └── LoadingSpinner         # ローディング表示
│   ├── hooks/                     # カスタムフック
│   │   └── useTheme               # テーマ管理フック
│   ├── store/                     # Zustand状態管理
│   │   └── __tests__/             # ストアテスト
│   ├── types/                     # TypeScript型定義
│   ├── utils/                     # ユーティリティ関数
│   │   └── tauri-commands         # Tauri APIラッパー
│   ├── App                        # アプリケーションルート
│   ├── index                      # グローバルスタイル（Tailwind設定）
│   └── main                       # エントリーポイント
├── src-tauri/                     # Tauri バックエンドコード（Rust）
│   ├── src/
│   │   ├── main                   # エントリーポイント
│   │   ├── lib                    # プラグイン初期化・コマンド登録
│   │   ├── commands               # Tauriコマンド定義
│   │   ├── db                     # データベース管理・マイグレーション
│   │   ├── fs_utils               # ファイルシステムユーティリティ
│   │   ├── video_utils            # 動画処理（ffmpeg統合）
│   │   └── watcher                # ファイルウォッチャー
│   └── tauri.conf                 # Tauri設定
├── CLAUDE                         # Claude Code 開発ガイド
├── README                         # このファイル
├── package.json                   # npm設定
├── vite.config                    # Vite設定
└── vitest.setup                   # テストセットアップ
```

## 使い方

### 基本操作

1. **ディレクトリを追加**: サイドバーの「ディレクトリ追加」ボタンから画像・動画が含まれるフォルダを選択
2. **メディアを閲覧**: グリッド/リスト/タイムラインビューで一覧を確認
3. **詳細を表示**: メディアをクリックして詳細モーダルを開く
   - 画像: 高品質プレビュー表示
   - 動画: カスタムプレイヤーで再生（再生/一時停止、シーク、音量、フルスクリーン対応）
4. **メタデータを編集**: 詳細モーダルでコメント、タグ（オートコンプリート付き）、評価を追加・編集
5. **ナビゲーション**: 前へ/次へボタンで他のメディアに移動

### グループ管理

1. **グループ作成**: サイドバーの「+」ボタンからグループを作成（名前・色・説明を設定）
2. **画像をグループに追加**: 選択モードで画像を複数選択し、グループに追加
3. **アルバムビュー**: グループをクリックしてアルバムビューを開く
4. **代表画像設定**: アルバムビュー内で代表画像を設定
5. **コメント**: アルバムビューでグループにコメントを追加

### マルチディレクトリ管理

1. **ディレクトリ追加**: サイドバーのディレクトリ管理から複数のディレクトリを追加
2. **有効/無効切替**: ディレクトリごとに表示の有効/無効を切り替え
3. **リスキャン**: 個別または全ディレクトリを再スキャン
4. **ファイルウォッチャー**: ディレクトリ内のファイル変更を自動検出

### エクスポート/インポート

1. **エクスポート**: 設定 → エクスポートから JSON または CSV 形式で出力
2. **インポート**: 設定 → インポートから JSON ファイルを読み込み（メタデータとグループを復元）

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev                # フロントエンドのみ
npm run tauri:dev          # フロントエンド + Tauri

# ビルド
npm run build              # フロントエンドビルド
npm run tauri:build        # アプリケーション全体のビルド

# テスト
npm run test               # テスト実行
npm run test:watch         # ウォッチモード
npm run test:coverage      # カバレッジレポート

# リント・型チェック
npm run lint               # ESLintチェック
npx tsc --noEmit           # TypeScript型チェック

# Tauriコマンド
npm run tauri -- [command] # Tauri CLIの実行
```

## データベース

アプリケーションはSQLiteを使用してメタデータを保存します。データベースファイルは以下の場所に作成されます：

```
~/Library/Application Support/com.imagegallery/gallery.db
```

### データベース設計

6テーブル構成: `images`, `directories`, `groups`, `image_groups`, `group_comments`, `action_log`

詳細なER図とスキーマは [doc/er-diagram.md](./doc/er-diagram.md) を参照してください。

### マイグレーション履歴

アプリケーションは起動時に自動的にデータベースマイグレーションを実行します。

| Version | 説明 | Phase |
|---------|------|-------|
| v1 | 初期テーブル作成（images） | Phase 1 |
| v2 | `file_type` カラム追加（動画対応） | Phase 2 |
| v3 | `is_favorite` カラム追加（お気に入り機能） | Phase 2 |
| v4 | 動画メタデータカラム追加（duration, resolution, codecs, thumbnail） | Phase 3 |
| v5 | `groups` + `image_groups` テーブル追加（グループ管理） | Phase 4 |
| v6 | `group_comments` テーブル追加（コメント機能） | Phase 5 |
| v7 | `directories` + `action_log` テーブル追加、`images.directory_id` 追加 | Phase 6 |

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

**症状**: 動画ファイルがグリッド表示で黒い画面や空白として表示される

**解決方法**:
1. ffmpegがインストールされているか確認：
   ```bash
   ffmpeg -version
   ```
   インストールされていない場合：
   ```bash
   brew install ffmpeg
   ```
2. アプリケーションを再起動してサムネイルの自動生成を待つ
3. サムネイルが生成されない場合、設定から「Reset Database」を実行して再スキャン
4. 動画ファイルが破損していないか確認
5. サポートされているフォーマット（MP4/WebM/MOV）であることを確認

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

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [CLAUDE.md](./CLAUDE.md) | Claude Code 開発ガイド |
| [doc/architecture.md](./doc/architecture.md) | アーキテクチャ概要・システム構成図 |
| [doc/er-diagram.md](./doc/er-diagram.md) | ER図・マイグレーション履歴 |
| [doc/commands-reference.md](./doc/commands-reference.md) | 全Tauriコマンドリファレンス |

## 開発者向け情報

### Claude Codeでの開発

このプロジェクトはClaude Codeでの開発に最適化されています。開発を始める前に **[CLAUDE.md](./CLAUDE.md)** を必ずお読みください。

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
