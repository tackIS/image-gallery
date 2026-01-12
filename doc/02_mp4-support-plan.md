# MP4動画対応 実装プラン

## 概要
画像ギャラリーアプリに動画ファイル（MP4）のサポートを追加します。

## 目的
- 画像だけでなく動画ファイルも管理できるようにする
- 動画のサムネイル表示、再生、メタデータ編集を実装する
- 既存の画像機能との統一的なユーザー体験を提供する

## 最終的な成果物
1. MP4ファイルのスキャンと登録
2. グリッド表示での動画サムネイル表示（再生アイコン付き）
3. 詳細モーダルでの動画再生機能
4. 動画にもコメント・タグ・評価を付与可能

---

## ステップ1: データモデルの拡張

### 目的
画像と動画を区別できるようにデータベースとTypeScript型定義を拡張する。

### 実行内容

#### 1.1 データベースマイグレーション

**src-tauri/src/db.rs** にマイグレーションを追加:

```rust
pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_images_table",
            sql: "
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL UNIQUE,
                    file_name TEXT NOT NULL,
                    comment TEXT,
                    tags TEXT,
                    rating INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_file_path ON images(file_path);
                CREATE INDEX IF NOT EXISTS idx_file_name ON images(file_name);
            ",
            kind: MigrationKind::Up,
        },
        // 新しいマイグレーション: file_typeカラムを追加
        Migration {
            version: 2,
            description: "add_file_type_column",
            sql: "
                ALTER TABLE images ADD COLUMN file_type TEXT DEFAULT 'image';
                CREATE INDEX IF NOT EXISTS idx_file_type ON images(file_type);
            ",
            kind: MigrationKind::Up,
        }
    ]
}
```

**注意**: 既存のデータベースがある場合、file_typeカラムはデフォルト値 'image' で追加されます。

#### 1.2 TypeScript型定義の更新

**src/types/image.ts** を更新:

```typescript
/**
 * ファイルの種類を表す型
 */
export type FileType = 'image' | 'video';

/**
 * メディアファイルのメタデータを表すインターフェース
 * データベースから取得したファイル情報を格納します
 */
export interface ImageData {
  /** データベースの一意識別子 */
  id: number;
  /** ファイルの絶対パス */
  file_path: string;
  /** ファイル名 */
  file_name: string;
  /** ファイルの種類（image または video） */
  file_type: FileType;
  /** ユーザーが追加したコメント */
  comment: string | null;
  /** ファイルに関連付けられたタグの配列 */
  tags: string[];
  /** 0-5の評価値 */
  rating: number;
  /** レコード作成日時（ISO 8601形式） */
  created_at: string;
  /** レコード最終更新日時（ISO 8601形式） */
  updated_at: string;
}

// ImageMetadataUpdate と DirectoryInfo は変更なし
```

**注意**: 既存のコードとの後方互換性のため、インターフェース名は `ImageData` のまま維持します。将来的に `MediaData` にリネームすることも検討できます。

#### 1.3 Rust側の型定義更新

**src-tauri/src/commands.rs** に構造体を追加:

```rust
#[derive(Debug, serde::Serialize)]
pub struct ImageData {
    pub id: i64,
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub comment: Option<String>,
    pub tags: Vec<String>,
    pub rating: i32,
    pub created_at: String,
    pub updated_at: String,
}
```

### 確認項目
- [ ] アプリ起動時に新しいマイグレーションが実行される
- [ ] 既存のデータベースに `file_type` カラムが追加される
- [ ] 既存のレコードの `file_type` が 'image' になっている
- [ ] TypeScriptのコンパイルエラーがない

### 作成/変更されるファイル
- `src-tauri/src/db.rs`（マイグレーション追加）
- `src/types/image.ts`（FileType追加、ImageData更新）
- `src-tauri/src/commands.rs`（ImageData構造体更新）

---

## ステップ2: ファイルスキャン機能の拡張

### 目的
MP4ファイルもスキャン対象に含め、ファイル種別を判定してデータベースに登録する。

### 実行内容

#### 2.1 ファイル拡張子リストの更新

