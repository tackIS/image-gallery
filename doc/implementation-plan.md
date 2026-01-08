# 画像ギャラリー管理アプリ MVP 実装プラン

## 概要
- **アプリ名**: Image Gallery Manager
- **技術スタック**: Tauri + React + TypeScript + Vite + SQLite
- **ターゲット**: macOS
- **パッケージマネージャー**: npm
- **実装方針**: 段階的に各ステップで動作確認しながら進める

## 最終的な成果物
Phase 1 MVP として以下の機能を持つデスクトップアプリ：
1. ディレクトリ選択機能
2. 画像一覧表示（グリッドレイアウト）
3. 画像詳細表示
4. コメント・タグ・評価の追加/編集機能
5. SQLiteでのデータ永続化

---

## ステップ1: プロジェクトセットアップ

### 目的
Tauriプロジェクトを作成し、必要な依存関係をインストールして、アプリが起動することを確認する。

### 実行内容

#### 1.1 Tauriプロジェクトの初期化
```bash
npm create tauri-app@latest
```
プロンプトでの選択：
- Project name: image-gallery（またはユーザー指定）
- Package manager: npm
- UI template: React
- TypeScript: Yes
- Bundler: Vite

#### 1.2 基本依存関係のインストール
```bash
cd image-gallery

# React Router v6
npm install react-router-dom

# Zustand（状態管理）
npm install zustand

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 画像遅延読み込み
npm install react-lazy-load-image-component
npm install -D @types/react-lazy-load-image-component

# アイコン
npm install lucide-react
```

#### 1.3 Tailwind CSS設定

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**src/index.css**（先頭に追加）:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 1.4 ディレクトリ構造の作成
```
src/
├── components/      # Reactコンポーネント（後で追加）
├── pages/           # ページコンポーネント（後で追加）
├── store/           # Zustand状態管理（後で追加）
├── types/           # TypeScript型定義（後で追加）
├── utils/           # ユーティリティ関数（後で追加）
├── App.tsx
├── main.tsx
└── index.css
```

#### 1.5 動作確認
```bash
npm run dev
```

### 確認項目
- [ ] アプリが起動し、デフォルトのTauri+React画面が表示される
- [ ] Tailwind CSSが適用されている（テキストにTailwindクラスを追加して確認）
- [ ] ビルドエラーがない

### 作成されるファイル
- `package.json`（依存関係）
- `tailwind.config.js`
- `src/index.css`（Tailwind設定追加）

---

## ステップ2: データベース初期化

### 目的
SQLiteデータベースを初期化し、imagesテーブルを作成する。

### 実行内容

#### 2.1 Tauriプラグインのインストール
```bash
npm install @tauri-apps/plugin-sql
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cd ..
```

#### 2.2 Rust側のファイル構成

**src-tauri/src/db.rs** を作成（データベース操作）:
```rust
use tauri_plugin_sql::{Builder, Migration, MigrationKind};

pub async fn init_db() -> Result<(), String> {
    let db_path = dirs::home_dir()
        .ok_or("Failed to get home directory")?
        .join(".image_gallery")
        .join("gallery.db");

    // ディレクトリ作成
    std::fs::create_dir_all(db_path.parent().unwrap())
        .map_err(|e| e.to_string())?;

    // マイグレーション定義
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_images_table",
            sql: "CREATE TABLE IF NOT EXISTS images (
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
            CREATE INDEX IF NOT EXISTS idx_file_name ON images(file_name);",
            kind: MigrationKind::Up,
        }
    ];

    Ok(())
}
```

**src-tauri/src/commands.rs** を作成:
```rust
#[tauri::command]
pub async fn initialize_database() -> Result<String, String> {
    crate::db::init_db().await?;
    Ok("Database initialized successfully".to_string())
}
```

**src-tauri/src/main.rs** を更新:
```rust
mod db;
mod commands;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            initialize_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 2.3 フロントエンド側の初期化

**src/App.tsx** を更新:
```typescript
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

function App() {
  const [dbStatus, setDbStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const initDB = async () => {
      try {
        const result = await invoke<string>('initialize_database');
        setDbStatus(result);
      } catch (error) {
        setDbStatus(`Error: ${error}`);
      }
    };
    initDB();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Image Gallery Manager</h1>
      <p className="text-gray-600">Database Status: {dbStatus}</p>
    </div>
  );
}

