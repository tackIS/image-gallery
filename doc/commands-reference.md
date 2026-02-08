# Tauri コマンドリファレンス

Image Gallery Manager で使用される全 Tauri コマンドの一覧。

各コマンドは `commands.rs` で `#[tauri::command]` として定義され、`lib.rs` の `invoke_handler` に登録されている。
フロントエンドからは `src/utils/tauri-commands.ts` のラッパー関数経由で呼び出す。

---

## DB管理（4コマンド）

### `initialize_database`

データベースを初期化（テーブル作成・マイグレーション実行）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn initialize_database() -> Result<String, String>` |
| パラメータ | なし |
| 戻り値 | `String` — 成功メッセージ |
| TSラッパー | `initializeDatabase()` |

### `get_database_path`

データベースファイルの絶対パスを取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_database_path() -> Result<String, String>` |
| パラメータ | なし |
| 戻り値 | `String` — DBファイルパス |
| TSラッパー | `getDatabasePath()` |

### `backup_database`

データベースファイルをタイムスタンプ付きでバックアップ。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn backup_database() -> Result<String, String>` |
| パラメータ | なし |
| 戻り値 | `String` — バックアップファイルパス |
| TSラッパー | `backupDatabase()` |

### `reset_database`

データベースファイルとサムネイルディレクトリを削除。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn reset_database() -> Result<String, String>` |
| パラメータ | なし |
| 戻り値 | `String` — 成功メッセージ |
| TSラッパー | `resetDatabase()` |

---

## ファイル操作（2コマンド）

### `select_directory`

OSのディレクトリ選択ダイアログを表示。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String>` |
| パラメータ | なし（AppHandleは自動注入） |
| 戻り値 | `Option<String>` — 選択パス or null（キャンセル） |
| TSラッパー | `selectDirectory()` |

### `scan_directory`

指定ディレクトリ内の画像・動画ファイルをスキャン。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn scan_directory(path: String) -> Result<Vec<ImageFileInfo>, String>` |
| パラメータ | `path: String` — ディレクトリパス |
| 戻り値 | `Vec<ImageFileInfo>` — ファイル情報の配列 |
| TSラッパー | `scanDirectory(path)` |

---

## 動画処理（2コマンド）

### `check_ffmpeg_available`

ffmpegが利用可能かチェック。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn check_ffmpeg_available() -> Result<String, String>` |
| パラメータ | なし |
| 戻り値 | `String` — ffmpegパスとバージョン情報 |
| TSラッパー | `checkFFmpegAvailable()` |
| 定義場所 | `video_utils.rs` |

### `generate_video_thumbnail`

動画のサムネイル画像を生成（3秒地点、JPEG品質2）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn generate_video_thumbnail(video_path: String, image_id: i64) -> Result<String, String>` |
| パラメータ | `video_path: String`, `image_id: i64` |
| 戻り値 | `String` — サムネイルファイルパス |
| TSラッパー | `generateVideoThumbnail(videoPath, imageId)` |
| 定義場所 | `video_utils.rs` |

---

## グループ管理（8コマンド）

### `create_group`

グループを新規作成。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn create_group(input: CreateGroupInput) -> Result<i64, String>` |
| パラメータ | `input: { name, description?, color?, representative_image_id? }` |
| 戻り値 | `i64` — 作成されたグループID |
| バリデーション | 名前1〜100文字、説明最大500文字、色はHEX形式 |
| TSラッパー | `createGroup(input)` |

### `get_all_groups`

全グループを取得（画像数を含む）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_all_groups() -> Result<Vec<GroupData>, String>` |
| パラメータ | なし |
| 戻り値 | `Vec<GroupData>` — グループ配列（created_at DESC） |
| TSラッパー | `getAllGroups()` |

### `update_group`

グループ情報を更新（部分更新対応）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn update_group(input: UpdateGroupInput) -> Result<(), String>` |
| パラメータ | `input: { id, name?, description?, color?, representative_image_id? }` |
| 戻り値 | なし |
| バリデーション | create_group と同じ + 代表画像がグループに属しているか確認 |
| TSラッパー | `updateGroup(input)` |

### `delete_group`

グループを削除（CASCADE で image_groups も削除）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn delete_group(group_id: i64) -> Result<(), String>` |
| パラメータ | `group_id: i64` |
| 戻り値 | なし |
| TSラッパー | `deleteGroup(groupId)` |

### `add_images_to_group`

複数画像をグループに追加（トランザクション使用）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn add_images_to_group(image_ids: Vec<i64>, group_id: i64) -> Result<(), String>` |
| パラメータ | `image_ids: Vec<i64>`, `group_id: i64` |
| 戻り値 | なし |
| 備考 | INSERT OR IGNORE で重複を無視 |
| TSラッパー | `addImagesToGroup(imageIds, groupId)` |

### `remove_images_from_group`

複数画像をグループから削除（トランザクション使用）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn remove_images_from_group(image_ids: Vec<i64>, group_id: i64) -> Result<(), String>` |
| パラメータ | `image_ids: Vec<i64>`, `group_id: i64` |
| 戻り値 | なし |
| TSラッパー | `removeImagesFromGroup(imageIds, groupId)` |