**src-tauri/src/fs_utils.rs** を更新:

```rust
use std::path::Path;
use walkdir::WalkDir;

/// 画像ファイルの拡張子リスト
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];

/// 動画ファイルの拡張子リスト
const VIDEO_EXTENSIONS: &[&str] = &["mp4"];

/// すべてのサポート対象拡張子
fn get_all_extensions() -> Vec<&'static str> {
    let mut exts = Vec::new();
    exts.extend_from_slice(IMAGE_EXTENSIONS);
    exts.extend_from_slice(VIDEO_EXTENSIONS);
    exts
}

/**
 * ファイルの種類を判定します
 *
 * @param path ファイルのパス
 * @return "image", "video", または "unknown"
 */
pub fn get_file_type(path: &str) -> String {
    if let Some(ext) = Path::new(path).extension() {
        let ext_str = ext.to_str().unwrap_or("").to_lowercase();
        if IMAGE_EXTENSIONS.contains(&ext_str.as_str()) {
            return "image".to_string();
        } else if VIDEO_EXTENSIONS.contains(&ext_str.as_str()) {
            return "video".to_string();
        }
    }
    "unknown".to_string()
}

/**
 * 指定されたディレクトリ内のメディアファイル（画像・動画）をスキャンします
 *
 * @param dir_path スキャンするディレクトリのパス
 * @return 見つかったメディアファイルのパスの配列
 */
pub fn scan_images_in_directory(dir_path: &str) -> Result<Vec<String>, String> {
    let valid_extensions = get_all_extensions();
    let mut file_paths = Vec::new();

    for entry in WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                if valid_extensions.contains(&ext_str.as_str()) {
                    file_paths.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(file_paths)
}

/**
 * パスからファイル名を取得します
 *
 * @param path ファイルのパス
 * @return ファイル名
 */
pub fn get_file_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}
```

#### 2.2 データベース登録処理の更新

**src-tauri/src/commands.rs** の `scan_directory` コマンドを更新して、`file_type` を保存:

```rust
#[tauri::command]
pub async fn scan_directory(path: String, db: tauri::State<'_, Database>) -> Result<Vec<ImageData>, String> {
    use crate::fs_utils::{scan_images_in_directory, get_file_name, get_file_type};

    // ディレクトリをスキャン
    let file_paths = scan_images_in_directory(&path)?;

    // データベースに登録
    for file_path in &file_paths {
        let file_name = get_file_name(file_path);
        let file_type = get_file_type(file_path);

        // 既存のレコードがあるかチェック
        // なければINSERT（file_typeも含める）
        db.execute(
            "INSERT OR IGNORE INTO images (file_path, file_name, file_type) VALUES (?, ?, ?)",
            &[file_path, &file_name, &file_type]
        ).await.map_err(|e| e.to_string())?;
    }

    // 全ファイルを取得して返却
    get_all_images(db).await
}
```

### 確認項目
- [ ] MP4ファイルを含むディレクトリを選択できる
- [ ] スキャン後、MP4ファイルがデータベースに登録される
- [ ] データベースの `file_type` カラムに 'video' が正しく保存される
- [ ] 既存の画像ファイルも引き続き動作する

### 作成/変更されるファイル
- `src-tauri/src/fs_utils.rs`（VIDEO_EXTENSIONS追加、get_file_type追加）
- `src-tauri/src/commands.rs`（scan_directory更新）

---

## ステップ3: グリッド表示での動画対応

### 目的
グリッド表示で動画ファイルを区別できるようにし、動画アイコンを表示する。

### 実行内容

#### 3.1 MediaCardコンポーネントの作成

**src/components/MediaCard.tsx** を新規作成（ImageGridから分離）:

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play } from 'lucide-react';
import { ImageData } from '../types/image';

interface MediaCardProps {
  media: ImageData;
  onClick: () => void;
}

/**
 * メディアカードコンポーネント（画像または動画を表示）
 */
