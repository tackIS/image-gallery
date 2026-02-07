import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { ImageData, ImageMetadataUpdate, GroupData, CreateGroupInput, UpdateGroupInput, GroupComment, AddCommentInput, DirectoryData, ActionLogEntry } from '../types/image';

/**
 * ファイルシステムからスキャンされたメディアファイル情報
 */
interface ImageFileInfo {
  file_path: string;
  file_name: string;
  file_type: string;

  // Phase 3追加
  duration_seconds?: number;
  width?: number;
  height?: number;
  video_codec?: string;
  audio_codec?: string;
}

/**
 * データベースを初期化します
 * @returns 初期化成功メッセージ
 * @throws データベース初期化に失敗した場合
 */
export async function initializeDatabase(): Promise<string> {
  return await invoke<string>('initialize_database');
}

/**
 * データベースファイルの絶対パスを取得します
 * @returns データベースファイルのパス
 * @throws パスの取得に失敗した場合
 */
export async function getDatabasePath(): Promise<string> {
  return await invoke<string>('get_database_path');
}

/**
 * データベースをバックアップします
 * @returns バックアップファイルのパス
 * @throws バックアップに失敗した場合
 */
export async function backupDatabase(): Promise<string> {
  return await invoke<string>('backup_database');
}

/**
 * データベースをリセット（削除）します
 * 注意: この操作は元に戻せません
 * @returns 成功メッセージ
 * @throws リセットに失敗した場合
 */
export async function resetDatabase(): Promise<string> {
  return await invoke<string>('reset_database');
}

/**
 * データベース接続を取得します
 * @returns データベース接続
 */
async function getDatabase(): Promise<Database> {
  const dbPath = await getDatabasePath();
  const dbUrl = `sqlite:${dbPath}`;
  return await Database.load(dbUrl);
}

// 後のステップで追加する関数のプレースホルダー

/**
 * ディレクトリ選択ダイアログを表示します
 * @returns 選択されたディレクトリのパス、またはキャンセルされた場合はnull
 */
export async function selectDirectory(): Promise<string | null> {
  return await invoke<string | null>('select_directory');
}

/**
 * 指定されたディレクトリ内の画像・動画をスキャンしてデータベースに登録します
 * @param path スキャンするディレクトリのパス
 * @returns スキャンされたメディアファイルデータの配列
 */
export async function scanDirectory(path: string): Promise<ImageData[]> {
  // ファイルシステムからメディアファイルをスキャン
  const fileInfos = await invoke<ImageFileInfo[]>('scan_directory', { path });

  // データベースに接続
  const db = await getDatabase();

  try {
    // ディレクトリレコードが存在するか確認、なければ自動作成
    let dirResult = await db.select<{ id: number }[]>(
      'SELECT id FROM directories WHERE path = $1',
      [path]
    );

    let directoryId: number | null = null;
    if (dirResult.length > 0) {
      directoryId = dirResult[0].id;
    } else {
      // ディレクトリ名を抽出
      const dirName = path.split('/').filter(Boolean).pop() || path;
      await db.execute(
        'INSERT INTO directories (path, name) VALUES ($1, $2)',
        [path, dirName]
      );
      dirResult = await db.select<{ id: number }[]>(
        'SELECT id FROM directories WHERE path = $1',
        [path]
      );
      if (dirResult.length > 0) {
        directoryId = dirResult[0].id;
      }
    }

    // データベースにファイルを挿入
    for (const fileInfo of fileInfos) {
      // 既に存在するかチェック
      const existing = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM images WHERE file_path = $1',
        [fileInfo.file_path]
      );

      if (existing[0].count === 0) {
        await db.execute(
          'INSERT INTO images (file_path, file_name, file_type, duration_seconds, width, height, video_codec, audio_codec, directory_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            fileInfo.file_path,
            fileInfo.file_name,
            fileInfo.file_type,
            fileInfo.duration_seconds ?? null,
            fileInfo.width ?? null,
            fileInfo.height ?? null,
            fileInfo.video_codec ?? null,
            fileInfo.audio_codec ?? null,
            directoryId,
          ]
        );
      } else if (directoryId !== null) {
        // 既存画像のdirectory_idを更新（NULLの場合のみ）
        await db.execute(
          'UPDATE images SET directory_id = $1 WHERE file_path = $2 AND directory_id IS NULL',
          [directoryId, fileInfo.file_path]
        );
      }
    }

    // ディレクトリのファイル数とスキャン日時を更新
    if (directoryId !== null) {
      await db.execute(
        'UPDATE directories SET file_count = (SELECT COUNT(*) FROM images WHERE directory_id = $1), last_scanned_at = CURRENT_TIMESTAMP WHERE id = $1',
        [directoryId]
      );
    }

    // すべてのメディアファイルを取得して返す
    return await getAllImages();
  } finally {
    await db.close();
  }
}

