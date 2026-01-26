# Phase 4: 画像グループ化機能 実装プラン

## 概要

**目的**: 複数の画像をグループにまとめて管理する機能を実装します。1つの画像が複数のグループに所属可能な多対多関係を実現し、サイドバーUIで直感的にグループを操作できるようにします。

**実装時間**: 15-20時間（3-4日間）

**作成日**: 2026-01-26

## ユーザー要件

- ✅ 複数の画像を選択してグループ化できる
- ✅ 1つの画像が複数のグループに所属可能（多対多関係）
- ✅ グループに以下の情報を付与:
  - グループ名（必須）
  - 説明文（任意、複数行可）
  - 代表画像（任意、サムネイル用）
  - 色ラベル（任意、8色のプリセット）
- ✅ サイドバーにグループ一覧を表示
- ✅ グループでフィルタリング可能

## データベース設計

### Migration v5: グループテーブル追加

#### `groups` テーブル
```sql
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    representative_image_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (representative_image_id) REFERENCES images(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);
```

#### `image_groups` 中間テーブル（多対多関係）
```sql
CREATE TABLE IF NOT EXISTS image_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE(image_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_image_groups_image ON image_groups(image_id);
CREATE INDEX IF NOT EXISTS idx_image_groups_group ON image_groups(group_id);
```

**修正ファイル**: `src-tauri/src/db.rs` の `get_migrations()` 関数にMigration v5を追加

## バックエンド実装（Rust）

