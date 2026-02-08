import { describe, it, expect, beforeEach } from 'vitest';
import { useImageStore } from '../imageStore';
import type { ImageData } from '../../types/image';

const makeImage = (overrides: Partial<ImageData> = {}): ImageData => ({
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

const sampleImages: ImageData[] = [
  makeImage({ id: 1, file_name: 'banana.jpg', rating: 3, created_at: '2026-01-10T00:00:00Z', tags: ['fruit', 'yellow'] }),
  makeImage({ id: 2, file_name: 'apple.jpg', rating: 5, created_at: '2026-01-20T00:00:00Z', tags: ['fruit', 'red'], is_favorite: 1 }),
  makeImage({ id: 3, file_name: 'cherry.jpg', rating: 1, created_at: '2026-01-15T00:00:00Z', tags: ['fruit'] }),
  makeImage({ id: 4, file_name: 'video.mp4', file_type: 'video', rating: 4, created_at: '2026-01-25T00:00:00Z', tags: ['video'] }),
];

describe('imageStore', () => {
  beforeEach(() => {
    const store = useImageStore.getState();
    store.reset();
    store.setImages(sampleImages);
    store.setSortBy('created_at');
    store.setSortOrder('desc');
    store.setFilterSettings({
      fileType: 'all',
      minRating: 0,
      selectedTags: [],
      tagFilterMode: 'any',
      showOnlyFavorites: false,
    });
    store.setSearchQuery('');
    store.setSelectedGroupId(null);
  });

  describe('sorting', () => {
    it('sorts by name ascending', () => {
      const store = useImageStore.getState();
      store.setSortBy('name');
      store.setSortOrder('asc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.file_name)).toEqual(['apple.jpg', 'banana.jpg', 'cherry.jpg', 'video.mp4']);
    });

    it('sorts by name descending', () => {
      const store = useImageStore.getState();
      store.setSortBy('name');
      store.setSortOrder('desc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.file_name)).toEqual(['video.mp4', 'cherry.jpg', 'banana.jpg', 'apple.jpg']);
    });

    it('sorts by created_at ascending', () => {
      const store = useImageStore.getState();
      store.setSortBy('created_at');
      store.setSortOrder('asc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.id)).toEqual([1, 3, 2, 4]);
    });

    it('sorts by created_at descending', () => {
      const store = useImageStore.getState();
      store.setSortBy('created_at');
      store.setSortOrder('desc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.id)).toEqual([4, 2, 3, 1]);
    });

    it('sorts by rating ascending', () => {
      const store = useImageStore.getState();
      store.setSortBy('rating');
      store.setSortOrder('asc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.rating)).toEqual([1, 3, 4, 5]);
    });

    it('sorts by rating descending', () => {
      const store = useImageStore.getState();
      store.setSortBy('rating');
      store.setSortOrder('desc');
      const sorted = store.getSortedImages();
      expect(sorted.map((i) => i.rating)).toEqual([5, 4, 3, 1]);
    });
  });

  describe('filtering', () => {
    it('filters by fileType image', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ fileType: 'image' });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(3);
      expect(filtered.every((i) => i.file_type === 'image')).toBe(true);
    });

    it('filters by fileType video', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ fileType: 'video' });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].file_type).toBe('video');
    });

    it('filters by minRating', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ minRating: 4 });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((i) => i.rating >= 4)).toBe(true);
    });

    it('filters by favorites', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ showOnlyFavorites: true });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it('filters by search query', () => {
      const store = useImageStore.getState();
      store.setSearchQuery('apple');
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].file_name).toBe('apple.jpg');
    });

    it('filters by tags ANY mode', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ selectedTags: ['yellow', 'red'], tagFilterMode: 'any' });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id).sort()).toEqual([1, 2]);
    });

    it('filters by tags ALL mode', () => {
      const store = useImageStore.getState();
      store.setFilterSettings({ selectedTags: ['fruit', 'yellow'], tagFilterMode: 'all' });
      const filtered = store.getSortedImages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });
  });

  describe('getAllTags', () => {
    it('returns unique sorted tags', () => {
      const store = useImageStore.getState();
      const tags = store.getAllTags();
      expect(tags).toEqual(['fruit', 'red', 'video', 'yellow']);
    });
  });

  describe('getTagsWithCount', () => {
    it('returns tags sorted by count descending', () => {
      const store = useImageStore.getState();
      const tagsWithCount = store.getTagsWithCount();
      expect(tagsWithCount[0]).toEqual({ tag: 'fruit', count: 3 });
      expect(tagsWithCount).toHaveLength(4);
    });
  });

  describe('selection mode', () => {
    it('toggles selection mode', () => {
      const store = useImageStore.getState();
      expect(store.isSelectionMode).toBe(false);
      store.toggleSelectionMode();
      expect(useImageStore.getState().isSelectionMode).toBe(true);
    });

    it('toggles image selection', () => {
      const store = useImageStore.getState();
      store.toggleSelectionMode();
      store.toggleImageSelection(1);
      expect(useImageStore.getState().selectedImageIds).toEqual([1]);
      store.toggleImageSelection(2);
      expect(useImageStore.getState().selectedImageIds).toEqual([1, 2]);
      store.toggleImageSelection(1);
      expect(useImageStore.getState().selectedImageIds).toEqual([2]);
    });

    it('clears selection when exiting selection mode', () => {
      const store = useImageStore.getState();
      store.toggleSelectionMode();
      store.toggleImageSelection(1);
      store.toggleImageSelection(2);
      store.toggleSelectionMode();
      expect(useImageStore.getState().selectedImageIds).toEqual([]);
      expect(useImageStore.getState().isSelectionMode).toBe(false);
    });

    it('clears selection explicitly', () => {
      const store = useImageStore.getState();
      store.toggleSelectionMode();
      store.toggleImageSelection(1);
      store.clearSelection();
      expect(useImageStore.getState().selectedImageIds).toEqual([]);
    });
  });

  describe('toggleFavorite', () => {
    it('toggles favorite status', () => {
      const store = useImageStore.getState();
      store.toggleFavorite(1);
      const updated = useImageStore.getState().images.find((i) => i.id === 1);
      expect(updated?.is_favorite).toBe(1);
      store.toggleFavorite(1);
      const toggled = useImageStore.getState().images.find((i) => i.id === 1);
      expect(toggled?.is_favorite).toBe(0);
    });
  });

  describe('updateImage', () => {
    it('updates partial image data', () => {
      const store = useImageStore.getState();
      store.updateImage(1, { comment: 'test comment', rating: 5 });
      const updated = useImageStore.getState().images.find((i) => i.id === 1);
      expect(updated?.comment).toBe('test comment');
      expect(updated?.rating).toBe(5);
    });
  });
});
