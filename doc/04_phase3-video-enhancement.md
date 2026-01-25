# Phase 3: 動画機能強化 実装プラン

## 📋 概要

**目的**: MP4に加えてWebM・MOVフォーマット対応、動画メタデータ抽出、サムネイル生成機能を実装し、動画管理機能を大幅に強化する。

**実装範囲**: ステップ1-4（コア機能）
- ✅ ステップ1: ffmpeg基盤構築
- ✅ ステップ2: WebM/MOV対応
- ✅ ステップ3: 動画メタデータ抽出
- ✅ ステップ4: サムネイル生成

**実装時間**: 10-15時間（2-3日間）

**前提条件**: ユーザーがHomebrew経由で `brew install ffmpeg` を実行済み

---

## 🎯 実装ステップ

### ステップ1: ffmpeg基盤構築（2-3時間）

**目的**: ffmpegバイナリの検出と基本的な実行環境を整備

**タスク**:
1. 新規モジュール `src-tauri/src/video_utils.rs` を作成
2. ffmpegバイナリパス検出ロジック実装
3. ffmpegバージョン確認コマンド実装
4. フロントエンドでffmpeg状態を表示

**実装内容**:

#### 1.1 `src-tauri/src/video_utils.rs` 新規作成

```rust
use std::path::PathBuf;
use std::process::Command;

/// ffmpegバイナリのパスを検出
pub fn find_ffmpeg() -> Option<PathBuf> {
    // 1. PATH環境変数から検索
    if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Some(PathBuf::from(path));
        }
    }

    // 2. 標準的なインストール場所をチェック
    let standard_paths = vec![
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ];

    for path in standard_paths {
        if PathBuf::from(path).exists() {
            return Some(PathBuf::from(path));
        }
    }

    None
}

/// ffmpegが利用可能かチェック
#[tauri::command]
pub fn check_ffmpeg_available() -> Result<String, String> {
    match find_ffmpeg() {
        Some(path) => {
            // バージョン情報取得
            let output = Command::new(&path)
                .arg("-version")
                .output()
                .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

            let version = String::from_utf8_lossy(&output.stdout);
            let first_line = version.lines().next().unwrap_or("Unknown version");

            Ok(format!("FFmpeg found: {} ({})", path.display(), first_line))
        },
        None => Err("FFmpeg not found. Please install via Homebrew: brew install ffmpeg".to_string()),
    }
}
```

#### 1.2 `src-tauri/src/lib.rs` に追加

```rust
mod video_utils;

// invoke_handlerに追加
.invoke_handler(tauri::generate_handler![
    // 既存のコマンド...
    video_utils::check_ffmpeg_available,
])
```

#### 1.3 `src/utils/tauri-commands.ts` にコマンド追加

```typescript
export async function checkFFmpegAvailable(): Promise<string> {
  return invoke<string>('check_ffmpeg_available');
}
```

#### 1.4 `src/components/Header.tsx` にffmpegチェック追加

```typescript
import { checkFFmpegAvailable } from '../utils/tauri-commands';

// Header関数内
useEffect(() => {
  checkFFmpegAvailable()
    .then((msg) => console.log('[FFmpeg]', msg))
    .catch((err) => console.warn('[FFmpeg] Not available:', err));
}, []);
```

**確認項目**:
- [ ] ffmpegインストール済み環境で正常にパス検出
- [ ] ffmpegなし環境でエラーメッセージ表示
- [ ] コンソールにffmpegバージョン情報が出力される

---

### ステップ2: WebM/MOV対応（1-2時間）

**目的**: MP4以外のフォーマットをスキャン・表示可能にする

**タスク**:
1. `VIDEO_EXTENSIONS` にwebm, movを追加
2. エラーハンドリング強化

**実装内容**:

#### 2.1 `src-tauri/src/fs_utils.rs` の変更

```rust
/// 動画ファイルの拡張子リスト
const VIDEO_EXTENSIONS: &[&str] = &["mp4", "webm", "mov"];
```

#### 2.2 `src/components/MediaCard.tsx` のエラー表示改善

```typescript
{hasError ? (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-300 dark:bg-gray-600">
    <AlertCircle className="w-12 h-12 text-gray-500 dark:text-gray-400 mb-2" />
    <p className="text-xs text-gray-600 dark:text-gray-300 text-center px-2">
      {isVideo ? 'Unsupported video format' : 'Image load error'}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {media.file_name.split('.').pop()?.toUpperCase()}
    </p>
  </div>
) : ...}
```