### `get_group_images`

グループに所属する画像IDの配列を取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_group_images(group_id: i64) -> Result<Vec<i64>, String>` |
| パラメータ | `group_id: i64` |
| 戻り値 | `Vec<i64>` — 画像ID配列 |
| TSラッパー | `getGroupImages(groupId)` |

### `get_image_groups`

画像が所属するグループIDの配列を取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_image_groups(image_id: i64) -> Result<Vec<i64>, String>` |
| パラメータ | `image_id: i64` |
| 戻り値 | `Vec<i64>` — グループID配列 |
| TSラッパー | `getImageGroups(imageId)` |

---

## グループ詳細（2コマンド）

### `get_group_by_id`

グループIDから詳細情報を取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_group_by_id(group_id: i64) -> Result<GroupData, String>` |
| パラメータ | `group_id: i64` |
| 戻り値 | `GroupData` |
| TSラッパー | `getGroupById(groupId)` |

### `set_representative_image`

グループの代表画像を設定（グループに属する画像のみ指定可能）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn set_representative_image(group_id: i64, image_id: Option<i64>) -> Result<(), String>` |
| パラメータ | `group_id: i64`, `image_id: Option<i64>` |
| 戻り値 | なし |
| 備考 | `image_id: null` で代表画像を解除 |
| TSラッパー | `setRepresentativeImage(groupId, imageId)` |

---

## コメント（3コマンド）

### `add_group_comment`

グループコメントを追加。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn add_group_comment(input: AddCommentInput) -> Result<i64, String>` |
| パラメータ | `input: { group_id, comment }` |
| 戻り値 | `i64` — 作成されたコメントID |
| バリデーション | コメント1〜500文字 |
| TSラッパー | `addGroupComment(input)` |

### `get_group_comments`

グループの全コメントを取得（新しい順）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_group_comments(group_id: i64) -> Result<Vec<GroupComment>, String>` |
| パラメータ | `group_id: i64` |
| 戻り値 | `Vec<GroupComment>` |
| TSラッパー | `getGroupComments(groupId)` |

### `delete_group_comment`

グループコメントを削除。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn delete_group_comment(comment_id: i64) -> Result<(), String>` |
| パラメータ | `comment_id: i64` |
| 戻り値 | なし |
| TSラッパー | `deleteGroupComment(commentId)` |

---

## マルチディレクトリ（6コマンド）

### `add_directory`

ディレクトリを追加し、既存画像のバックフィルを実行。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn add_directory(path: String) -> Result<DirectoryData, String>` |
| パラメータ | `path: String` — ディレクトリ絶対パス |
| 戻り値 | `DirectoryData` — 追加されたディレクトリ情報 |
| 備考 | 既存の場合は再アクティブ化 |
| TSラッパー | `addDirectory(path)` |

### `remove_directory`

ディレクトリを削除（画像データは保持、directory_id を NULL に）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn remove_directory(directory_id: i64) -> Result<(), String>` |
| パラメータ | `directory_id: i64` |
| 戻り値 | なし |
| TSラッパー | `removeDirectory(directoryId)` |

### `get_all_directories`

全ディレクトリを取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_all_directories() -> Result<Vec<DirectoryData>, String>` |
| パラメータ | なし |
| 戻り値 | `Vec<DirectoryData>` — created_at DESC |
| TSラッパー | `getAllDirectories()` |

### `set_directory_active`

ディレクトリのアクティブ/非アクティブ状態を切り替え。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn set_directory_active(directory_id: i64, is_active: bool) -> Result<(), String>` |
| パラメータ | `directory_id: i64`, `is_active: bool` |
| 戻り値 | なし |
| TSラッパー | `setDirectoryActive(directoryId, isActive)` |

### `scan_single_directory`

指定ディレクトリを再スキャン。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn scan_single_directory(directory_id: i64) -> Result<Vec<ImageFileInfo>, String>` |
| パラメータ | `directory_id: i64` |
| 戻り値 | `Vec<ImageFileInfo>` |
| TSラッパー | `scanSingleDirectory(directoryId)` |

### `scan_all_active_directories`

全アクティブディレクトリをスキャン。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub async fn scan_all_active_directories() -> Result<Vec<ImageFileInfo>, String>` |
| パラメータ | なし |
| 戻り値 | `Vec<ImageFileInfo>` |
| TSラッパー | `scanAllActiveDirectories()` |

---

## Undo/Redo（5コマンド）

### `log_action`

アクションをログに記録（最大50件保持）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn log_action(action_type, target_table, target_id, old_value, new_value) -> Result<i64, String>` |
| パラメータ | `action_type: String`, `target_table: String`, `target_id: i64`, `old_value: Option<String>`, `new_value: Option<String>` |
| 戻り値 | `i64` — アクションID |
| 備考 | 新規記録時に is_undone=1 のエントリを削除（redo履歴クリア） |
| TSラッパー | `logAction(actionType, targetTable, targetId, oldValue, newValue)` |