export default App;
```

### 確認項目
- [ ] アプリ起動時に「Database initialized successfully」と表示される
- [ ] `~/.image_gallery/gallery.db` ファイルが作成される
- [ ] SQLiteビューアーでテーブル構造を確認できる

### 作成/変更されるファイル
- `src-tauri/src/db.rs`（新規）
- `src-tauri/src/commands.rs`（新規）
- `src-tauri/src/main.rs`（変更）
- `src-tauri/Cargo.toml`（依存関係追加）
- `src/App.tsx`（変更）

---

## ステップ3: TypeScript型定義と状態管理

### 目的
アプリ全体で使用する型定義とZustand状態管理ストアを作成する。

### 実行内容

#### 3.1 型定義ファイル作成

**src/types/image.ts**:
```typescript
export interface ImageData {
  id: number;
  file_path: string;
  file_name: string;
  comment: string | null;
  tags: string[]; // JSON文字列からパース後
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ImageMetadataUpdate {
  id: number;
  comment?: string;
  tags?: string[];
  rating?: number;
}

export interface DirectoryInfo {
  path: string;
  imageCount: number;
}
```

#### 3.2 Zustand状態管理ストア作成

**src/store/imageStore.ts**:
```typescript
import { create } from 'zustand';
import { ImageData } from '../types/image';

interface ImageStore {
  images: ImageData[];
  currentDirectory: string | null;
  isLoading: boolean;
  error: string | null;

  setImages: (images: ImageData[]) => void;
  setCurrentDirectory: (path: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateImage: (id: number, data: Partial<ImageData>) => void;
  clearError: () => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  images: [],
  currentDirectory: null,
  isLoading: false,
  error: null,

  setImages: (images) => set({ images }),
  setCurrentDirectory: (path) => set({ currentDirectory: path }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateImage: (id, data) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...data } : img
      ),
    })),
  clearError: () => set({ error: null }),
}));
```

#### 3.3 Tauriコマンドラッパー作成

**src/utils/tauri-commands.ts**:
```typescript
import { invoke } from '@tauri-apps/api/core';
import { ImageData, ImageMetadataUpdate } from '../types/image';

export async function initializeDatabase(): Promise<string> {
  return await invoke<string>('initialize_database');
}

// 後のステップで追加する関数のプレースホルダー
export async function selectDirectory(): Promise<string | null> {
  // TODO: ステップ4で実装
  return null;
}

export async function scanDirectory(path: string): Promise<ImageData[]> {
  // TODO: ステップ4で実装
  return [];
}

export async function getAllImages(): Promise<ImageData[]> {
  // TODO: ステップ5で実装
  return [];
}

export async function getImageById(id: number): Promise<ImageData | null> {
  // TODO: ステップ6で実装
  return null;
}

export async function updateImageMetadata(
  data: ImageMetadataUpdate
): Promise<void> {
  // TODO: ステップ7で実装
}
```

#### 3.4 App.tsx更新（ラッパー使用）

**src/App.tsx**:
```typescript
import { useEffect } from 'react';
import { useImageStore } from './store/imageStore';
import { initializeDatabase } from './utils/tauri-commands';

function App() {
  const { error, setError, setLoading } = useImageStore();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await initializeDatabase();
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setError, setLoading]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Image Gallery Manager
      </h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          Error: {error}
        </div>
      )}
      <p className="text-gray-600">
        Database initialized. Ready for next steps.
      </p>
    </div>
  );
}

export default App;
```

### 確認項目
- [ ] TypeScriptのコンパイルエラーがない
- [ ] アプリが起動し、状態管理ストアが動作する
- [ ] エラーハンドリングが機能する（DB初期化失敗時に赤いエラーメッセージが表示される）

### 作成されるファイル
- `src/types/image.ts`
- `src/store/imageStore.ts`
- `src/utils/tauri-commands.ts`
- `src/App.tsx`（更新）

---

## ステップ4: ディレクトリ選択機能

### 目的
ユーザーがディレクトリを選択し、そのディレクトリ内の画像ファイルをスキャンしてDBに登録する機能を実装する。

### 実行内容

#### 4.1 Tauriプラグインのインストール
```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
cd src-tauri
cargo add tauri-plugin-dialog tauri-plugin-fs
cd ..
```

#### 4.2 Rust側の実装

**src-tauri/src/fs_utils.rs** を作成:
```rust
use std::path::Path;
use walkdir::WalkDir;