**確認項目**:
- [ ] WebMファイルがスキャンされる
- [ ] MOVファイルがスキャンされる
- [ ] 各フォーマットがグリッドに表示される
- [ ] 非対応コーデックで適切なエラー表示

---

### ステップ3: 動画メタデータ抽出（3-4時間）

**目的**: 動画の長さ、解像度、コーデック情報を取得してDBに保存

**タスク**:
1. データベースマイグレーション v4追加
2. ffprobeラッパー実装
3. スキャン時のメタデータ抽出
4. UIでのメタデータ表示

**実装内容**:

#### 3.1 `src-tauri/src/db.rs` - Migration v4追加

`get_migrations()` 関数の `vec![]` 内に以下を追加：

```rust
Migration {
    version: 4,
    description: "add_video_metadata_columns",
    sql: "
        ALTER TABLE images ADD COLUMN duration_seconds REAL;
        ALTER TABLE images ADD COLUMN width INTEGER;
        ALTER TABLE images ADD COLUMN height INTEGER;
        ALTER TABLE images ADD COLUMN video_codec TEXT;
        ALTER TABLE images ADD COLUMN audio_codec TEXT;
        ALTER TABLE images ADD COLUMN thumbnail_path TEXT;

        CREATE INDEX IF NOT EXISTS idx_duration ON images(duration_seconds);
        CREATE INDEX IF NOT EXISTS idx_resolution ON images(width, height);
    ",
    kind: MigrationKind::Up,
}
```

#### 3.2 `src-tauri/src/video_utils.rs` - メタデータ抽出関数追加

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration_seconds: f64,
    pub width: i32,
    pub height: i32,
    pub video_codec: String,
    pub audio_codec: Option<String>,
}

/// ffprobeで動画メタデータを取得
pub fn extract_video_metadata(video_path: &str) -> Result<VideoMetadata, String> {
    let ffmpeg_path = find_ffmpeg()
        .ok_or("FFmpeg not found")?;

    let ffprobe_path = ffmpeg_path
        .parent()
        .unwrap()
        .join("ffprobe");

    if !ffprobe_path.exists() {
        return Err("ffprobe not found".to_string());
    }

    // ffprobeでJSON形式の情報取得
    let output = Command::new(ffprobe_path)
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe execution failed".to_string());
    }

    // JSONパース
    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    // ビデオストリーム取得
    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .ok_or("No video stream found")?;

    let audio_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "audio")
        });

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Duration not found")?;

    Ok(VideoMetadata {
        duration_seconds: duration,
        width: video_stream["width"].as_i64().unwrap_or(0) as i32,
        height: video_stream["height"].as_i64().unwrap_or(0) as i32,
        video_codec: video_stream["codec_name"].as_str().unwrap_or("unknown").to_string(),
        audio_codec: audio_stream.map(|s| s["codec_name"].as_str().unwrap_or("unknown").to_string()),
    })
}
```

#### 3.3 `src-tauri/src/commands.rs` - スキャン時にメタデータ統合

既存の `ImageFileInfo` 構造体に新しいフィールドを追加：

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageFileInfo {
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,

    // Phase 3追加
    pub duration_seconds: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}
```

`scan_directory` コマンドを変更：

```rust
#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<ImageFileInfo>, String> {
    let file_paths = crate::fs_utils::scan_images_in_directory(&path)?;

    let result: Vec<ImageFileInfo> = file_paths
        .into_iter()
        .map(|file_path| {
            let file_name = crate::fs_utils::get_file_name(&file_path);
            let file_type = crate::fs_utils::get_file_type(&file_path);

            // 動画の場合のみメタデータ抽出
            let metadata = if file_type == "video" {
                crate::video_utils::extract_video_metadata(&file_path).ok()
            } else {
                None
            };

            ImageFileInfo {
                file_path,
                file_name,
                file_type,
                duration_seconds: metadata.as_ref().map(|m| m.duration_seconds),
                width: metadata.as_ref().map(|m| m.width),
                height: metadata.as_ref().map(|m| m.height),
                video_codec: metadata.as_ref().map(|m| m.video_codec.clone()),
                audio_codec: metadata.as_ref().and_then(|m| m.audio_codec.clone()),
            }
        })
        .collect();

    Ok(result)
}
```

#### 3.4 `src/types/image.ts` - 型定義更新