/**
 * データベースからすべての画像を取得します
 * @returns すべての画像データの配列
 */
export async function getAllImages(): Promise<ImageData[]> {
  const db = await getDatabase();

  try {
    const results = await db.select<Array<{
      id: number;
      file_path: string;
      file_name: string;
      file_type: string;
      comment: string | null;
      tags: string | null;
      rating: number;
      is_favorite: number;
      created_at: string;
      updated_at: string;
      duration_seconds: number | null;
      width: number | null;
      height: number | null;
      video_codec: string | null;
      audio_codec: string | null;
      thumbnail_path: string | null;
      directory_id: number | null;
    }>>(
      'SELECT id, file_path, file_name, file_type, comment, tags, rating, is_favorite, created_at, updated_at, duration_seconds, width, height, video_codec, audio_codec, thumbnail_path, directory_id FROM images ORDER BY created_at DESC, id DESC'
    );

    // tagsをJSON文字列から配列にパース
    return results.map((row) => ({
      id: row.id,
      file_path: row.file_path,
      file_name: row.file_name,
      file_type: (row.file_type as 'image' | 'video') || 'image',
      comment: row.comment,
      tags: row.tags ? (() => {
        try {
          return JSON.parse(row.tags);
        } catch (e) {
          console.error('Failed to parse tags for image:', row.id, e);
          return [];
        }
      })() : [],
      rating: row.rating,
      is_favorite: row.is_favorite,
      created_at: row.created_at,
      updated_at: row.updated_at,
      duration_seconds: row.duration_seconds,
      width: row.width,
      height: row.height,
      video_codec: row.video_codec,
      audio_codec: row.audio_codec,
      thumbnail_path: row.thumbnail_path,
      directory_id: row.directory_id,
    }));
  } finally {
    await db.close();
  }
}

/**
 * 画像のメタデータを更新します
 * @param data 更新するメタデータ
 */
