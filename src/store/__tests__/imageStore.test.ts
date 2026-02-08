import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useImageStore } from '../imageStore';
import { makeImage } from '../../test-utils';
import type { ImageData } from '../../types/image';

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
    store.clearSelection();
    useImageStore.setState({ toasts: [], isRepImageSelectionMode: false, repImageSelectionGroupId: null });
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

  describe('group filtering', () => {
    it('filters images by selectedGroupId and groupFilteredImageIds', () => {
      const store = useImageStore.getState();
      store.setSelectedGroupId(1);
      store.setGroupFilteredImageIds([1, 3]);
      const filtered = store.getSortedImages();
      expect(filtered.map((i) => i.id).sort()).toEqual([1, 3]);
    });

    it('toggleSelectAll selects all filtered images', () => {
      const store = useImageStore.getState();
      store.toggleSelectAll();
      const state = useImageStore.getState();
      expect(state.selectedImageIds.sort()).toEqual([1, 2, 3, 4]);
    });

    it('toggleSelectAll deselects when all are selected', () => {
      const store = useImageStore.getState();
      store.toggleSelectAll();
      // All selected, now toggle again
      useImageStore.getState().toggleSelectAll();
      expect(useImageStore.getState().selectedImageIds).toEqual([]);
    });
  });

  describe('resetAllModes', () => {
    it('resets isSelectionMode and isRepImageSelectionMode', () => {
      const store = useImageStore.getState();
      store.toggleSelectionMode();
      store.toggleImageSelection(1);
      store.setRepImageSelectionMode(true, 5);

      useImageStore.getState().resetAllModes();
      const state = useImageStore.getState();
      expect(state.isSelectionMode).toBe(false);
      expect(state.selectedImageIds).toEqual([]);
      expect(state.isRepImageSelectionMode).toBe(false);
      expect(state.repImageSelectionGroupId).toBe(null);
    });
  });

  describe('toast', () => {
    it('showToast adds to toasts array', () => {
      vi.useFakeTimers();
      const store = useImageStore.getState();
      store.showToast('Test message', 'success');
      const state = useImageStore.getState();
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Test message');
      expect(state.toasts[0].type).toBe('success');
      vi.useRealTimers();
    });

    it('removeToast removes specified toast', () => {
      vi.useFakeTimers();
      const store = useImageStore.getState();
      store.showToast('Toast A', 'info');
      store.showToast('Toast B', 'error');
      const toasts = useImageStore.getState().toasts;
      expect(toasts).toHaveLength(2);

      useImageStore.getState().removeToast(toasts[0].id);
      expect(useImageStore.getState().toasts).toHaveLength(1);
      expect(useImageStore.getState().toasts[0].message).toBe('Toast B');
      vi.useRealTimers();
    });
  });

  describe('view mode', () => {
    it('setViewMode changes view mode', () => {
      const store = useImageStore.getState();
      store.setViewMode('list');
      expect(useImageStore.getState().viewMode).toBe('list');
      store.setViewMode('timeline');
      expect(useImageStore.getState().viewMode).toBe('timeline');
      store.setViewMode('grid');
      expect(useImageStore.getState().viewMode).toBe('grid');
    });

    it('setGridDensity changes grid density', () => {
      const store = useImageStore.getState();
      store.setGridDensity('compact');
      expect(useImageStore.getState().gridDensity).toBe('compact');
      store.setGridDensity('comfortable');
      expect(useImageStore.getState().gridDensity).toBe('comfortable');
      store.setGridDensity('normal');
      expect(useImageStore.getState().gridDensity).toBe('normal');
    });

    it('toggleSidebarCollapsed toggles sidebar state', () => {
      const store = useImageStore.getState();
      expect(store.isSidebarCollapsed).toBe(false);
      store.toggleSidebarCollapsed();
      expect(useImageStore.getState().isSidebarCollapsed).toBe(true);
      useImageStore.getState().toggleSidebarCollapsed();
      expect(useImageStore.getState().isSidebarCollapsed).toBe(false);
    });
  });

  describe('slideshow', () => {
    it('startSlideshow sets isSlideshowActive to true', () => {
      const store = useImageStore.getState();
      store.startSlideshow();
      expect(useImageStore.getState().isSlideshowActive).toBe(true);
    });

    it('stopSlideshow sets isSlideshowActive to false', () => {
      const store = useImageStore.getState();
      store.startSlideshow();
      useImageStore.getState().stopSlideshow();
      expect(useImageStore.getState().isSlideshowActive).toBe(false);
    });

    it('setSlideshowInterval sets interval value', () => {
      const store = useImageStore.getState();
      store.setSlideshowInterval(10);
      expect(useImageStore.getState().slideshowInterval).toBe(10);
      useImageStore.getState().setSlideshowInterval(3);
      expect(useImageStore.getState().slideshowInterval).toBe(3);
    });
  });
});