```typescript
export interface ImageData {
  id: number;
  file_path: string;
  file_name: string;
  file_type: FileType;
  comment: string | null;
  tags: string[];
  rating: number;
  is_favorite: number;
  created_at: string;
  updated_at: string;

  // Phase 3 追加フィールド
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  thumbnail_path: string | null;
}
```

#### 3.5 `src/components/ImageDetail.tsx` - メタデータ表示追加

適切な位置（既存のメタデータセクションの後）に以下を追加：

```typescript
{/* 動画情報の表示 */}
{selectedImage.file_type === 'video' && (
  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
    <h3 className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200">
      Video Information
    </h3>
    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
      {selectedImage.duration_seconds && (
        <p>
          <span className="font-medium">Duration:</span>{' '}
          {formatDuration(selectedImage.duration_seconds)}
        </p>
      )}
      {selectedImage.width && selectedImage.height && (
        <p>
          <span className="font-medium">Resolution:</span>{' '}
          {selectedImage.width}x{selectedImage.height}
        </p>
      )}
      {selectedImage.video_codec && (
        <p>
          <span className="font-medium">Video Codec:</span>{' '}
          {selectedImage.video_codec.toUpperCase()}
        </p>
      )}
      {selectedImage.audio_codec && (
        <p>
          <span className="font-medium">Audio Codec:</span>{' '}
          {selectedImage.audio_codec.toUpperCase()}
        </p>
      )}
    </div>
  </div>
)}
```

ファイルの最後にヘルパー関数を追加：

```typescript
// 秒数をmm:ss形式にフォーマット
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**確認項目**:
- [ ] マイグレーションが正常に実行される
- [ ] 動画スキャン時にメタデータが抽出される
- [ ] 詳細モーダルにメタデータが表示される
- [ ] 画像ファイルではメタデータがnull

---

### ステップ4: サムネイル生成機能（4-5時間）

**目的**: 動画の事前サムネイルを生成してグリッド表示を高速化

**タスク**:
1. サムネイルディレクトリ作成
2. ffmpegでサムネイル画像生成
3. サムネイルパスをDBに保存
4. MediaCardでサムネイル表示

**実装内容**:

#### 4.1 `src-tauri/src/video_utils.rs` - サムネイル生成関数追加

```rust
use std::fs;

/// サムネイルディレクトリを取得（なければ作成）
pub fn get_thumbnail_dir() -> Result<PathBuf, String> {
    let db_path = crate::db::get_db_path()?;
    let thumbnail_dir = db_path
        .parent()
        .ok_or("Failed to get db directory")?
        .join("thumbnails");

    fs::create_dir_all(&thumbnail_dir)
        .map_err(|e| format!("Failed to create thumbnail directory: {}", e))?;

    Ok(thumbnail_dir)
}