pub fn scan_images_in_directory(dir_path: &str) -> Result<Vec<String>, String> {
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "webp"];
    let mut image_paths = Vec::new();

    for entry in WalkDir::new(dir_path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                if valid_extensions.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
                    image_paths.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(image_paths)
}

pub fn is_image_file(path: &str) -> bool {
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "webp"];
    if let Some(ext) = Path::new(path).extension() {
        valid_extensions.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str())
    } else {
        false
    }
}

pub fn get_file_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}
```

**src-tauri/Cargo.toml** に依存関係追加:
```toml
[dependencies]
walkdir = "2"
dirs = "5"
```

**src-tauri/src/db.rs** にCRUD関数追加:
```rust
// insert_image, image_exists, get_all_images などの実装
```

**src-tauri/src/commands.rs** にコマンド追加:
```rust
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog()
        .file()
        .pick_folder();

    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<ImageData>, String> {
    // 1. ディレクトリスキャン
    // 2. DBに登録
    // 3. 全画像データ返却
}
```

#### 4.3 フロントエンド側の実装

**src/components/Header.tsx** を作成:
```typescript
import { FolderOpen } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';

export default function Header() {
  const { setImages, setCurrentDirectory, setLoading, setError } = useImageStore();

  const handleSelectDirectory = async () => {
    try {
      setLoading(true);
      setError(null);

      const path = await selectDirectory();
      if (path) {
        const images = await scanDirectory(path);
        setImages(images);
        setCurrentDirectory(path);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">Image Gallery</h1>
      <button
        onClick={handleSelectDirectory}
        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        <FolderOpen size={20} />
        Select Directory
      </button>
    </header>
  );
}
```

**src/App.tsx** を更新:
```typescript
import Header from './components/Header';
// ... Headerコンポーネントを追加
```

### 確認項目
- [ ] 「Select Directory」ボタンをクリックしてディレクトリ選択ダイアログが表示される
- [ ] ディレクトリを選択すると画像がスキャンされる
- [ ] `~/.image_gallery/gallery.db` に画像データが保存される（SQLiteビューアーで確認）
- [ ] コンソールに画像数やパスが表示される

### 作成/変更されるファイル
- `src-tauri/src/fs_utils.rs`（新規）
- `src-tauri/src/db.rs`（CRUD関数追加）
- `src-tauri/src/commands.rs`（コマンド追加）
- `src-tauri/src/main.rs`（プラグイン登録）
- `src/components/Header.tsx`（新規）
- `src/utils/tauri-commands.ts`（関数実装）
- `src/App.tsx`（更新）

---

## ステップ5: 画像一覧表示

### 目的
グリッドレイアウトで画像一覧を表示する。

### 実行内容

#### 5.1 コンポーネント作成

**src/components/ImageCard.tsx**:
```typescript
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ImageData } from '../types/image';

interface ImageCardProps {
  image: ImageData;
  onClick: () => void;
}

export default function ImageCard({ image, onClick }: ImageCardProps) {
  const imageUrl = convertFileSrc(image.file_path);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      <div className="aspect-square bg-gray-200">
        <LazyLoadImage
          src={imageUrl}
          alt={image.file_name}
          className="w-full h-full object-cover"
          effect="blur"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {image.file_name}
        </p>
        {image.comment && (
          <p className="text-xs text-gray-500 truncate mt-1">
            {image.comment}
          </p>
        )}
      </div>
    </div>
  );
}
```

**src/components/ImageGrid.tsx**:
```typescript
import { useImageStore } from '../store/imageStore';
import ImageCard from './ImageCard';

export default function ImageGrid() {
  const { images } = useImageStore();

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No images found. Please select a directory.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          onClick={() => {
            console.log('Image clicked:', image.id);
            // TODO: ステップ6で詳細画面に遷移
          }}
        />
      ))}
    </div>
  );
}
```

**src/App.tsx** を更新:
```typescript
import Header from './components/Header';
import ImageGrid from './components/ImageGrid';

