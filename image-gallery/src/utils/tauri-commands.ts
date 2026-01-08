import { invoke } from '@tauri-apps/api/core';
import type { ImageData, ImageMetadataUpdate } from '../types/image';

export async function initializeDatabase(): Promise<string> {
  return await invoke<string>('initialize_database');
}

export async function getDatabasePath(): Promise<string> {
  return await invoke<string>('get_database_path');
}

// 後のステップで追加する関数のプレースホルダー
export async function selectDirectory(): Promise<string | null> {
  // TODO: ステップ4で実装
  return null;
}

export async function scanDirectory(_path: string): Promise<ImageData[]> {
  // TODO: ステップ4で実装
  return [];
}

export async function getAllImages(): Promise<ImageData[]> {
  // TODO: ステップ5で実装
  return [];
}

export async function getImageById(_id: number): Promise<ImageData | null> {
  // TODO: ステップ6で実装
  return null;
}

export async function updateImageMetadata(
  _data: ImageMetadataUpdate
): Promise<void> {
  // TODO: ステップ7で実装
}
