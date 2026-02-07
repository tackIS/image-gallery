# Phase 6: UX・パフォーマンス改善 + マルチディレクトリ + デザイン最適化

## コンテキスト

Phase 1-5で基本ギャラリー、動画対応、グループ管理、アルバムビュー、コメント機能が完成。
現在はOpen Issue 0件の安定状態。しかしUI面では以下の課題がある:

- **Header.tsx (392行)**: 9+コントロールが1行に詰め込まれ、狭い画面で崩れる
- **ImageDetail.tsx (657行)**: inline styleが大量、固定320pxパネル、レスポンシブ非対応
- **Sidebar.tsx (194行)**: 固定w-64で折りたたみ不可、グループ項目が窮屈
- **ImageGrid.tsx (81行)**: 仮想スクロールなし、1000+画像でパフォーマンス劣化
- **単一ディレクトリ制限**: 1つのディレクトリしか管理できない

## 12ステップ実装計画

### Step 1: デザイントークン基盤
**目的**: 全UIリファクタの基盤となるデザインシステムの定義

**変更ファイル**:
- `src/index.css` — `@theme`にタイポグラフィ・スペーシング・シャドウ・トランジション追加

**追加内容**:
```css
@theme {
  /* 既存カラーパレットに加えて */
  --spacing-sidebar: 256px;
  --spacing-sidebar-collapsed: 64px;
  --spacing-panel: 320px;
  --shadow-card: 0 1px 3px oklch(0 0 0 / 0.1);
  --shadow-card-hover: 0 4px 12px oklch(0 0 0 / 0.15);
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

---

### Step 2: DB Migration v7 — マルチディレクトリ対応スキーマ
**目的**: 複数ディレクトリ管理と Undo/Redo、エクスポート機能のデータモデル

**変更ファイル**:
- `src-tauri/src/db.rs` — Migration v7追加
- `src/types/image.ts` — `DirectoryData`型追加、`ImageData`に`directory_id`追加

**新テーブル**:
```sql
-- ディレクトリ管理
CREATE TABLE directories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_scanned_at TEXT,
    file_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- imagesにdirectory_id追加
ALTER TABLE images ADD COLUMN directory_id INTEGER REFERENCES directories(id) ON DELETE SET NULL;