export async function updateImageMetadata(
  data: ImageMetadataUpdate
): Promise<void> {
  const db = await getDatabase();

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 更新するフィールドを動的に構築
    if (data.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      values.push(data.rating);
    }

    if (data.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      values.push(data.comment);
    }

    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(data.tags));
    }

    if (data.is_favorite !== undefined) {
      updates.push(`is_favorite = $${paramIndex++}`);
      values.push(data.is_favorite);
    }

    // updated_atを現在時刻に更新
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // WHERE句のためのIDを追加
    values.push(data.id);

    const query = `UPDATE images SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

    await db.execute(query, values);
  } finally {
    await db.close();
  }
}

/**
 * ffmpegが利用可能かチェックします
 * @returns ffmpegのパスとバージョン情報
 * @throws ffmpegが見つからない場合
 */
export async function checkFFmpegAvailable(): Promise<string> {
  return await invoke<string>('check_ffmpeg_available');
}

/**
 * 動画のサムネイルを生成します
 * @param videoPath 動画ファイルのパス
 * @param imageId 画像ID
 * @returns サムネイル画像のパス
 * @throws サムネイル生成に失敗した場合
 */
export async function generateVideoThumbnail(
  videoPath: string,
  imageId: number
): Promise<string> {
  return await invoke<string>('generate_video_thumbnail', {
    videoPath,
    imageId,
  });
}

// ============================================================
// Phase 4: グループ管理API
// ============================================================

/**
 * グループを作成します
 * @param input グループ作成入力データ
 * @returns 作成されたグループのID
 * @throws グループ作成に失敗した場合
 */
export async function createGroup(input: CreateGroupInput): Promise<number> {
  return await invoke<number>('create_group', { input });
}

/**
 * すべてのグループを取得します
 * @returns グループデータの配列（画像数を含む）
 * @throws グループ取得に失敗した場合
 */
export async function getAllGroups(): Promise<GroupData[]> {
  return await invoke<GroupData[]>('get_all_groups');
}

/**
 * グループを更新します
 * @param input グループ更新入力データ
 * @throws グループ更新に失敗した場合
 */
export async function updateGroup(input: UpdateGroupInput): Promise<void> {
  return await invoke<void>('update_group', { input });
}

/**
 * グループを削除します
 * @param groupId グループID
 * @throws グループ削除に失敗した場合
 */
export async function deleteGroup(groupId: number): Promise<void> {
  return await invoke<void>('delete_group', { groupId });
}

/**
 * 画像をグループに追加します
 * @param imageIds 画像IDの配列
 * @param groupId グループID
 * @throws 画像追加に失敗した場合
 */
export async function addImagesToGroup(imageIds: number[], groupId: number): Promise<void> {
  return await invoke<void>('add_images_to_group', { imageIds, groupId });
}

/**
 * 画像をグループから削除します
 * @param imageIds 画像IDの配列
 * @param groupId グループID
 * @throws 画像削除に失敗した場合
 */
export async function removeImagesFromGroup(imageIds: number[], groupId: number): Promise<void> {
  return await invoke<void>('remove_images_from_group', { imageIds, groupId });
}

/**
 * グループに所属する画像IDの配列を取得します
 * @param groupId グループID
 * @returns 画像IDの配列
 * @throws 画像ID取得に失敗した場合
 */
export async function getGroupImages(groupId: number): Promise<number[]> {
  return await invoke<number[]>('get_group_images', { groupId });
}

/**
 * 画像が所属するグループIDの配列を取得します
 * @param imageId 画像ID
 * @returns グループIDの配列
 * @throws グループID取得に失敗した場合
 */
export async function getImageGroups(imageId: number): Promise<number[]> {
  return await invoke<number[]>('get_image_groups', { imageId });
}

// ============================================================
// Phase 5: グループアルバムビュー & コメント機能
// ============================================================

/**
 * グループIDから詳細情報を取得します
 * @param groupId グループID
 * @returns グループ詳細データ
 * @throws グループ取得に失敗した場合
 */
export async function getGroupById(groupId: number): Promise<GroupData> {
  return await invoke<GroupData>('get_group_by_id', { groupId });
}

/**
 * グループの代表画像を設定します
 * @param groupId グループID
 * @param imageId 代表画像ID（nullで解除）
 * @throws 代表画像設定に失敗した場合
 */
export async function setRepresentativeImage(groupId: number, imageId: number | null): Promise<void> {
  return await invoke<void>('set_representative_image', { groupId, imageId });
}

/**
 * グループコメントを追加します
 * @param input コメント追加入力データ
 * @returns 作成されたコメントのID
 * @throws コメント追加に失敗した場合
 */
export async function addGroupComment(input: AddCommentInput): Promise<number> {
  return await invoke<number>('add_group_comment', { input });
}

/**
 * グループの全コメントを取得します（新しい順）
 * @param groupId グループID
 * @returns グループコメントの配列
 * @throws コメント取得に失敗した場合
 */
export async function getGroupComments(groupId: number): Promise<GroupComment[]> {
  return await invoke<GroupComment[]>('get_group_comments', { groupId });
}

/**
 * グループコメントを削除します
 * @param commentId コメントID
 * @throws コメント削除に失敗した場合
 */
export async function deleteGroupComment(commentId: number): Promise<void> {
  return await invoke<void>('delete_group_comment', { commentId });
}

// ============================================================
// Phase 6: マルチディレクトリ管理API
// ============================================================

/**
 * ディレクトリを追加し、初回スキャンを実行します
 * @param path ディレクトリの絶対パス
 * @returns 追加されたディレクトリ情報
 */
export async function addDirectory(path: string): Promise<DirectoryData> {
  return await invoke<DirectoryData>('add_directory', { path });
}

/**
 * ディレクトリを削除します（画像データは保持）
 * @param directoryId ディレクトリID
 */
export async function removeDirectory(directoryId: number): Promise<void> {
  return await invoke<void>('remove_directory', { directoryId });
}

/**
 * 全ディレクトリを取得します
 * @returns ディレクトリデータの配列
 */
export async function getAllDirectories(): Promise<DirectoryData[]> {
  return await invoke<DirectoryData[]>('get_all_directories');
}

/**
 * ディレクトリのアクティブ状態を設定します
 * @param directoryId ディレクトリID
 * @param isActive アクティブにするかどうか
 */
export async function setDirectoryActive(directoryId: number, isActive: boolean): Promise<void> {
  return await invoke<void>('set_directory_active', { directoryId, isActive });
}

/**
 * 指定ディレクトリを再スキャンしてDBに登録します
 * @param directoryId ディレクトリID
 * @returns スキャンされたファイル情報
 */
export async function scanSingleDirectory(directoryId: number): Promise<ImageData[]> {
  const fileInfos = await invoke<ImageFileInfo[]>('scan_single_directory', { directoryId });
  const db = await getDatabase();

  try {
    for (const fileInfo of fileInfos) {
      const existing = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM images WHERE file_path = $1',
        [fileInfo.file_path]
      );

      if (existing[0].count === 0) {
        await db.execute(
          'INSERT INTO images (file_path, file_name, file_type, duration_seconds, width, height, video_codec, audio_codec, directory_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (SELECT id FROM directories WHERE path = (SELECT path FROM directories WHERE id = $9)))',
          [
            fileInfo.file_path,
            fileInfo.file_name,
            fileInfo.file_type,
            fileInfo.duration_seconds ?? null,
            fileInfo.width ?? null,
            fileInfo.height ?? null,
            fileInfo.video_codec ?? null,
            fileInfo.audio_codec ?? null,
            directoryId,
          ]
        );
      }
    }

    return await getAllImages();
  } finally {
    await db.close();
  }
}

/**
 * 全アクティブディレクトリをスキャンしてDBに登録します
 * @returns 全画像データ
 */
export async function scanAllActiveDirectories(): Promise<ImageData[]> {
  const fileInfos = await invoke<ImageFileInfo[]>('scan_all_active_directories');
  const db = await getDatabase();

  try {
    for (const fileInfo of fileInfos) {
      const existing = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM images WHERE file_path = $1',
        [fileInfo.file_path]
      );

      if (existing[0].count === 0) {
        await db.execute(
          'INSERT INTO images (file_path, file_name, file_type, duration_seconds, width, height, video_codec, audio_codec) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            fileInfo.file_path,
            fileInfo.file_name,
            fileInfo.file_type,
            fileInfo.duration_seconds ?? null,
            fileInfo.width ?? null,
            fileInfo.height ?? null,
            fileInfo.video_codec ?? null,
            fileInfo.audio_codec ?? null,
          ]
        );
      }
    }

    return await getAllImages();
  } finally {
    await db.close();
  }
}

/**
 * ディレクトリ選択ダイアログを表示してディレクトリを追加します
 * @returns 追加されたディレクトリ情報、またはキャンセル時null
 */
export async function selectAndAddDirectory(): Promise<DirectoryData | null> {
  const path = await selectDirectory();
  if (!path) return null;
  return await addDirectory(path);
}

// ============================================================
// Phase 6: Undo/Redo アクションログAPI
// ============================================================

/**
 * アクションをログに記録します
 */
export async function logAction(
  actionType: string,
  targetTable: string,
  targetId: number,
  oldValue: string | null,
  newValue: string | null,
): Promise<number> {
  return await invoke<number>('log_action', {
    actionType,
    targetTable,
    targetId,
    oldValue,
    newValue,
  });
}

/**
 * 最新のundo可能なアクションを取得します
 */
export async function getLastUndoableAction(): Promise<ActionLogEntry | null> {
  return await invoke<ActionLogEntry | null>('get_last_undoable_action');
}

/**
 * 最新のredo可能なアクションを取得します
 */
export async function getLastRedoableAction(): Promise<ActionLogEntry | null> {
  return await invoke<ActionLogEntry | null>('get_last_redoable_action');
}

/**
 * アクションをundo済みとしてマークします
 */
export async function markActionUndone(actionId: number): Promise<void> {
  return await invoke<void>('mark_action_undone', { actionId });
}

/**
 * アクションをredo済みとしてマークします
 */
export async function markActionRedone(actionId: number): Promise<void> {
  return await invoke<void>('mark_action_redone', { actionId });
}

// ============================================================
// Phase 6: エクスポート/インポートAPI
// ============================================================

/**
 * メタデータをJSON形式でエクスポートします
 * @param outputPath 出力先ファイルパス
 * @returns 出力ファイルパス
 */
export async function exportMetadataJson(outputPath: string): Promise<string> {
  return await invoke<string>('export_metadata_json', { outputPath });
}

/**
 * メタデータをCSV形式でエクスポートします
 * @param outputPath 出力先ファイルパス
 * @returns 出力ファイルパス
 */
export async function exportMetadataCsv(outputPath: string): Promise<string> {
  return await invoke<string>('export_metadata_csv', { outputPath });
}

/**
 * JSONファイルからメタデータをインポートします
 * @param inputPath 入力ファイルパス
 * @returns インポート結果サマリー
 */
export async function importMetadataJson(inputPath: string): Promise<string> {
  return await invoke<string>('import_metadata_json', { inputPath });
}

// ============================================================
// Phase 6: ファイルウォッチャーAPI
// ============================================================

/**
 * ファイルウォッチャーを起動します
 * @param paths 監視するディレクトリパスの配列
 */
export async function startFileWatcher(paths: string[]): Promise<void> {
  return await invoke<void>('start_file_watcher', { paths });
}

/**
 * ファイルウォッチャーを停止します
 */
export async function stopFileWatcher(): Promise<void> {
  return await invoke<void>('stop_file_watcher');
}

/**
 * 現在監視中のディレクトリパスを取得します
 */
export async function getWatchedDirectories(): Promise<string[]> {
  return await invoke<string[]>('get_watched_directories');
}
