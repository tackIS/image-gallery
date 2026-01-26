import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { ImageData, ImageMetadataUpdate } from '../types/image';

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
    // データベースにファイルを挿入
    for (const fileInfo of fileInfos) {
      // 既に存在するかチェック
      const existing = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM images WHERE file_path = $1',
        [fileInfo.file_path]
      );

      if (existing[0].count === 0) {
        // 存在しない場合は挿入（file_typeとメタデータはバックエンドで判定済み）
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
    }>>(
      'SELECT id, file_path, file_name, file_type, comment, tags, rating, is_favorite, created_at, updated_at, duration_seconds, width, height, video_codec, audio_codec, thumbnail_path FROM images ORDER BY created_at DESC'
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