-- Undo/Redo用アクションログ
CREATE TABLE action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    old_value TEXT,  -- JSON
    new_value TEXT,  -- JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_undone INTEGER DEFAULT 0
);
```

**後方互換**: 既存imagesの`directory_id`はNULL。ディレクトリ追加時にパスマッチで自動バックフィル。

---

### Step 3: マルチディレクトリ バックエンドAPI
**目的**: 複数ディレクトリのCRUD操作をRustコマンドとして実装

**変更ファイル**:
- `src-tauri/src/commands.rs` — 6コマンド追加
- `src-tauri/src/lib.rs` — コマンド登録
- `src/utils/tauri-commands.ts` — TSラッパー追加

**新コマンド**:
- `add_directory(path)` → ディレクトリ追加+初回スキャン
- `remove_directory(directory_id)` → ディレクトリ削除（画像データは保持）
- `get_all_directories()` → 全ディレクトリ取得
- `set_directory_active(id, is_active)` → アクティブ/非アクティブ切替
- `scan_single_directory(directory_id)` → 指定ディレクトリ再スキャン
- `scan_all_active_directories()` → 全アクティブディレクトリスキャン

**既存`scan_directory`の修正**: ディレクトリレコード未存在時に自動作成、`directory_id`をimagesに設定

**依存**: Step 2

---

### Step 4: ヘッダー再構成 + サイドバー折りたたみ
**目的**: 過密なヘッダーを整理し、サイドバーに折りたたみ機能を追加

**変更ファイル**:
- `src/components/Header.tsx` — サブコンポーネントに分割
- `src/components/Sidebar.tsx` — 折りたたみアニメーション、ディレクトリセクション追加
- `src/components/MainGallery.tsx` — レイアウト調整

**新規ファイル**:
- `src/components/header/SearchBar.tsx`
- `src/components/header/SortControls.tsx`
- `src/components/header/FilterPanel.tsx`
- `src/components/header/ViewModeToggle.tsx` — グリッド/リスト切替（Step 6準備）
- `src/components/header/DirectorySelector.tsx` — マルチディレクトリ選択

**ヘッダー After**:
```
[☰] [Title + Stats]  [Search.................] [View] [Filter] [Sort] [Theme] [⚙] [+ Dir]
```
- 検索バーが`flex-1`で広がる
- フィルターはドロップダウン or サイドバー内パネルに移動

**サイドバー After**:
- 折りたたみ: `w-16`（アイコンのみ）⇄ 展開: `w-64`（現状）
- `transition-all duration-300` でスムーズアニメーション
- ディレクトリ一覧セクションを上部に追加
- グループ項目にファイル数を表示

**依存**: Step 1, Step 3

---

### Step 5: 詳細モーダル オーバーホール
**目的**: inline styleを全廃、タブベースレイアウト、画像ズーム/パン対応

**npm追加**: `react-zoom-pan-pinch`

**変更ファイル**:
- `src/components/ImageDetail.tsx` — 大規模リファクタ

**新規ファイル**:
- `src/components/detail/MetadataPanel.tsx` — タブ付きメタデータパネル
- `src/components/detail/ImageViewer.tsx` — ズーム/パン対応画像ビューア
- `src/components/detail/RatingStars.tsx` — 再利用可能なレーティングUI

**メタデータタブ構成**:
1. **情報** — ファイル名、パス、作成日時、動画情報（読み取り専用）
2. **編集** — レーティング、タグ、コメント（編集可能）
3. **グループ** — 所属グループ表示・追加・削除

**キー変更**:
- 全inline style → Tailwindクラスに置換（hardcoded `#1f2937` 等を排除）
- パネル幅: `w-80 lg:w-96`（レスポンシブ）
- ズーム: ダブルクリック or `+`/`-` キー、`0`でリセット

**依存**: Step 1

---

### Step 6: 仮想スクロール + グリッド表示モード
**目的**: 1000+アイテム対応、グリッド密度選択、リスト表示モード

**npm追加**: `@tanstack/react-virtual`

**変更ファイル**:
- `src/components/ImageGrid.tsx` — 仮想スクロール化
- `src/components/MediaCard.tsx` — ホバー改善、表示モード対応
- `src/store/imageStore.ts` — `viewMode`/`gridDensity`追加

**新規ファイル**:
- `src/components/grid/VirtualGrid.tsx` — 仮想化グリッドコンテナ
- `src/components/grid/VirtualList.tsx` — 仮想化リスト表示
- `src/components/grid/ListItem.tsx` — リストモード行（サムネ+メタデータ）

**Store追加**:
```typescript
type ViewMode = 'grid' | 'list';
type GridDensity = 'compact' | 'normal' | 'comfortable';
// compact: 8-10列, normal: 4-6列（現状）, comfortable: 2-4列（大きいカード）
```

**MediaCard改善**:
- ホバー: `hover:scale-[1.02]` + `hover:ring-2 hover:ring-blue-400`
- ファイル名2行表示 + ツールチップ
- レーティング・タグ数・コメント有無をオーバーレイ表示

**依存**: Step 1, Step 4（ViewModeToggle）

---

### Step 7: ドラッグ&ドロップ
**目的**: 画像をサイドバーのグループにドラッグして追加

**npm追加**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**変更ファイル**:
- `src/components/MainGallery.tsx` — DndContext でラップ
- `src/components/MediaCard.tsx` — ドラッグ可能に
- `src/components/Sidebar.tsx` — グループ項目をドロップターゲットに
- `src/components/GroupItem.tsx` — ドロップ時のハイライト

**新規ファイル**:
- `src/components/dnd/DragOverlay.tsx` — ドラッグ中のプレビュー表示
- `src/components/dnd/DndProvider.tsx` — DndContextラッパー

**操作フロー**:
1. MediaCardをドラッグ開始（選択モード中なら全選択アイテムを一括）
2. サイドバーのグループがハイライト
3. ドロップで`addImagesToGroup()` 実行
4. トースト通知: "3枚の画像をグループXに追加しました"