function App() {
  // ... 初期化処理

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {error && (
        <div className="bg-red-100 text-red-700 p-4 m-4 rounded">
          Error: {error}
        </div>
      )}
      <ImageGrid />
    </div>
  );
}
```

#### 5.2 Rust側のget_all_images実装

**src-tauri/src/db.rs** に追加:
```rust
pub async fn get_all_images() -> Result<Vec<ImageData>, String> {
    // SQLiteからSELECT
    // JSONパース（tags）
}
```

**src-tauri/src/commands.rs** に追加:
```rust
#[tauri::command]
pub async fn get_all_images() -> Result<Vec<ImageData>, String> {
    crate::db::get_all_images().await
}
```

### 確認項目
- [ ] ディレクトリ選択後、画像がグリッドで表示される
- [ ] 遅延読み込みが動作する（スクロール時に画像が読み込まれる）
- [ ] 画像をクリックするとコンソールにログが出力される
- [ ] レスポンシブ対応（ウィンドウサイズ変更でカラム数が変わる）

### 作成/変更されるファイル
- `src/components/ImageCard.tsx`（新規）
- `src/components/ImageGrid.tsx`（新規）
- `src-tauri/src/db.rs`（get_all_images追加）
- `src-tauri/src/commands.rs`（コマンド追加）
- `src/App.tsx`（更新）

---

## ステップ6: 画像詳細表示

### 目的
画像をクリックすると詳細画面に遷移し、大きく表示できるようにする。

### 実行内容

#### 6.1 React Router設定

**src/App.tsx** を更新:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GalleryPage from './pages/GalleryPage';
import DetailPage from './pages/DetailPage';

function App() {
  useEffect(() => {
    initializeDatabase().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/image/:id" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 6.2 ページコンポーネント作成

**src/pages/GalleryPage.tsx**:
```typescript
import Header from '../components/Header';
import ImageGrid from '../components/ImageGrid';
import { useImageStore } from '../store/imageStore';

export default function GalleryPage() {
  const { error } = useImageStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {error && (
        <div className="bg-red-100 text-red-700 p-4 m-4 rounded">
          Error: {error}
        </div>
      )}
      <ImageGrid />
    </div>
  );
}
```

**src/pages/DetailPage.tsx**:
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { ImageData } from '../types/image';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { images } = useImageStore();
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);

  useEffect(() => {
    const image = images.find((img) => img.id === Number(id));
    setCurrentImage(image || null);
  }, [id, images]);

  const currentIndex = images.findIndex((img) => img.id === Number(id));
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      navigate(`/image/${images[currentIndex - 1].id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      navigate(`/image/${images[currentIndex + 1].id}`);
    }
  };

  if (!currentImage) {
    return <div>Image not found</div>;
  }

  const imageUrl = convertFileSrc(currentImage.file_path);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:text-gray-300"
        >
          <ArrowLeft size={20} />
          Back to Gallery
        </button>
        <h2 className="text-lg font-medium">{currentImage.file_name}</h2>
        <div className="w-32" />
      </div>

      {/* 画像表示エリア */}
      <div className="flex items-center justify-center p-8">
        <button
          onClick={goToPrevious}
          disabled={!hasPrevious}
          className="p-2 hover:bg-gray-800 rounded disabled:opacity-30"
        >
          <ChevronLeft size={32} />
        </button>

        <div className="max-w-4xl max-h-[80vh]">
          <img
            src={imageUrl}
            alt={currentImage.file_name}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        <button
          onClick={goToNext}
          disabled={!hasNext}
          className="p-2 hover:bg-gray-800 rounded disabled:opacity-30"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* メタデータエリア（ステップ7で実装） */}
      <div className="p-4 bg-gray-800 m-4 rounded">
        <p className="text-sm text-gray-400">
          Comment: {currentImage.comment || 'No comment'}
        </p>
        <p className="text-sm text-gray-400">
          Rating: {currentImage.rating}/5
        </p>
      </div>
    </div>
  );
}
```

#### 6.3 ImageCardの更新

**src/components/ImageCard.tsx** を更新:
```typescript
import { useNavigate } from 'react-router-dom';

