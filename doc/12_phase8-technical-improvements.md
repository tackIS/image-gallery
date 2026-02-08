# Phase 8: 技術的改善（C1〜C4）

## Context

Phase 7まで完了し機能は充実しているが、テストカバレッジが低く（2ファイル/26テストのみ）、アクセシビリティは部分的（30-40%）、E2Eテストは未整備。TimelineViewのみ仮想スクロール未適用。この Phase でコード品質・堅牢性・アクセシビリティを底上げする。

### 改善領域

| ID | 領域 | 現状 | 目標 |
|----|------|------|------|
| C1 | テストカバレッジ拡大 | 2ファイル/26テスト | 主要コンポーネント・store・hooks のカバレッジ確保 |
| C2 | 仮想スクロール最適化 | Grid/List は実装済み、TimelineView のみ未対応 | 全ビューで仮想スクロール化 |
| C3 | アクセシビリティ | ~30-40%（一部 aria-label のみ） | WAI-ARIA 準拠、キーボードナビ、フォーカストラップ |
| C4 | E2Eテスト | 未整備 | Playwright でブラウザテスト基盤構築 |

---

## Step 1: テスト共通基盤の整備

**複雑度: S** | ファイル: `src/test-utils.tsx`（新規）

- テスト用レンダーヘルパー `renderWithRouter`（HashRouter ラッパー）
- ファクトリ関数 `makeImage()`, `makeGroup()` を共通化（既存テストから移動）
- store リセット用 `resetStore()` ヘルパー

---

## Step 2: Store テスト拡充

**複雑度: M** | ファイル: `src/store/__tests__/imageStore.test.ts`（既存拡張）

既存 26 テストに加え、未テストのメソッドを追加:
- グループフィルタ（`selectedGroupId` + `groupFilteredImageIds` での絞り込み）
- `toggleSelectAll()` — フィルタ済み画像を全選択/解除
- `resetAllModes()` — 選択モード・代表画像選択を一括リセット
- `showToast()` / `removeToast()` — `vi.useFakeTimers()` で自動削除テスト
- `setViewMode()`, `setGridDensity()`, `toggleSidebarCollapsed()`
- スライドショー: `startSlideshow()`, `stopSlideshow()`, `setSlideshowInterval()`

---

## Step 3: Hook テスト

**複雑度: M** | ファイル: `src/hooks/__tests__/useUndoRedo.test.ts`（新規）

- `tauri-commands` を `vi.mock()` でモック
- `renderHook()` で初期状態テスト（`canUndo: false`, `canRedo: false`）
- `logMetadataChange()` → `logAction` が正しい引数で呼ばれることを検証
- `undo()` → `applyAction` + `markActionUndone` + toast 表示
- `redo()` → `applyAction` + `markActionRedone` + toast 表示
- エラー時: `showToast('Undo failed', 'error')` の検証

---

## Step 4: 小規模コンポーネントテスト

**複雑度: M** | ファイル: 4つ新規

### `src/components/__tests__/Toast.test.tsx`
- トーストなし → null 返却
- success/error/info 各アイコン表示
- 閉じるボタンで `removeToast` 呼び出し

### `src/components/__tests__/EmptyState.test.tsx`
- テキスト・アイコン表示の確認

### `src/components/__tests__/LoadingSpinner.test.tsx`
- レンダリング確認

### `src/components/__tests__/RatingStars.test.tsx`
- 星5つ表示、`rating` に応じた黄色星の数
- `editable=true` 時のクリック → `onChange` 呼び出し

---

## Step 5: MediaCard テスト

**複雑度: L** | ファイル: `src/components/__tests__/MediaCard.test.tsx`（新規）

- `@dnd-kit/core` の `useDraggable` をモック
- 画像表示（`convertFileSrc` で変換された URL、`alt` = ファイル名）
- 動画カードのサムネイル生成フロー
- お気に入りトグル（非同期 + エラー時のリバート）
- 選択モード: クリックで `toggleImageSelection` 呼び出し
- エラーステート: 画像読み込み失敗時のフォールバック UI

---

## Step 6: GroupModal / SelectionBar テスト

**複雑度: M** | ファイル: 2つ新規

### `src/components/__tests__/GroupModal.test.tsx`
- 作成モード/編集モードのタイトル切り替え
- バリデーション（空の名前、文字数超過）
- 色プリセット選択
- submit → `onSave` 呼び出し
- Escape / Cancel で `onClose`

### `src/components/__tests__/SelectionBar.test.tsx`
- 選択数表示、全選択トグル
- グループ追加ドロップダウン
- クローズで選択解除 + モード終了

---

## Step 7: アクセシビリティ基盤