**注意**: 仮想スクロール+DnDの併用時は`DragOverlay`（portal）を使用し、仮想化による要素アンマウント問題を回避

**依存**: Step 4, Step 6

---

### Step 8: マルチディレクトリ フロントエンドUI
**目的**: Step 3のバックエンドを活用したディレクトリ管理UI

**変更ファイル**:
- `src/store/imageStore.ts` — `currentDirectory` → `directories[]` + `activeDirectoryIds[]`
- `src/components/MainGallery.tsx` — 初期化フローを全アクティブディレクトリ対応に
- `src/components/Sidebar.tsx` — ディレクトリ管理セクション追加

**新規ファイル**:
- `src/components/directory/DirectoryManager.tsx` — ディレクトリ一覧+追加/削除
- `src/components/directory/DirectoryItem.tsx` — ディレクトリ行（パス、ファイル数、最終スキャン）
- `src/components/directory/AddDirectoryButton.tsx` — ネイティブフォルダピッカー

**サイドバーレイアウト**:
```
[ディレクトリ]
  /Photos (245件, アクティブ)
  /Screenshots (89件, アクティブ)
  [+ ディレクトリ追加]
[グループ]
  全画像
  グループA (12)
  グループB (5)
  [+ グループ作成]
```

**依存**: Step 3, Step 4

---

### Step 9: Undo/Redo システム
**目的**: メタデータ変更（レーティング、タグ、コメント、お気に入り）のUndo/Redo

**変更ファイル**:
- `src/store/imageStore.ts` — undo/redoスタック追加
- `src/components/detail/*` — undo対応の更新関数使用
- `src/components/MediaCard.tsx` — お気に入り切替のundo対応
- `src-tauri/src/commands.rs` — `log_action`, `undo_action`コマンド追加

**新規ファイル**:
- `src/hooks/useUndoRedo.ts` — Undo/Redoカスタムフック
- `src/components/UndoRedoBar.tsx` — "レーティングを4に変更 [元に戻す]" 表示

**キーボードショートカット**:
- `Ctrl/Cmd + Z` — Undo
- `Ctrl/Cmd + Shift + Z` — Redo

**Store追加**:
```typescript
undoStack: UndoEntry[];  // 最大50件
redoStack: UndoEntry[];
undo: () => Promise<void>;
redo: () => Promise<void>;
```

**依存**: Step 2, Step 5

---

### Step 10: エクスポート/インポート
**目的**: メタデータのJSON/CSVエクスポートとインポート

**Rustクレート追加**: `csv = "1.3"`

**変更ファイル**:
- `src-tauri/src/commands.rs` — エクスポート/インポートコマンド追加
- `src-tauri/Cargo.toml` — `csv`クレート追加
- `src/components/SettingsModal.tsx` — エクスポート/インポートUI追加

**新規ファイル**:
- `src/components/settings/ExportSection.tsx`
- `src/components/settings/ImportSection.tsx`

**新コマンド**:
- `export_metadata_json(output_path)` → 全メタデータ+グループ情報をJSON出力
- `export_metadata_csv(output_path)` → 画像メタデータをCSV出力
- `import_metadata_json(input_path)` → JSONからメタデータ復元

**JSONフォーマット**:
```json
{
  "version": "1.0",
  "exported_at": "...",
  "images": [{ "file_path", "tags", "rating", "comment", ... }],
  "groups": [...],
  "group_memberships": [...]
}
```

**依存**: Step 2

---

### Step 11: ディレクトリ監視（ファイルウォッチャー）
**目的**: アクティブディレクトリの変更を自動検出、ギャラリーを自動更新

**Rustクレート追加**: `notify = "7"`（macOS FSEvents対応）

**変更ファイル**:
- `src-tauri/src/lib.rs` — ウォッチャー初期化
- `src-tauri/src/commands.rs` — ウォッチャー制御コマンド
- `src-tauri/Cargo.toml` — `notify`クレート追加
- `src/store/imageStore.ts` — リアルタイム更新イベント処理

