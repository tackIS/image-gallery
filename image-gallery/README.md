# Image Gallery Manager

ローカルの画像・動画ファイルを管理するためのmacOSデスクトップアプリケーションです。

## 主な機能

- **メディアファイル管理**: ディレクトリをスキャンして画像・動画を一覧表示
- **動画対応**: MP4動画の再生、サムネイル表示、カスタムプレイヤー
- **メタデータ編集**: コメント、タグ、評価の追加・編集
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
- Tailwind CSS
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
image-gallery/
├── src/                      # React フロントエンドコード
│   ├── components/           # UIコンポーネント
│   │   ├── Header.tsx        # ヘッダー（ディレクトリ選択、統計表示）
│   │   ├── ImageGrid.tsx     # グリッド表示
│   │   ├── MediaCard.tsx     # メディアカード（画像/動画）
│   │   ├── ImageDetail.tsx   # 詳細モーダル
│   │   ├── VideoPlayer.tsx   # カスタム動画プレイヤー
│   │   ├── EmptyState.tsx    # 空状態表示
│   │   └── LoadingSpinner.tsx# ローディング表示
│   ├── store/                # Zustand状態管理
│   ├── types/                # TypeScript型定義
│   ├── utils/                # ユーティリティ関数
│   └── App.tsx               # アプリケーションルート
├── src-tauri/                # Tauri バックエンドコード（Rust）
│   ├── src/
│   │   ├── main.rs           # エントリーポイント
│   │   ├── commands.rs       # Tauriコマンド定義
│   │   ├── db.rs             # データベース管理
│   │   └── fs_utils.rs       # ファイルシステムユーティリティ
│   └── tauri.conf.json       # Tauri設定
└── doc/                      # ドキュメント
    └── requirement.md        # 要件定義
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
~/Library/Application Support/com.imagegallery.app/image_gallery.db
```

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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 今後の予定

- 他の動画フォーマット対応（MOV, AVI, MKVなど）
- ファイル種別によるフィルタリング機能
- 動画サムネイル生成機能
- タグによる検索・フィルタリング
- 評価によるソート機能