### 新規構造体（`src-tauri/src/commands.rs`）

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupData {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub representative_image_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub image_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub representative_image_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupInput {
    pub id: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub representative_image_id: Option<i64>,
}
```

### 実装する Tauri コマンド

| コマンド名 | 機能 | 戻り値 |
|-----------|------|--------|
| `create_group` | グループを新規作成 | `i64` (group_id) |
| `get_all_groups` | 全グループを取得（画像数を含む） | `Vec<GroupData>` |
| `update_group` | グループ情報を更新 | `()` |
| `delete_group` | グループを削除（CASCADE） | `()` |
| `add_images_to_group` | 画像をグループに追加 | `()` |
| `remove_images_from_group` | 画像をグループから削除 | `()` |
| `get_group_images` | グループに所属する画像IDの配列を取得 | `Vec<i64>` |
| `get_image_groups` | 画像が所属するグループIDの配列を取得 | `Vec<i64>` |

**修正ファイル**:
- `src-tauri/src/commands.rs` - 上記コマンドを実装
- `src-tauri/src/lib.rs` - `.invoke_handler()` に新規コマンドを登録

## フロントエンド実装（React + TypeScript）

### 型定義（`src/types/image.ts`）

```typescript
export interface GroupData {
  id: number;
  name: string;
  description: string | null;
  color: string;
  representative_image_id: number | null;
  created_at: string;
  updated_at: string;
  image_count: number;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  color?: string;
  representative_image_id?: number;
}

export interface UpdateGroupInput {
  id: number;
  name?: string;
  description?: string;
  color?: string;
  representative_image_id?: number;
}
```

### Tauri APIラッパー（`src/utils/tauri-commands.ts`）

グループ関連のAPI呼び出し関数を追加:
- `createGroup(input: CreateGroupInput): Promise<number>`
- `getAllGroups(): Promise<GroupData[]>`
- `updateGroup(input: UpdateGroupInput): Promise<void>`
- `deleteGroup(groupId: number): Promise<void>`
- `addImagesToGroup(imageIds: number[], groupId: number): Promise<void>`
- `removeImagesFromGroup(imageIds: number[], groupId: number): Promise<void>`
- `getGroupImages(groupId: number): Promise<number[]>`
- `getImageGroups(imageId: number): Promise<number[]>`

### 状態管理（`src/store/imageStore.ts`）

#### 追加する状態

```typescript
interface ImageStore {
  // 既存の状態...

  // グループ関連
  groups: GroupData[];
  isSelectionMode: boolean;
  selectedImageIds: number[];
  selectedGroupId: number | null;

  // グループアクション
  setGroups: (groups: GroupData[]) => void;
  addGroup: (group: GroupData) => void;
  updateGroup: (id: number, data: Partial<GroupData>) => void;
  removeGroup: (id: number) => void;

  // 選択モード
  toggleSelectionMode: () => void;
  toggleImageSelection: (id: number) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;

  // グループフィルター
  setSelectedGroupId: (id: number | null) => void;
  getGroupFilteredImages: () => ImageData[];
}
```

#### 永続化の追加

`partialize` に `selectedGroupId` を追加して、グループフィルター状態を保存します。

### 新規コンポーネント

#### 1. `Sidebar.tsx` - グループ一覧サイドバー
- 幅: 256px固定（Tailwindの`w-64`）
- 「All Images」ボタン（全画像表示）
- グループリスト表示
- グループ作成ボタン（+アイコン）
- グループ選択でフィルター適用
- スクロール可能

#### 2. `GroupItem.tsx` - サイドバーの各グループアイテム
- カラーインジケーター（丸いドット）
- グループアイコン（Folder）
- グループ名（truncate）
- 画像数バッジ
- 右クリック・ホバーで編集/削除メニュー
- 選択状態のハイライト

#### 3. `GroupModal.tsx` - グループ作成/編集モーダル
- グループ名入力（必須、maxLength 100）
- 説明文入力（任意、textarea、maxLength 500）
- カラーピッカー（8色のプリセット）
- 保存/キャンセルボタン
- 作成時と編集時でタイトル変更
- バリデーション（名前必須）

#### 4. `SelectionBar.tsx` - 複数選択時のアクションバー
- 画面下部中央に固定表示
- 選択数の表示
- 「Toggle All」ボタン（全選択/全解除）
- 「Add to Group」ボタン（グループ選択ドロップダウン）
- 「Remove from Group」ボタン（グループフィルター時のみ）
- 選択クリアボタン（×アイコン）

### 既存コンポーネントの修正

#### 1. `App.tsx`
- レイアウト変更: サイドバーとメインコンテンツの横並び
- サイドバー開閉状態の管理（`isSidebarOpen` state）
- グループ初期読み込み（`getAllGroups()` を useEffect で呼び出し）
- `SelectionBar` コンポーネントの追加
- キーボードショートカット追加:
  - `Ctrl/Cmd + A`: 全選択
  - `Ctrl/Cmd + D`: 選択解除
  - `Escape`: 選択モード終了

#### 2. `Header.tsx`
- サイドバートグルボタン追加（Menuアイコン）
- 選択モードトグルボタン追加（CheckSquareアイコン）
- 選択数の表示（選択モード時）

#### 3. `MediaCard.tsx`
- 選択モード時: チェックボックスを左上に表示
- 選択状態: 青い枠線（`ring-4 ring-blue-500`）
- クリック動作の変更:
  - 選択モード時: 選択/解除のトグル
  - 通常時: 詳細モーダルを開く

#### 4. `ImageGrid.tsx`
- グループフィルターの統合
- `selectedGroupId` が設定されている場合、`getGroupImages()` で取得したIDリストでフィルタリング
- フィルター適用後の空状態メッセージ変更

#### 5. `ImageDetail.tsx`
- 所属グループ表示セクションを追加（メタデータの下）
- グループ名、カラードット、Folderアイコンを表示
- 「Not in any group」メッセージ（未所属時）

## 実装ステップ

### ステップ1: データベース基盤（2-3時間）
1. `db.rs` にMigration v5を追加
2. マイグレーションのテスト（アプリ起動で自動実行）
3. DBブラウザでテーブル作成を確認

**重要ファイル**:
- `src-tauri/src/db.rs`

### ステップ2: バックエンドAPI（3-4時間）
1. `commands.rs` に構造体とコマンドを実装
2. `lib.rs` にコマンド登録
3. コンパイルエラーの解消
4. Tauriのログで動作確認

**重要ファイル**:
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`

### ステップ3: 状態管理（2-3時間）
1. `types/image.ts` に型定義を追加
2. `tauri-commands.ts` にAPIラッパーを追加
3. `imageStore.ts` にグループ状態と選択モード状態を追加
4. 永続化設定の更新

**重要ファイル**:
- `src/types/image.ts`
- `src/utils/tauri-commands.ts`
- `src/store/imageStore.ts`

### ステップ4: サイドバーUI（3-4時間）
1. `Sidebar.tsx` を作成
2. `GroupItem.tsx` を作成
3. `GroupModal.tsx` を作成
4. `App.tsx` のレイアウト変更
5. `Header.tsx` にサイドバートグルボタン追加
6. スタイリング調整（ダークモード対応）

**重要ファイル**:
- `src/components/Sidebar.tsx`（新規）
- `src/components/GroupItem.tsx`（新規）
- `src/components/GroupModal.tsx`（新規）
- `src/App.tsx`
- `src/components/Header.tsx`

### ステップ5: 選択モード（2-3時間）
1. `Header.tsx` に選択モードボタン追加
2. `MediaCard.tsx` に選択チェックボックス追加
3. `SelectionBar.tsx` を作成
4. `App.tsx` に `SelectionBar` を追加
5. 選択/解除ロジックのテスト

**重要ファイル**:
- `src/components/SelectionBar.tsx`（新規）
- `src/components/Header.tsx`
- `src/components/MediaCard.tsx`
- `src/App.tsx`

### ステップ6: グループフィルター統合（2-3時間）
1. `ImageGrid.tsx` にグループフィルターロジック追加
2. `ImageDetail.tsx` に所属グループ表示追加
3. グループ追加/削除の動作テスト
4. グループフィルターの切り替えテスト

**重要ファイル**:
- `src/components/ImageGrid.tsx`
- `src/components/ImageDetail.tsx`

### ステップ7: 統合テストと調整（2-3時間）
1. キーボードショートカットの実装
2. エラーハンドリングの強化
3. レスポンシブ対応の確認
4. ダークモード対応の確認
5. パフォーマンステスト（大量画像/グループ）
6. バグ修正と仕上げ

**重要ファイル**:
- `src/App.tsx`
- すべてのコンポーネント

## 修正が必要なファイル一覧

### 新規作成（4ファイル）
- `src/components/Sidebar.tsx`
- `src/components/GroupItem.tsx`
- `src/components/GroupModal.tsx`
- `src/components/SelectionBar.tsx`

### 変更（11ファイル）

**バックエンド（Rust）**:
- `src-tauri/src/db.rs` - Migration v5追加
- `src-tauri/src/commands.rs` - グループCRUD、関連付けコマンド追加
- `src-tauri/src/lib.rs` - コマンド登録

**型定義とAPI**:
- `src/types/image.ts` - GroupData, CreateGroupInput, UpdateGroupInput追加
- `src/utils/tauri-commands.ts` - グループAPIラッパー追加

**状態管理**:
- `src/store/imageStore.ts` - グループ状態、選択モード状態、関連アクション追加

**UIコンポーネント**:
- `src/App.tsx` - レイアウト変更、SelectionBar追加、キーボードショートカット
- `src/components/Header.tsx` - サイドバートグル、選択モードボタン追加
- `src/components/MediaCard.tsx` - 選択チェックボックス追加
- `src/components/ImageGrid.tsx` - グループフィルター統合
- `src/components/ImageDetail.tsx` - 所属グループ表示セクション追加

## 検証方法

### 機能テスト

#### 1. グループCRUD
- [ ] グループを作成できる
- [ ] グループ名、説明文、色を設定できる
- [ ] グループを編集できる
- [ ] グループを削除できる（画像は削除されない）
- [ ] グループ一覧が正しく表示される

#### 2. 画像のグループ化
- [ ] 複数画像を選択してグループに追加できる
- [ ] 1つの画像を複数グループに追加できる
- [ ] 画像をグループから削除できる
- [ ] グループ削除時に画像は保持される

#### 3. UI操作
- [ ] サイドバーにグループ一覧が表示される
- [ ] グループクリックでフィルター適用される
- [ ] 「All Images」クリックでフィルター解除される
- [ ] 選択モードで複数画像を選択できる
- [ ] 選択バーが表示され、一括操作できる
- [ ] サイドバーの開閉が機能する

#### 4. 統合
- [ ] グループフィルターと既存フィルターが共存する
- [ ] 画像詳細に所属グループが表示される
- [ ] キーボードショートカットが機能する
  - [ ] Ctrl/Cmd + A: 全選択
  - [ ] Ctrl/Cmd + D: 選択解除
  - [ ] Escape: 選択モード終了
- [ ] ダークモード対応している

### パフォーマンステスト
- [ ] 50個のグループでスムーズに動作
- [ ] 100枚の画像を一括でグループに追加できる
- [ ] グループフィルター切り替えが瞬時
- [ ] サイドバーのスクロールが滑らか

### エッジケーステスト
- [ ] グループ削除時にCASCADE削除が正常動作
- [ ] 同じ画像を同じグループに2回追加できない（UNIQUE制約）
- [ ] グループ名が空の場合にバリデーションエラー
- [ ] グループが空の場合に適切なメッセージ表示
- [ ] 選択モード中に画像を削除した場合の挙動
- [ ] 大量のグループ（100個以上）でのパフォーマンス

## 技術的考慮事項

### データベース
- **多対多関係**: `image_groups` 中間テーブルで実現
- **CASCADE削除**: グループ削除時に `image_groups` の関連レコードも自動削除（画像本体は保持）
- **UNIQUE制約**: 同じ画像-グループの組み合わせを防止
- **インデックス**: `image_id`, `group_id` にインデックスで高速化

### UI/UX
- **サイドバー幅**: 256px固定（Tailwindの`w-64`）
- **選択モード**: 選択モード中は詳細モーダルを開かず、選択のみ可能
- **グループフィルター**: 永続化されるため、アプリ再起動後も維持
- **カラーラベル**: 8色のプリセット
  - `#3b82f6` (blue-500)
  - `#10b981` (green-500)
  - `#f59e0b` (amber-500)
  - `#ef4444` (red-500)
  - `#8b5cf6` (purple-500)
  - `#ec4899` (pink-500)
  - `#06b6d4` (cyan-500)
  - `#6b7280` (gray-500)

### パフォーマンス
- **グループ画像取得**: `getGroupImages` で一度に取得し、フロントエンドでフィルタリング
- **画像数カウント**: SQLの `COUNT()` で効率的に集計
- **インデックス**: クエリ最適化のためインデックスを適切に配置

### セキュリティ
- **SQL インジェクション対策**: Tauriのパラメータバインディングを使用
- **入力値検証**: フロントエンドとバックエンドの両方で実施
- **最大長制限**: グループ名100文字、説明文500文字

## 拡張性（Phase 5以降の候補）

将来的に以下の機能を検討：

1. **グループの階層化**
   - 親グループとサブグループの実装
   - ツリー構造でのグループ表示

2. **グループのエクスポート/インポート**
   - JSON形式でのバックアップ
   - グループ構造の復元

3. **グループ間の画像移動**
   - ドラッグ&ドロップでの画像移動
   - グループ間のコピー

4. **代表画像の自動選択**
   - 最新の画像を自動的に代表画像に設定
   - グループ内の最高評価画像を選択

5. **グループのソート順変更**
   - 手動でグループの並び順を変更
   - ドラッグ&ドロップでの並び替え

6. **スマートグループ**
   - タグや評価での自動フィルター
   - ルールベースのグループ作成

7. **グループの統計情報**
   - グループ内の平均評価
   - ファイルサイズの合計
   - 動画の総再生時間

## 完了基準

Phase 4は以下の条件をすべて満たした時点で完了とします：

1. ✅ グループの作成/編集/削除が正常に動作する
2. ✅ サイドバーにグループ一覧が表示され、フィルタリングできる
3. ✅ 複数画像を選択してグループに追加できる
4. ✅ 1つの画像が複数グループに所属できる
5. ✅ 画像詳細に所属グループが表示される
6. ✅ ダークモード対応が完全である
7. ✅ エラーハンドリングが適切に実装されている
8. ✅ データベースマイグレーションが正常に実行される
9. ✅ すべての機能テストが合格する
10. ✅ パフォーマンステストが合格する

## 参考資料

- [Phase 1: MP4対応プラン](./02_mp4-support-plan.md)
- [Phase 2: 実用性向上提案](./03_phase2-proposal.md)
- [Phase 3: 動画機能強化](./04_phase3-video-enhancement.md)
- [SQLite Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [SQLite UNIQUE Constraint](https://www.sqlite.org/lang_createtable.html#uniqueconst)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

## 更新履歴

- 2026-01-26: Phase 4プラン初版作成