**新規ファイル**:
- `src-tauri/src/watcher.rs` — `notify`クレートを使ったファイル監視モジュール
- `src/hooks/useDirectoryWatcher.ts` — Tauriイベントリスナーフック

**イベントフロー**:
1. `notify`がファイル作成/削除/変更を検出
2. バックエンドが対応拡張子でフィルタ
3. Tauriイベント`file-system-change`を発火
4. フロントエンドが自動的にDB追加/削除+ストア更新
5. トースト: "2件の新しいファイルが検出されました"

**デバウンス**: 2秒間のバッチ処理で高頻度更新を抑制

**依存**: Step 3, Step 8

---

### Step 12: ポリッシュ（アニメーション・レスポンシブ・ブレッドクラム）
**目的**: 最終的な見た目の統一と残りのUI課題解消

**変更ファイル**:
- `src/components/GroupAlbumView.tsx` — ブレッドクラム追加
- `src/components/MediaCard.tsx` — ホバーアニメーション最終調整
- `src/components/Sidebar.tsx` — 折りたたみアニメーション仕上げ
- `src/components/GroupItem.tsx` — プレビューサムネイル表示
- `src/index.css` — `@keyframes`アニメーション定義

**新規ファイル**:
- `src/components/Breadcrumb.tsx` — `Gallery > グループ名` ナビゲーション
- `src/components/PageTransition.tsx` — ルート遷移時のフェードアニメーション

**その他のポリッシュ**:
- 全インタラクティブ要素に`focus-visible`リング
- 一貫した`border-radius`（トークン値使用）
- グリッドアイテムのスケルトンローダー
- トースト通知のスライドインアニメーション

**依存**: 全ステップ完了後

---

## 依存関係グラフ

```
Step 1 (トークン) ─────┬── Step 4 (ヘッダー+サイドバー) ─┬── Step 7 (D&D)
                        │                                    │
Step 2 (DB v7) ────────┼── Step 3 (マルチDir Backend) ────┼── Step 8 (マルチDir UI) ── Step 11 (Watcher)
                        │                                    │
Step 1 ── Step 5 (Detail) ── Step 9 (Undo/Redo)            │
                                                             │
Step 1 ── Step 6 (仮想スクロール) ──────────────────────────┘
                        │
Step 2 ── Step 10 (Export/Import)

全Steps ── Step 12 (ポリッシュ)
```

**並行作業可能**: Step 1+2 / Step 4+5+6（部分的） / Step 9+10

## 新規依存ライブラリ

| パッケージ | 用途 |
|-----------|------|
| `@tanstack/react-virtual` | 仮想スクロール |
| `@dnd-kit/core` + `sortable` + `utilities` | ドラッグ&ドロップ |
| `react-zoom-pan-pinch` | 画像ズーム/パン |
| `notify` (Rust) | ファイルシステム監視 |
| `csv` (Rust) | CSVエクスポート |

## リスク管理

| リスク | 対策 |
|--------|------|
| 仮想スクロール+DnD併用の競合 | `DragOverlay`（portal）使用 |
| 既存images→directory_idバックフィル | ディレクトリ追加時にパスマッチで自動リンク |
| ImageDetail 657行のリファクタ | サブコンポーネント分割→段階的にstyle置換 |
| Zustand Store肥大化 (現448行) | slice パターンで分割検討 |
| ファイルウォッチャーの負荷 | アクティブDirのみ監視+2秒デバウンス |

## 検証方法

各Step完了時:
1. `npx tsc --noEmit` + `npm run lint` + `cargo check` — ビルドチェック
2. `npm run build` — フロントエンドビルド成功
3. ライト/ダークモード両方で目視確認
4. 該当機能の手動テスト

Phase 6全体完了時:
- 1000+画像ディレクトリでパフォーマンス確認（仮想スクロール効果検証）
- 複数ディレクトリ追加→スキャン→切替の一連フロー確認
- JSON/CSVエクスポート→インポートの往復テスト
- Undo/Redo 10回連続操作の動作確認
- ドラッグ&ドロップ（単体/複数選択）の動作確認

## コミット計画

各Stepごとに1コミット（= 1 PR）。計12 PR。
