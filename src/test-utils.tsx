import { render } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import type { ImageData, GroupData } from './types/image';
import { useImageStore } from './store/imageStore';
import type { ReactElement } from 'react';

/**
 * ImageData ファクトリ関数
 */
export const makeImage = (overrides: Partial<ImageData> = {}): ImageData => ({
  id: 1,
  file_path: '/path/to/image.jpg',
  file_name: 'image.jpg',
  file_type: 'image',
  comment: null,
  tags: [],
  rating: 0,
  is_favorite: 0,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  duration_seconds: null,
  width: null,
  height: null,
  video_codec: null,
  audio_codec: null,
  thumbnail_path: null,
  directory_id: null,
  ...overrides,
});

/**
 * GroupData ファクトリ関数
 */
export const makeGroup = (overrides: Partial<GroupData> = {}): GroupData => ({
  id: 1,
  name: 'Test Group',
  description: null,
  color: '#3b82f6',
  representative_image_id: null,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  image_count: 0,
  ...overrides,
});

/**
 * ストアをリセットするユーティリティ
 */
export const resetStore = () => {
  useImageStore.getState().reset();
};

/**
 * HashRouter でラップしてレンダーするヘルパー
 */
export const renderWithRouter = (ui: ReactElement) => {
  return render(<HashRouter>{ui}</HashRouter>);
};