export default function MediaCard({ media, onClick }: MediaCardProps) {
  const mediaUrl = convertFileSrc(media.file_path, 'asset');
  const isVideo = media.file_type === 'video';

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {isVideo ? (
        // 動画の場合: videoタグでサムネイル表示（最初のフレーム）
        <>
          <video
            src={mediaUrl}
            className="w-full h-full object-cover pointer-events-none"
            preload="metadata"
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
            }}
          />
          {/* 再生アイコンオーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="w-8 h-8 text-gray-800" fill="currentColor" />
            </div>
          </div>
        </>
      ) : (
        // 画像の場合: imgタグで表示
        <img
          src={mediaUrl}
          alt={media.file_name}
          loading="lazy"
          className="w-full h-full object-cover pointer-events-none"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
          }}
        />
      )}

      {/* ファイル情報のオーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
        <p className="text-white text-xs truncate" title={media.file_name}>
          {media.file_name}
        </p>
        {media.rating > 0 && (
          <div className="flex items-center mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${
                  i < media.rating ? 'text-yellow-400' : 'text-gray-400'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3.2 ImageGridコンポーネントの更新

**src/components/ImageGrid.tsx** を更新:

```typescript
import { useImageStore } from '../store/imageStore';
import MediaCard from './MediaCard';

export default function ImageGrid() {
  const { images, setSelectedImageId } = useImageStore();

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">No images or videos found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {images.map((media) => (
        <MediaCard
          key={media.id}
          media={media}
          onClick={() => setSelectedImageId(media.id)}
        />
      ))}
    </div>
  );
}
```

### 確認項目
- [ ] グリッドに動画ファイルがサムネイルで表示される
- [ ] 動画サムネイルの上に再生アイコンが表示される
- [ ] 画像と動画が混在して表示される
- [ ] 動画のサムネイルが最初のフレームを表示する

### 作成/変更されるファイル
- `src/components/MediaCard.tsx`（新規）
- `src/components/ImageGrid.tsx`（MediaCard使用に更新）

---

## ステップ4: 詳細モーダルでの動画再生

### 目的
詳細モーダルで動画を再生できるようにする。

### 実行内容

#### 4.1 VideoPlayerコンポーネントの作成

**src/components/VideoPlayer.tsx** を新規作成:

```typescript
import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  fileName: string;
}

/**
 * カスタム動画プレイヤーコンポーネント
 */
export default function VideoPlayer({ src, fileName }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl">
      <video
        ref={videoRef}
        src={src}
        className="w-full rounded-lg"
        onClick={togglePlay}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      />

      {/* コントロールバー */}
      <div className="mt-2 bg-gray-800 rounded-lg p-3 space-y-2">
        {/* シークバー */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
        />

        {/* コントロールボタン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 再生/一時停止 */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" fill="white" />
              )}
            </button>

            {/* ミュート */}
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* 時間表示 */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* フルスクリーン */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 4.2 ImageDetailコンポーネントの更新

**src/components/ImageDetail.tsx** を更新（210-219行目付近）:

```typescript
import VideoPlayer from './VideoPlayer';

// ... 既存のコード ...

{/* メイン画像/動画表示エリア */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '16px' }}>
  <div style={{ display: 'flex', gap: '16px', maxWidth: '100%', maxHeight: '100%' }}>
    {/* 画像または動画 */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {selectedImage.file_type === 'video' ? (
        <VideoPlayer
          src={imageUrl}
          fileName={selectedImage.file_name}
        />
      ) : (
        <img
          src={imageUrl}
          alt={selectedImage.file_name}
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 2rem)', objectFit: 'contain' }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>

    {/* メタデータパネル（既存のコード） */}
    {/* ... */}
  </div>
</div>
```

### 確認項目
- [ ] 詳細モーダルで動画が再生できる
- [ ] 再生/一時停止ボタンが動作する
- [ ] シークバーで動画の位置を変更できる
- [ ] ミュートボタンが動作する
- [ ] フルスクリーンモードに切り替えられる
- [ ] 動画の時間表示が正しい
- [ ] 画像の表示は従来通り動作する

### 作成/変更されるファイル
- `src/components/VideoPlayer.tsx`（新規）
- `src/components/ImageDetail.tsx`（VideoPlayer統合）

---

## ステップ5: エラーハンドリングとUI改善

### 目的
動画対応に伴うエッジケースに対応し、UXを向上させる。

### 実行内容

#### 5.1 動画読み込みエラー処理

**src/components/MediaCard.tsx** のエラーハンドリングを改善:

```typescript
<video
  src={mediaUrl}
  className="w-full h-full object-cover pointer-events-none"
  preload="metadata"
  onError={(e) => {
    console.error('Failed to load video:', media.file_path);
    const target = e.target as HTMLVideoElement;
    // エラー時は代替表示
    target.style.display = 'none';
    // TODO: エラー用のプレースホルダーを表示
  }}
/>
```

#### 5.2 ファイル種別フィルター（オプション）

**src/components/Header.tsx** にフィルターボタンを追加（将来の拡張として）:

```typescript
// フィルター状態
const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'image' | 'video'>('all');

// ボタンUI
<div className="flex gap-2">
  <button onClick={() => setFileTypeFilter('all')}>All</button>
  <button onClick={() => setFileTypeFilter('image')}>Images</button>
  <button onClick={() => setFileTypeFilter('video')}>Videos</button>
</div>
```

**src/store/imageStore.ts** にフィルター機能を追加。

#### 5.3 統計情報の表示

**src/components/Header.tsx** に画像・動画の件数表示:

```typescript
const imageCount = images.filter(m => m.file_type === 'image').length;
const videoCount = images.filter(m => m.file_type === 'video').length;

<p className="text-sm text-gray-600">
  {imageCount} images, {videoCount} videos
</p>
```

#### 5.4 空状態の更新

**src/components/EmptyState.tsx** のメッセージを更新:

```typescript
<p className="text-sm">
  Click "Select Directory" to load images and videos from a folder
</p>
```

### 確認項目
- [ ] 動画が存在しない場合でも正常に動作する
- [ ] 動画の読み込みエラーが適切に処理される
- [ ] ヘッダーに画像・動画の件数が表示される
- [ ] 空状態のメッセージが更新されている

### 作成/変更されるファイル
- `src/components/MediaCard.tsx`（エラーハンドリング改善）
- `src/components/Header.tsx`（統計情報追加）
- `src/components/EmptyState.tsx`（メッセージ更新）
- `src/store/imageStore.ts`（フィルター機能追加、オプション）

---

## ステップ6: テストとドキュメント更新

### 目的
MP4対応が正しく動作することを確認し、ドキュメントを更新する。

### 実行内容

#### 6.1 テストシナリオ

1. **新規ディレクトリスキャン**
   - [ ] 画像とMP4を含むディレクトリを選択
   - [ ] 両方が正しくスキャンされる
   - [ ] グリッドに両方が表示される

2. **動画再生**
   - [ ] 動画をクリックして詳細モーダルを開く
   - [ ] 動画が再生できる
   - [ ] コントロールが正常に動作する

3. **メタデータ編集**
   - [ ] 動画にコメント・タグ・評価を追加
   - [ ] 保存後、データが保持される
   - [ ] 一覧画面にも反映される

4. **混在表示**
   - [ ] 画像と動画が混在して表示される
   - [ ] 両方にメタデータが付与できる
   - [ ] 前へ/次へボタンで画像と動画を切り替えられる

5. **エラーハンドリング**
   - [ ] 削除された動画ファイルのエラー処理
   - [ ] 破損した動画ファイルのエラー処理
   - [ ] ネットワークドライブの動画（macOSでアクセスできない場合）

#### 6.2 パフォーマンステスト

- [ ] 大量のMP4ファイル（50本以上）でのスクロール性能
- [ ] 動画のサムネイル読み込み速度
- [ ] メモリ使用量（動画は画像より大きい）

#### 6.3 ドキュメント更新

**doc/requiment.md** を更新:

```markdown
## 主な機能
1. **メディア一覧表示**
   - 説明: 指定ディレクトリ内の画像・動画をショッピングサイト風のグリッドレイアウトで表示
   - サポートフォーマット:
     - 画像: .jpg, .jpeg, .png, .gif, .webp
     - 動画: .mp4
   - 優先度: 高
```

**README.md** を更新:

```markdown
## 主な機能（MVP）

- ディレクトリ選択機能
- 画像・動画一覧表示（グリッドレイアウト）
- 画像詳細表示、動画再生
- コメント・タグ・評価の追加/編集
- SQLiteでのデータ永続化
```

### 確認項目
- [ ] すべてのテストシナリオが通過する
- [ ] パフォーマンスが許容範囲内
- [ ] ドキュメントが最新の状態

### 作成/変更されるファイル
- `doc/requiment.md`（更新）
- `README.md`（更新）

---

## 追加の検討事項（将来の拡張）

### Phase 2で検討する機能

1. **追加の動画フォーマット対応**
   - mov, avi, mkv, webm など
   - コーデックの互換性確認が必要

2. **動画のサムネイル生成**
   - 現在はブラウザの video タグに依存
   - Rust側でサムネイル画像を生成してキャッシュ
   - ffmpegなどの外部ツールを使用

3. **動画メタデータの抽出**
   - 動画の長さ、解像度、コーデック情報
   - データベースに保存して検索可能に

4. **動画の自動タグ付け**
   - ファイル名や親ディレクトリからタグを自動生成

5. **動画のトリミング・編集機能**
   - 簡易的な動画編集機能（将来的な拡張）

### 技術的な制約と注意点

1. **ブラウザの動画対応**
   - MP4（H.264/AAC）は広くサポートされている
   - VP9、AV1などのコーデックはブラウザによって対応が異なる

2. **ファイルサイズ**
   - 動画ファイルは画像より大きい（数百MB〜数GB）
   - メモリ使用量に注意
   - 遅延読み込みの重要性が増す

3. **macOS特有の問題**
   - QuickTime形式（.mov）は将来的に対応検討
   - macOSのサンドボックス制限に注意

4. **パフォーマンス**
   - 大量の動画を一度に読み込まない
   - 仮想スクロールの導入を検討

---

## 重要なファイル一覧（MP4対応版）

### 新規作成ファイル
- `src/components/MediaCard.tsx` - 画像/動画カード表示
- `src/components/VideoPlayer.tsx` - カスタム動画プレイヤー
- `doc/mp4-support-plan.md` - このドキュメント

### 主要な変更ファイル
- `src-tauri/src/db.rs` - マイグレーション追加
- `src-tauri/src/fs_utils.rs` - 動画拡張子対応、file_type判定
- `src-tauri/src/commands.rs` - ImageData構造体更新
- `src/types/image.ts` - FileType追加
- `src/components/ImageGrid.tsx` - MediaCard使用
- `src/components/ImageDetail.tsx` - VideoPlayer統合

---

## 実装の優先順位

**必須（MVP）**:
1. ステップ1: データモデルの拡張
2. ステップ2: ファイルスキャン機能の拡張
3. ステップ3: グリッド表示での動画対応
4. ステップ4: 詳細モーダルでの動画再生

**推奨**:
5. ステップ5: エラーハンドリングとUI改善
6. ステップ6: テストとドキュメント更新

**オプション（Phase 2）**:
- ファイル種別フィルター
- 動画サムネイル生成
- 追加フォーマット対応
- 動画メタデータ抽出

---

## 見積もり

各ステップの実装時間の目安:
- ステップ1: データモデル拡張 - 実装とテスト
- ステップ2: スキャン機能拡張 - 実装とテスト
- ステップ3: グリッド表示対応 - 実装とテスト
- ステップ4: 動画再生機能 - 実装とテスト
- ステップ5: UI改善 - 実装とテスト
- ステップ6: テストと文書化 - テストとドキュメント更新

**注意**: 上記は実装にかかる作業の目安であり、具体的なスケジュールはプロジェクトの状況に応じて調整してください。

---

## まとめ

このプランに従って実装することで、画像ギャラリーアプリにMP4動画対応を追加できます。既存の画像機能との統一感を保ちながら、動画特有の再生機能を提供します。

実装は段階的に進め、各ステップで動作確認を行うことで、安定した機能拡張が可能になります。