**複雑度: M** | 修正ファイル: 5つ + 新規フック1つ

### `src/hooks/useFocusTrap.ts`（新規）
- モーダル用フォーカストラップフック
- Tab/Shift+Tab でフォーカス循環
- 開始時にモーダル内最初の要素にフォーカス、閉じ時に元のフォーカス復元

### `src/components/Toast.tsx`
- コンテナに `role="status" aria-live="polite"` 追加

### `src/components/ImageDetail.tsx`
- `role="dialog" aria-modal="true" aria-label="画像詳細"` 追加
- `useFocusTrap` 適用

### `src/components/GroupModal.tsx`
- `role="dialog" aria-modal="true" aria-labelledby="group-modal-title"` 追加
- h2 に `id="group-modal-title"`
- `useFocusTrap` 適用

### `src/components/SettingsModal.tsx`
- 同様のダイアログ属性 + `useFocusTrap`

---

## Step 8: グリッド・リストのキーボードナビゲーション

**複雑度: L** | 修正ファイル: 4つ

### `src/components/grid/VirtualGrid.tsx`
- コンテナに `role="grid"`、各行に `role="row"`
- `focusedIndex` state + ローヴィングタブインデックス（フォーカスされたセルのみ `tabIndex={0}`、他は `-1`）
- Arrow キー: 右/左で横移動、上/下で行移動
- Enter/Space: 画像詳細を開く / 選択モード時はトグル

### `src/components/grid/VirtualList.tsx`
- コンテナに `role="list"`、各アイテムに `role="listitem"`
- Arrow Up/Down でフォーカス移動
- Enter で詳細表示

### `src/components/MediaCard.tsx`
- グリッドコンテキスト用に `tabIndex`, `aria-selected`（選択モード時）props 追加
- `onKeyDown` ハンドラ props 追加

### `src/components/grid/ListItem.tsx`
- `role="listitem"`, `tabIndex`, `aria-label`（ファイル名 + メタデータ要約）追加

---

## Step 9: サイドバー・ヘッダーのアクセシビリティ

**複雑度: S** | 修正ファイル: 4つ

### `src/components/Sidebar.tsx`
- `<aside>` に `role="navigation" aria-label="サイドバー"`
- アクティブ項目に `aria-current="page"`

### `src/components/Header.tsx`
- `<header>` に `role="banner"`

### `src/components/header/SearchBar.tsx`
- `<div role="search">` ラッパー、`input` に `aria-label="画像を検索"`

### `src/components/SelectionBar.tsx`
- `role="toolbar" aria-label="選択操作"`
- グループ追加ボタンに `aria-expanded`, `aria-haspopup="listbox"`

---

## Step 10: TimelineView 仮想スクロール化

**複雑度: L** | ファイル: `src/components/grid/TimelineView.tsx`（書き換え）

現在は全画像を直接レンダリング（90行）。`@tanstack/react-virtual` で仮想化する。

### 実装方針
1. ヘッダー行と画像行をフラット化した `VirtualItem[]` 配列を構築
   - `{ type: 'header', key, label, count }` | `{ type: 'row', images: ImageData[] }`
2. `useVirtualizer` で `estimateSize` をアイテムタイプで分岐（ヘッダー: 44px, 画像行: rowHeight + 16px）
3. スクロール位置から現在セクションを計算し、フローティング sticky ヘッダーで表示
4. VirtualGrid.tsx のパターン（absolute positioning + transform）を踏襲

### 既存パターンの再利用
- `useColumns()`, `DENSITY_COLUMNS`, `formatYearMonth()` は既存のものをそのまま使用
- `MediaCard` のレンダリングパターンは VirtualGrid と同じ
- `rowHeight` 計算は VirtualGrid と同じ（compact=160, normal=220, comfortable=320）

---

## Step 11: E2E テストセットアップ（Playwright）

**複雑度: M** | 新規ファイル: 3つ + package.json 修正

### `playwright.config.ts`（新規）
- テストディレクトリ: `e2e/`
- Vite dev server を `webServer` で自動起動（`http://localhost:5173`）
- Chromium のみ（macOS デスクトップアプリのため）

### `e2e/fixtures.ts`（新規）
- `page.addInitScript()` で Tauri API モック（`__TAURI_INTERNALS__`）を注入
- `invoke` の主要コマンドをスタブ（`initialize_database`, `get_all_directories`, `get_all_groups` 等）

### `e2e/gallery.spec.ts`（新規）
- アプリ読み込み → 空状態表示
- サイドバー折りたたみ/展開
- テーマ切り替え（ライト → ダーク → システム）
- 設定モーダルの開閉
- 検索バー入力