### `get_last_undoable_action`

最新のundo可能なアクションを取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_last_undoable_action() -> Result<Option<ActionLogEntry>, String>` |
| パラメータ | なし |
| 戻り値 | `Option<ActionLogEntry>` |
| TSラッパー | `getLastUndoableAction()` |

### `get_last_redoable_action`

最新のredo可能なアクションを取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_last_redoable_action() -> Result<Option<ActionLogEntry>, String>` |
| パラメータ | なし |
| 戻り値 | `Option<ActionLogEntry>` |
| TSラッパー | `getLastRedoableAction()` |

### `mark_action_undone`

アクションをundo済みとしてマーク。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn mark_action_undone(action_id: i64) -> Result<(), String>` |
| パラメータ | `action_id: i64` |
| 戻り値 | なし |
| TSラッパー | `markActionUndone(actionId)` |

### `mark_action_redone`

アクションをredo済みとしてマーク。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn mark_action_redone(action_id: i64) -> Result<(), String>` |
| パラメータ | `action_id: i64` |
| 戻り値 | なし |
| TSラッパー | `markActionRedone(actionId)` |

---

## エクスポート/インポート（3コマンド）

### `export_metadata_json`

全メタデータをJSON形式でエクスポート（画像、グループ、メンバーシップ）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn export_metadata_json(output_path: String) -> Result<String, String>` |
| パラメータ | `output_path: String` — 出力ファイルパス |
| 戻り値 | `String` — 出力ファイルパス |
| TSラッパー | `exportMetadataJson(outputPath)` |

### `export_metadata_csv`

画像メタデータをCSV形式でエクスポート。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn export_metadata_csv(output_path: String) -> Result<String, String>` |
| パラメータ | `output_path: String` — 出力ファイルパス |
| 戻り値 | `String` — 出力ファイルパス |
| TSラッパー | `exportMetadataCsv(outputPath)` |

### `import_metadata_json`

JSONファイルからメタデータをインポート（file_path でマッチ）。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn import_metadata_json(input_path: String) -> Result<String, String>` |
| パラメータ | `input_path: String` — 入力ファイルパス |
| 戻り値 | `String` — インポート結果サマリー |
| 備考 | 画像はfile_pathでマッチ更新、グループは名前でマッチ/新規作成 |
| TSラッパー | `importMetadataJson(inputPath)` |

---

## ファイルウォッチャー（3コマンド）

### `start_file_watcher`

指定ディレクトリのファイル変更監視を開始。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn start_file_watcher(app: AppHandle, paths: Vec<String>) -> Result<(), String>` |
| パラメータ | `paths: Vec<String>` — 監視ディレクトリパス配列 |
| 戻り値 | なし |
| 定義場所 | `commands.rs`（`watcher.rs` に委譲） |
| TSラッパー | `startFileWatcher(paths)` |

### `stop_file_watcher`

ファイル監視を停止。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn stop_file_watcher(app: AppHandle) -> Result<(), String>` |
| パラメータ | なし |
| 戻り値 | なし |
| TSラッパー | `stopFileWatcher()` |

### `get_watched_directories`

現在監視中のディレクトリパスを取得。

| 項目 | 値 |
|------|-----|
| Rust関数 | `pub fn get_watched_directories(app: AppHandle) -> Result<Vec<String>, String>` |
| パラメータ | なし |
| 戻り値 | `Vec<String>` — 監視中パス配列 |
| TSラッパー | `getWatchedDirectories()` |

---

## フロントエンド専用関数（tauri-commands.ts）

以下の関数は Tauri コマンドではなく、`tauri-plugin-sql` で直接SQLiteにアクセスする。

| 関数 | 説明 |
|------|------|
| `getAllImages()` | 全画像を取得（SELECT * FROM images） |
| `getImagesByDirectoryId(directoryId)` | ディレクトリIDで画像をフィルタ取得 |
| `updateImageMetadata(data)` | 画像メタデータを更新（rating, comment, tags, is_favorite） |
| `selectAndAddDirectory()` | ダイアログ表示 → ディレクトリ追加のヘルパー |

## コマンド数サマリー

| カテゴリ | 数 |
|----------|-----|
| DB管理 | 4 |
| ファイル操作 | 2 |
| 動画処理 | 2 |
| グループ管理 | 8 |
| グループ詳細 | 2 |
| コメント | 3 |
| マルチディレクトリ | 6 |
| Undo/Redo | 5 |
| エクスポート/インポート | 3 |
| ファイルウォッチャー | 3 |
| **合計** | **38** |