/// 動画のサムネイルを生成
pub fn generate_thumbnail(
    video_path: &str,
    image_id: i64,
    timestamp_seconds: f64,
) -> Result<String, String> {
    let ffmpeg_path = find_ffmpeg()
        .ok_or("FFmpeg not found")?;

    let thumbnail_dir = get_thumbnail_dir()?;
    let thumbnail_path = thumbnail_dir.join(format!("{}.jpg", image_id));

    // サムネイルが既に存在する場合はスキップ
    if thumbnail_path.exists() {
        return Ok(thumbnail_path.to_string_lossy().to_string());
    }

    // ffmpegコマンド実行
    let output = Command::new(ffmpeg_path)
        .args(&[
            "-ss", &timestamp_seconds.to_string(),  // 指定秒数にシーク
            "-i", video_path,                       // 入力ファイル
            "-vframes", "1",                        // 1フレームのみ
            "-vf", "scale=400:400:force_original_aspect_ratio=decrease", // リサイズ
            "-q:v", "2",                            // JPEG品質（1-31, 低いほど高品質）
            thumbnail_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg thumbnail generation failed: {}", error));
    }

    Ok(thumbnail_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_video_thumbnail(
    video_path: String,
    image_id: i64,
) -> Result<String, String> {
    // 動画の3秒目からサムネイル生成（冒頭は黒画面が多いため）
    generate_thumbnail(&video_path, image_id, 3.0)
}
```

#### 4.2 `src-tauri/src/lib.rs` にコマンド追加

```rust
.invoke_handler(tauri::generate_handler![
    // 既存...
    video_utils::check_ffmpeg_available,
    video_utils::generate_video_thumbnail,
])
```

#### 4.3 `src/utils/tauri-commands.ts` にコマンド追加

```typescript
export async function generateVideoThumbnail(
  videoPath: string,
  imageId: number
): Promise<string> {
  return invoke<string>('generate_video_thumbnail', {
    videoPath,
    imageId,
  });
}
```

#### 4.4 `src/components/MediaCard.tsx` - サムネイル遅延生成

ファイル冒頭のimportに追加：

```typescript
import { useEffect } from 'react';
import { generateVideoThumbnail } from '../utils/tauri-commands';
```

コンポーネント内に状態を追加：

```typescript
const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
```

`return`の直前にuseEffectを追加：

```typescript
useEffect(() => {
  // 動画の場合、サムネイル生成
  if (isVideo && !thumbnailUrl && !isGeneratingThumbnail) {
    setIsGeneratingThumbnail(true);

    generateVideoThumbnail(media.file_path, media.id)
      .then((path) => {
        const url = convertFileSrc(path, 'asset');
        setThumbnailUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate thumbnail:', err);
        // フォールバック: videoタグ使用
      })
      .finally(() => {
        setIsGeneratingThumbnail(false);
      });
  }
}, [isVideo, media.id, media.file_path, thumbnailUrl, isGeneratingThumbnail]);
```

動画表示部分を変更（既存の`isVideo ? (...) : (...)` ブロック内）：

```typescript
isVideo ? (
  <>
    {thumbnailUrl ? (
      // サムネイル画像表示
      <img
        src={thumbnailUrl}
        alt={media.file_name}
        className="w-full h-full object-cover pointer-events-none"
        onError={() => setHasError(true)}
      />
    ) : isGeneratingThumbnail ? (
      // 生成中のローディング表示
      <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    ) : (
      // フォールバック: videoタグ（既存実装）
      <video
        src={`${mediaUrl}#t=0.1`}
        className="w-full h-full object-cover pointer-events-none"
        preload="metadata"
        muted
        onError={() => setHasError(true)}
      />
    )}

    {/* 再生アイコンオーバーレイ（既存） */}
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
      <div className="bg-white/90 rounded-full p-3">
        <Play className="w-8 h-8 text-gray-800" fill="currentColor" />
      </div>
    </div>
  </>
) : (
  // 画像表示（既存）
  ...
)
```

**確認項目**:
- [ ] サムネイルディレクトリが作成される（`~/Library/Application Support/com.imagegallery/thumbnails/`）
- [ ] 動画のサムネイルが生成される
- [ ] サムネイルがグリッドに表示される
- [ ] 2回目以降は既存サムネイルを使用（再生成しない）
- [ ] サムネイル生成失敗時はvideoタグフォールバック

---

## 📁 修正が必要なファイル一覧

### 新規作成
- `src-tauri/src/video_utils.rs` - 動画処理ユーティリティ（ffmpeg統合、メタデータ抽出、サムネイル生成）

### 変更
1. `src-tauri/src/lib.rs` - video_utilsモジュール追加、Tauriコマンド登録
2. `src-tauri/src/fs_utils.rs` - VIDEO_EXTENSIONSにwebm, mov追加
3. `src-tauri/src/db.rs` - Migration v4追加（動画メタデータカラム）
4. `src-tauri/src/commands.rs` - ImageFileInfo構造体拡張、scan_directoryでメタデータ抽出
5. `src/types/image.ts` - ImageData型に動画メタデータフィールド追加
6. `src/utils/tauri-commands.ts` - checkFFmpegAvailable, generateVideoThumbnail追加
7. `src/components/MediaCard.tsx` - サムネイル遅延生成、エラー表示改善
8. `src/components/ImageDetail.tsx` - 動画メタデータ表示セクション追加
9. `src/components/Header.tsx` - ffmpegチェック追加（初回マウント時）

---

## ✅ テスト計画

### 機能テスト

#### ステップ1: ffmpeg基盤
- [ ] ffmpegインストール済み環境で正常にパス検出
- [ ] ffmpegなし環境で適切なエラーメッセージ
- [ ] コンソールにバージョン情報表示

#### ステップ2: フォーマット対応
- [ ] MP4, WebM, MOVファイルがスキャンされる
- [ ] グリッドに各フォーマットが表示される
- [ ] 非対応コーデックで適切なエラー表示

#### ステップ3: メタデータ抽出
- [ ] 動画スキャン時にメタデータが抽出される
- [ ] データベースに正しく保存される
- [ ] 詳細モーダルで情報が表示される
  - 動画の長さ（mm:ss形式）
  - 解像度（幅x高さ）
  - ビデオコーデック
  - オーディオコーデック

#### ステップ4: サムネイル生成
- [ ] サムネイルディレクトリが自動作成される
- [ ] 初回表示でサムネイル生成
- [ ] グリッドに高速表示される
- [ ] 2回目表示ではキャッシュ使用（再生成しない）
- [ ] 生成失敗時にvideoタグフォールバック

### エッジケーステスト
- [ ] 破損した動画ファイルでクラッシュしない
- [ ] 極端に短い動画（1秒未満）で正常動作
- [ ] 大きな動画ファイル（1GB以上）で処理完了
- [ ] サムネイル生成中にアプリ終了しても次回再試行

### パフォーマンステスト
- [ ] 50本の動画を含むディレクトリで30秒以内にスキャン完了
- [ ] サムネイル生成時間が1本あたり3秒以内
- [ ] メモリ使用量が500MB以下

---

## ⚠️ 注意事項

### 1. ffmpegのインストール

**必須**: ユーザーは事前にffmpegをインストールする必要があります。

```bash
brew install ffmpeg
```

インストール確認：

```bash
ffmpeg -version
```

ffmpegがない場合、以下の機能が制限されます：
- ✅ 動画の再生は可能（HTML5 videoタグ）
- ❌ サムネイル生成不可（videoタグのフォールバック表示）
- ❌ メタデータ抽出不可（長さ・解像度などの情報なし）

### 2. サムネイル保存場所

```
~/Library/Application Support/com.imagegallery/
  ├── gallery.db
  └── thumbnails/
      ├── 1.jpg
      ├── 2.jpg
      └── ...
```

- サムネイルはアプリデータディレクトリに永続化
- 削除する場合は手動で`thumbnails/`フォルダを削除

### 3. 対応コーデック

HTML5 `<video>` タグでネイティブ再生可能なコーデック：
- **MP4**: H.264 (video) + AAC (audio)
- **WebM**: VP8/VP9 (video) + Vorbis/Opus (audio)
- **MOV**: H.264 (video) + AAC (audio) ※Safariのみ完全対応

非対応コーデックは「Unsupported video format」エラー表示。

### 4. データベースマイグレーション

- Migration v4は自動実行（アプリ起動時）
- 既存データに影響なし（新しいカラムは全てNULL許容）
- ロールバック不要（Phase 3機能は追加のみ）

### 5. パフォーマンス考慮事項

- **メタデータ抽出**: スキャン時に同期実行（動画数が多いと時間がかかる）
- **サムネイル生成**: 遅延生成（on-demand）で初回表示時に生成
- 将来の改善案（Phase 4）:
  - バックグラウンドワーカーでバッチ生成
  - プログレス表示

---

## 📚 参考リンク

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [ffprobe JSON Output](https://ffmpeg.org/ffprobe.html#json)
- [HTML5 Video Browser Support](https://caniuse.com/video)
- [Tauri Asset Protocol](https://v2.tauri.app/reference/javascript/api/namespacecore/#convertfilesrc)

---

## 🚀 実装後の確認チェックリスト

### コア機能
- [ ] MP4, WebM, MOVがスキャンされる
- [ ] 動画のサムネイルが生成される
- [ ] 動画メタデータが表示される
- [ ] ffmpeg未インストール時にエラーハンドリング

### データベース
- [ ] Migration v4が正常に実行される
- [ ] 既存データが保持される
- [ ] 新しいカラムが追加される

### UI/UX
- [ ] グリッド表示が高速
- [ ] 詳細モーダルで動画情報が見やすい
- [ ] エラー時に適切なメッセージ表示

### ドキュメント
- [ ] README.mdに動画対応を記載
- [ ] FFmpegインストール手順を追加
- [ ] CLAUDE.mdにPhase 3実装内容を追記

---

## 次フェーズの候補（Phase 4）

ステップ1-4完了後、必要に応じて以下を検討：

- **UI/UX改善**（旧ステップ5）: 動画フィルター、統計表示、動画長さバッジ
- **エラーハンドリング強化**（旧ステップ6）: ffmpeg警告バナー、リトライロジック
- **バッチサムネイル生成**: バックグラウンドワーカーで全動画を並列処理
- **追加フォーマット対応**: AVI, MKV（トランスコード必要）
- **動画編集機能**: トリミング、GIF変換