### `package.json`
- `"test:e2e": "playwright test"` 追加
- `@playwright/test` を devDependencies に追加

---

## Step 12: 主要コンポーネントテスト

**複雑度: L** | ファイル: 3つ新規

### `src/components/__tests__/Header.test.tsx`
- 画像/動画カウント表示
- テーマトグルサイクル
- 選択モードボタン
- フィルタアクティブ時のバッジ表示

### `src/components/__tests__/Sidebar.test.tsx`
- `HashRouter` ラップ必須
- 「すべての画像」ボタン
- グループ一覧表示
- グループ作成モーダル起動
- 折りたたみ動作

### `src/components/__tests__/ImageDetail.test.tsx`
- `selectedImageId` null → null 返却
- 画像表示（`convertFileSrc` 経由）
- キーボード: Escape で閉じる、ArrowLeft/Right でナビゲーション
- スライドショー自動送り（`vi.useFakeTimers()`）
- `createPortal` の動作確認

---

## Step 13: アクセシビリティ統合テスト

**複雑度: M** | ファイル: `src/components/__tests__/accessibility.test.tsx`（新規）

- モーダルのフォーカストラップ動作
- Toast の `aria-live` リージョン
- グリッドの ARIA ロール（`role="grid"`, `role="row"`）
- サイドバーの `aria-current="page"`
- SearchBar の `role="search"`
- ボタンの `aria-label` 網羅チェック

---

## 依存関係と実行順序

```
Phase A（並行実行可能 — テスト基盤 + a11y 基盤 + TimelineView + E2E）:
  Step 1  → Step 2, 3, 4 → Step 5, 6 → Step 12
  Step 7  → Step 8, 9
  Step 10 （独立）
  Step 11 （独立）

Phase B（統合）:
  Step 13 （Step 7-9, 12 完了後）
```

## 検証方法

| Step | コマンド |
|------|---------|
| 1-6, 12-13 | `npm run test` |
| 7-9 | `npx tsc --noEmit` + `npm run lint` + ブラウザでの手動確認 |
| 10 | `npm run build` + 大量画像でのスクロール動作確認 |
| 11 | `npx playwright test` |
| 全体 | `npm run build && npm run test && npx playwright test` |

---

## 新規ファイル一覧（17ファイル）

```
src/test-utils.tsx                              （Step 1）
src/utils/__tests__/tauri-commands.test.ts       （Step 2 — 省略可、優先度低）
src/hooks/__tests__/useUndoRedo.test.ts          （Step 3）
src/components/__tests__/Toast.test.tsx           （Step 4）
src/components/__tests__/EmptyState.test.tsx      （Step 4）
src/components/__tests__/LoadingSpinner.test.tsx  （Step 4）
src/components/__tests__/RatingStars.test.tsx     （Step 4）
src/components/__tests__/MediaCard.test.tsx       （Step 5）
src/components/__tests__/GroupModal.test.tsx      （Step 6）
src/components/__tests__/SelectionBar.test.tsx    （Step 6）
src/hooks/useFocusTrap.ts                        （Step 7）
src/components/__tests__/Header.test.tsx          （Step 12）
src/components/__tests__/Sidebar.test.tsx         （Step 12）
src/components/__tests__/ImageDetail.test.tsx     （Step 12）
src/components/__tests__/accessibility.test.tsx   （Step 13）
playwright.config.ts                             （Step 11）
e2e/fixtures.ts + e2e/gallery.spec.ts            （Step 11）
```

## 修正ファイル一覧（15ファイル）

```
src/store/__tests__/imageStore.test.ts   （Step 2 — 拡張）
src/components/Toast.tsx                 （Step 7 — aria-live）
src/components/ImageDetail.tsx           （Step 7 — dialog role + focus trap）
src/components/GroupModal.tsx            （Step 7 — dialog role + focus trap）
src/components/SettingsModal.tsx         （Step 7 — dialog role + focus trap）
src/components/grid/VirtualGrid.tsx      （Step 8 — grid roles + keyboard nav）
src/components/grid/VirtualList.tsx      （Step 8 — list roles + keyboard nav）
src/components/MediaCard.tsx             （Step 8 — tabIndex + aria-selected）
src/components/grid/ListItem.tsx         （Step 8 — listitem role）
src/components/Sidebar.tsx               （Step 9 — navigation role）
src/components/Header.tsx                （Step 9 — banner role）
src/components/header/SearchBar.tsx      （Step 9 — search role）
src/components/SelectionBar.tsx          （Step 9 — toolbar role）
src/components/grid/TimelineView.tsx     （Step 10 — 仮想スクロール化）
package.json                             （Step 11 — E2E scripts）
```