export default function ImageCard({ image }: ImageCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/image/${image.id}`)}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {/* ... */}
    </div>
  );
}
```

### 確認項目
- [ ] 画像をクリックすると詳細画面に遷移する
- [ ] 詳細画面で画像が大きく表示される
- [ ] 「Back to Gallery」ボタンで一覧画面に戻れる
- [ ] 前へ/次へボタンで画像を切り替えられる
- [ ] ESCキーで一覧画面に戻れる（オプション）

### 作成/変更されるファイル
- `src/pages/GalleryPage.tsx`（新規）
- `src/pages/DetailPage.tsx`（新規）
- `src/components/ImageCard.tsx`（更新）
- `src/App.tsx`（ルーター設定）

---

## ステップ7: メタデータ編集機能

### 目的
コメント、タグ、評価を編集して保存できるようにする。

### 実行内容

#### 7.1 メタデータエディタコンポーネント作成

**src/components/MetadataEditor.tsx**:
```typescript
import { useState } from 'react';
import { Save } from 'lucide-react';
import { ImageData, ImageMetadataUpdate } from '../types/image';
import { updateImageMetadata } from '../utils/tauri-commands';
import { useImageStore } from '../store/imageStore';

interface MetadataEditorProps {
  image: ImageData;
}

export default function MetadataEditor({ image }: MetadataEditorProps) {
  const { updateImage } = useImageStore();
  const [comment, setComment] = useState(image.comment || '');
  const [tags, setTags] = useState(image.tags.join(', '));
  const [rating, setRating] = useState(image.rating);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const data: ImageMetadataUpdate = {
        id: image.id,
        comment,
        tags: tags.split(',').map((t) => t.trim()).filter((t) => t),
        rating,
      };

      await updateImageMetadata(data);
      updateImage(image.id, {
        comment,
        tags: data.tags || [],
        rating,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save metadata:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-semibold mb-4">Metadata</h3>

      {/* コメント */}
      <div>
        <label className="block text-sm font-medium mb-2">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-gray-700 text-white rounded p-2 min-h-[100px]"
          placeholder="Add a comment..."
        />
      </div>

      {/* タグ */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full bg-gray-700 text-white rounded p-2"
          placeholder="nature, landscape, sunset"
        />
      </div>

      {/* 評価 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Rating: {rating}/5
        </label>
        <input
          type="range"
          min="0"
          max="5"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        <Save size={20} />
        {isSaving ? 'Saving...' : 'Save'}
      </button>

      {/* 成功メッセージ */}
      {saveSuccess && (
        <div className="bg-green-600 text-white p-2 rounded text-center">
          Saved successfully!
        </div>
      )}
    </div>
  );
}
```

#### 7.2 DetailPageに統合

**src/pages/DetailPage.tsx** を更新:
```typescript
import MetadataEditor from '../components/MetadataEditor';

export default function DetailPage() {
  // ... 既存のコード

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ヘッダー */}
      {/* ... */}

      <div className="flex gap-4 p-4">
        {/* 画像表示エリア */}
        <div className="flex-1 flex items-center justify-center">
          {/* ... 既存の画像表示コード */}
        </div>

        {/* メタデータエディタ */}
        <div className="w-80">
          <MetadataEditor image={currentImage} />
        </div>
      </div>
    </div>
  );
}
```

#### 7.3 Rust側のupdate実装

**src-tauri/src/db.rs** に追加:
```rust
pub async fn update_image_metadata(
    id: i64,
    comment: Option<String>,
    tags: Option<String>,
    rating: Option<i32>,
) -> Result<(), String> {
    // SQL UPDATE文
    // updated_at も更新
}
```

**src-tauri/src/commands.rs** に追加:
```rust
#[derive(serde::Deserialize)]
pub struct ImageMetadataUpdate {
    pub id: i64,
    pub comment: Option<String>,
    pub tags: Option<Vec<String>>,
    pub rating: Option<i32>,
}

#[tauri::command]
pub async fn update_image_metadata(data: ImageMetadataUpdate) -> Result<(), String> {
    let tags_json = data.tags.map(|t| serde_json::to_string(&t).unwrap());
    crate::db::update_image_metadata(data.id, data.comment, tags_json, data.rating).await
}
```

### 確認項目
- [ ] 詳細画面でコメント、タグ、評価を編集できる
- [ ] 「Save」ボタンで保存できる
- [ ] 保存成功メッセージが表示される
- [ ] 一覧画面に戻ってもデータが保持されている
- [ ] DBに正しく保存されている（SQLiteビューアーで確認）

### 作成/変更されるファイル
- `src/components/MetadataEditor.tsx`（新規）
- `src/pages/DetailPage.tsx`（更新）
- `src-tauri/src/db.rs`（update関数追加）
- `src-tauri/src/commands.rs`（コマンド追加）
- `src/utils/tauri-commands.ts`（関数実装）

---

## ステップ8: エラーハンドリングとUI改善

### 目的
ユーザーエクスペリエンスを向上させ、エッジケースに対応する。

### 実行内容

#### 8.1 ローディング表示

**src/components/LoadingSpinner.tsx** を作成:
```typescript
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}
```

GalleryPageとDetailPageに統合。

#### 8.2 エラーバウンダリ

**src/components/ErrorBoundary.tsx** を作成（Reactエラーバウンダリ）。

#### 8.3 空状態の改善

**src/components/EmptyState.tsx** を作成:
```typescript
import { ImageOff } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <ImageOff size={64} className="mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Images Found</h2>
      <p className="text-sm">
        Click "Select Directory" to load images from a folder
      </p>
    </div>
  );
}
```

#### 8.4 キーボードショートカット

DetailPageにESCキーでの戻る機能を追加:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      navigate('/');
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigate]);
```

#### 8.5 ファイル存在チェック

画像ファイルが削除されている場合の処理を追加。

### 確認項目
- [ ] ローディング中にスピナーが表示される
- [ ] 画像がない場合に親切なメッセージが表示される
- [ ] ESCキーで一覧画面に戻れる
- [ ] エラーが発生した場合にユーザーフレンドリーなメッセージが表示される

### 作成/変更されるファイル
- `src/components/LoadingSpinner.tsx`（新規）
- `src/components/EmptyState.tsx`（新規）
- `src/components/ErrorBoundary.tsx`（新規）
- `src/pages/GalleryPage.tsx`（更新）
- `src/pages/DetailPage.tsx`（更新）

---

## 最終確認とテスト

### テストシナリオ
1. アプリを起動してDBが初期化される
2. ディレクトリを選択して画像が一覧表示される
3. 画像をクリックして詳細画面に遷移する
4. メタデータを編集して保存する
5. 一覧画面に戻ってデータが保持されている
6. 異なるディレクトリを選択して切り替えられる
7. 大量の画像（100枚以上）でもスムーズに動作する

### パフォーマンステスト
- 1000枚の画像でスクロール性能を確認
- 画像読み込み速度を確認
- メモリ使用量を確認

---

## Phase 2への準備（将来の拡張）

MVP完了後、以下の機能を検討：
1. 検索・フィルター機能
2. タグのオートコンプリート
3. サムネイルキャッシュ
4. ダークモード対応
5. 設定画面（カラム数、ソート順など）
6. 複数ディレクトリ管理
7. エクスポート機能

---

## 重要なファイル一覧

### 最も重要なファイル
- `src-tauri/src/db.rs` - データベース操作の中核
- `src-tauri/src/commands.rs` - フロントエンドとバックエンドのインターフェース
- `src/store/imageStore.ts` - アプリ全体の状態管理
- `src/utils/tauri-commands.ts` - Tauriコマンドのラッパー

### 主要コンポーネント
- `src/pages/GalleryPage.tsx` - 一覧画面
- `src/pages/DetailPage.tsx` - 詳細画面
- `src/components/ImageGrid.tsx` - 画像グリッド
- `src/components/ImageCard.tsx` - 個別画像カード
- `src/components/MetadataEditor.tsx` - メタデータ編集フォーム

### 設定ファイル
- `src-tauri/tauri.conf.json` - Tauri設定（権限、ビルド設定）
- `tailwind.config.js` - Tailwind CSS設定
- `tsconfig.json` - TypeScript設定
