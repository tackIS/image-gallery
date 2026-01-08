import { invoke } from '@tauri-apps/api/core';
import type { ImageData, ImageMetadataUpdate } from '../types/image';

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

// 後のステップで追加する関数のプレースホルダー

/**
 * ディレクトリ選択ダイアログを表示します
 * @returns 選択されたディレクトリのパス、またはキャンセルされた場合はnull
 * @todo ステップ4で実装
 */
export async function selectDirectory(): Promise<string | null> {
  // TODO: ステップ4で実装
  throw new Error('selectDirectory not yet implemented - will be added in Step 4');
}

/**
 * 指定されたディレクトリ内の画像をスキャンしてデータベースに登録します
 * @param _path スキャンするディレクトリのパス
 * @returns スキャンされた画像データの配列
 * @todo ステップ4で実装
 */
export async function scanDirectory(_path: string): Promise<ImageData[]> {
  // TODO: ステップ4で実装
  throw new Error('scanDirectory not yet implemented - will be added in Step 4');
}

/**
 * データベースからすべての画像を取得します
 * @returns すべての画像データの配列
 * @todo ステップ5で実装
 */
export async function getAllImages(): Promise<ImageData[]> {
  // TODO: ステップ5で実装
  throw new Error('getAllImages not yet implemented - will be added in Step 5');
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
