---
description: Rust/Tauri/SQLiteのバックエンド規約
globs:
  - "src-tauri/**/*.rs"
  - "src-tauri/Cargo.toml"
---

# バックエンド規約（Rust / Tauri v2 / SQLite）

## アーキテクチャ

```
commands.rs  → API層（Tauriコマンド + バリデーション）
db.rs        → DB初期化・マイグレーション・パス管理
fs_utils.rs  → ファイルシステム操作（スキャン、拡張子判定）
video_utils.rs → ffmpeg連携（メタデータ抽出、サムネイル生成）
lib.rs       → プラグイン初期化・コマンド登録
main.rs      → エントリーポイント（lib::run()呼び出しのみ）
```

## 新しいTauriコマンド追加手順
1. `commands.rs` に `#[tauri::command]` 関数を追加
2. `lib.rs` の `invoke_handler` にコマンド名を登録
3. `src/utils/tauri-commands.ts` にフロントエンド用ラッパーを追加

## データベース

### スキーマ（imagesテーブル）
```sql
CREATE TABLE images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_type TEXT DEFAULT 'image',  -- 'image' | 'video'
    comment TEXT,
    tags TEXT,                        -- JSON配列
    rating INTEGER DEFAULT 0,         -- 0-5
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    -- 動画メタデータ（Migration v4）
    duration_seconds REAL,
    width INTEGER, height INTEGER,
    video_codec TEXT, audio_codec TEXT,
    thumbnail_path TEXT
);
```

### DB操作ルール
- マイグレーションは `db.rs` の `get_migrations()` に追加（自動実行）
- DBパス: `~/Library/Application Support/com.imagegallery/gallery.db`
- 複数の書き込みはトランザクション内で実行
- エラーは `Result<T, String>` で返し、フロントエンドで表示

## バリデーション
- `commands.rs` にバリデーション関数を定義
- 入力値は必ずコマンド層でバリデーション
- 既存パターン: `validate_group_name()`, `validate_color()`, `validate_comment()` 等

## ファイルシステム
- 対応形式: 画像（jpg, jpeg, png, gif, webp）、動画（mp4, webm, mov）
- `fs_utils.rs` の `get_file_type()` で判定
- ディレクトリスキャンは `walkdir` クレートを使用

## ffmpeg連携
- `video_utils.rs` で ffprobe/ffmpeg を呼び出し
- ffmpegパス検出: `which`, `/opt/homebrew/bin`, `/usr/local/bin`
- サムネイル生成: 3秒地点、JPEG品質2
