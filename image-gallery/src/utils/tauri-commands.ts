import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { ImageData, ImageMetadataUpdate } from '../types/image';

/**
 * ファイルシステムからスキャンされた画像ファイル情報
 */
interface ImageFileInfo {
  file_path: string;
  file_name: string;
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
 * 指定されたディレクトリ内の画像をスキャンしてデータベースに登録します
 * @param path スキャンするディレクトリのパス
 * @returns スキャンされた画像データの配列
 */
export async function scanDirectory(path: string): Promise<ImageData[]> {
  // ファイルシステムから画像ファイルをスキャン
  const fileInfos = await invoke<ImageFileInfo[]>('scan_directory', { path });

  // データベースに接続
  const db = await getDatabase();

  try {
    // データベースに画像を挿入
    for (const fileInfo of fileInfos) {
      // 既に存在するかチェック
      const existing = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM images WHERE file_path = $1',
        [fileInfo.file_path]
      );

      if (existing[0].count === 0) {
        // 存在しない場合は挿入
        await db.execute(
          'INSERT INTO images (file_path, file_name) VALUES ($1, $2)',
          [fileInfo.file_path, fileInfo.file_name]
        );
      }
    }

    // すべての画像を取得して返す
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
      comment: string | null;
      tags: string | null;
      rating: number;
      created_at: string;
      updated_at: string;
    }>>(
      'SELECT id, file_path, file_name, comment, tags, rating, created_at, updated_at FROM images ORDER BY created_at DESC'
    );

    // tagsをJSON文字列から配列にパース
    return results.map((row) => ({
      id: row.id,
      file_path: row.file_path,
      file_name: row.file_name,
      comment: row.comment,
      tags: row.tags ? JSON.parse(row.tags) : [],
      rating: row.rating,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } finally {
    await db.close();
  }
}

/**
 * 指定されたIDの画像データを取得します
 * @param _id 画像ID
 * @returns 画像データ、または見つからない場合はnull
 * @todo ステップ6で実装
 */
export async function getImageById(_id: number): Promise<ImageData | null> {
  // TODO: ステップ6で実装
  throw new Error('getImageById not yet implemented - will be added in Step 6');
}

/**
 * 画像のメタデータを更新します
 * @param _data 更新するメタデータ
 * @todo ステップ7で実装
 */
export async function updateImageMetadata(
  _data: ImageMetadataUpdate
): Promise<void> {
  // TODO: ステップ7で実装
  throw new Error('updateImageMetadata not yet implemented - will be added in Step 7');
}
