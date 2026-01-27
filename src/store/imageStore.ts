import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ImageData, FileType, GroupData } from '../types/image';

/**
 * ソート基準の型
 */
export type SortBy = 'name' | 'created_at' | 'rating';

/**
 * ソート順序の型
 */
export type SortOrder = 'asc' | 'desc';

/**
 * タグフィルターモードの型
 */
export type TagFilterMode = 'any' | 'all';

/**
 * フィルター設定の型
 */
export interface FilterSettings {
  /** ファイルタイプフィルター（'all' | 'image' | 'video'） */
  fileType: FileType | 'all';
  /** 最低評価値（0-5） */
  minRating: number;
  /** 選択されたタグ（空配列は全てを表示） */
  selectedTags: string[];
  /** タグフィルターモード（'any': OR検索, 'all': AND検索） */
  tagFilterMode: TagFilterMode;
  /** お気に入りのみ表示 */
  showOnlyFavorites: boolean;
}

/**
 * スライドショーの再生間隔（秒）
 */
export type SlideshowInterval = 3 | 5 | 10;

/**
 * 画像ギャラリーのグローバル状態を管理するストアのインターフェース
 */
interface ImageStore {
  /** 読み込まれた画像データの配列 */
  images: ImageData[];
  /** 現在選択されているディレクトリのパス */
  currentDirectory: string | null;
  /** 詳細表示で選択されている画像のID（未選択時はnull） */
  selectedImageId: number | null;
  /** データ読み込み中かどうかを示すフラグ */
  isLoading: boolean;
  /** エラーメッセージ（エラーがない場合はnull） */
  error: string | null;
  /** ソート基準 */
  sortBy: SortBy;
  /** ソート順序 */
  sortOrder: SortOrder;
  /** フィルター設定 */
  filterSettings: FilterSettings;
  /** 検索クエリ */
  searchQuery: string;
  /** スライドショーが有効かどうか */
  isSlideshowActive: boolean;
  /** スライドショーの再生間隔（秒） */
  slideshowInterval: SlideshowInterval;

  // Phase 4: グループ管理
  /** 読み込まれたグループの配列 */
  groups: GroupData[];
  /** 複数選択モードかどうか */
  isSelectionMode: boolean;
  /** 選択された画像IDの配列（複数選択用） */
  selectedImageIds: number[];
  /** 選択されたグループID（フィルター用、nullは全て表示） */
  selectedGroupId: number | null;

  /** 画像データの配列を設定します */
  setImages: (images: ImageData[]) => void;
  /** 現在のディレクトリパスを設定します */
  setCurrentDirectory: (path: string | null) => void;
  /** 選択された画像IDを設定します */
  setSelectedImageId: (id: number | null) => void;
  /** ローディング状態を設定します */
  setLoading: (isLoading: boolean) => void;
  /** エラーメッセージを設定します */
  setError: (error: string | null) => void;
  /** 特定の画像のデータを更新します */
  updateImage: (id: number, data: Partial<ImageData>) => void;
  /** お気に入り状態を切り替えます */
  toggleFavorite: (id: number) => void;
  /** エラーメッセージをクリアします */
  clearError: () => void;
  /** ストアの状態を初期値にリセットします */
  reset: () => void;
  /** ソート基準を設定します */
  setSortBy: (sortBy: SortBy) => void;
  /** ソート順序を設定します */
  setSortOrder: (sortOrder: SortOrder) => void;
  /** フィルター設定を更新します */
  setFilterSettings: (settings: Partial<FilterSettings>) => void;
  /** フィルター設定をリセットします */
  resetFilters: () => void;
  /** 検索クエリを設定します */
  setSearchQuery: (query: string) => void;
  /** 全てのタグを取得します */
  getAllTags: () => string[];
  /** タグと使用数を取得します */
  getTagsWithCount: () => Array<{ tag: string; count: number }>;
  /** フィルター済みでソート済みの画像配列を取得します */
  getSortedAndFilteredImages: () => ImageData[];
  /** ソート済みの画像配列を取得します（後方互換性のため残す） */
  getSortedImages: () => ImageData[];
  /** スライドショーを開始します */
  startSlideshow: () => void;
  /** スライドショーを停止します */
  stopSlideshow: () => void;
  /** スライドショーの再生/一時停止を切り替えます */
  toggleSlideshow: () => void;
  /** スライドショーの再生間隔を設定します */
  setSlideshowInterval: (interval: SlideshowInterval) => void;

  // Phase 4: グループ関連アクション
  /** グループの配列を設定します */
  setGroups: (groups: GroupData[]) => void;
  /** グループを追加します */
  addGroup: (group: GroupData) => void;
  /** グループを更新します */
  updateGroup: (id: number, data: Partial<GroupData>) => void;
  /** グループを削除します */
  removeGroup: (id: number) => void;
  /** 選択モードを切り替えます */
  toggleSelectionMode: () => void;
  /** 画像の選択状態を切り替えます */
  toggleImageSelection: (id: number) => void;
  /** すべての画像を選択/解除します */
  toggleSelectAll: () => void;
  /** 選択をクリアします */
  clearSelection: () => void;
  /** 選択されたグループIDを設定します */
  setSelectedGroupId: (id: number | null) => void;
}

/**
 * 画像ギャラリーのグローバル状態管理用Zustandストア
 */
const defaultFilterSettings: FilterSettings = {
  fileType: 'all',
  minRating: 0,
  selectedTags: [],
  tagFilterMode: 'any',
  showOnlyFavorites: false,
};

export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      images: [],
      currentDirectory: null,
      selectedImageId: null,
      isLoading: false,
      error: null,
      sortBy: 'created_at',
      sortOrder: 'desc',
      filterSettings: defaultFilterSettings,
      searchQuery: '',
      isSlideshowActive: false,
      slideshowInterval: 5,

      // Phase 4: グループ管理
      groups: [],
      isSelectionMode: false,
      selectedImageIds: [],
      selectedGroupId: null,

      setImages: (images) => set({ images }),
      setCurrentDirectory: (path) => set({ currentDirectory: path }),
      setSelectedImageId: (id) => set({ selectedImageId: id }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      updateImage: (id, data) =>
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, ...data } : img
          ),
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, is_favorite: img.is_favorite === 1 ? 0 : 1 } : img
          ),
        })),
      clearError: () => set({ error: null }),
      reset: () => set({ images: [], currentDirectory: null, selectedImageId: null, isLoading: false, error: null }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setFilterSettings: (settings) =>
        set((state) => ({
          filterSettings: { ...state.filterSettings, ...settings },
        })),
      resetFilters: () => set({ filterSettings: defaultFilterSettings }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      getAllTags: () => {
        const { images } = get();
        const tagsSet = new Set<string>();
        images.forEach((img) => {
          img.tags.forEach((tag) => tagsSet.add(tag));
        });
        return Array.from(tagsSet).sort();
      },
      getTagsWithCount: () => {
        const { images } = get();
        const tagCounts = new Map<string, number>();
        images.forEach((img) => {
          img.tags.forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });
        return Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count); // Sort by count descending
      },
      getSortedAndFilteredImages: () => {
        const { images, sortBy, sortOrder, filterSettings, searchQuery } = get();

        // フィルタリング
        let filtered = images.filter((img) => {
          // 検索クエリでフィルター
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const fileName = img.file_name.toLowerCase();
            if (!fileName.includes(query)) {
              return false;
            }
          }
          // お気に入りフィルター
          if (filterSettings.showOnlyFavorites && img.is_favorite !== 1) {
            return false;
          }

          // ファイルタイプでフィルター
          if (filterSettings.fileType !== 'all' && img.file_type !== filterSettings.fileType) {
            return false;
          }

          // 評価でフィルター
          if (img.rating < filterSettings.minRating) {
            return false;
          }

          // タグでフィルター（選択されたタグがある場合のみ）
          if (filterSettings.selectedTags.length > 0) {
            if (filterSettings.tagFilterMode === 'all') {
              // AND検索: 選択されたタグを全て含む
              const hasAllTags = filterSettings.selectedTags.every((tag) =>
                img.tags.includes(tag)
              );
              if (!hasAllTags) {
                return false;
              }
            } else {
              // OR検索: 選択されたタグのいずれかを含む
              const hasAnyTag = filterSettings.selectedTags.some((tag) =>
                img.tags.includes(tag)
              );
              if (!hasAnyTag) {
                return false;
              }
            }
          }

          return true;
        });

        // ソート
        const sorted = [...filtered].sort((a, b) => {
          let comparison = 0;

          switch (sortBy) {
            case 'name':
              comparison = a.file_name.localeCompare(b.file_name);
              break;
            case 'created_at':
              comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              break;
            case 'rating':
              comparison = a.rating - b.rating;
              break;
          }

          return sortOrder === 'asc' ? comparison : -comparison;
        });

        return sorted;
      },
      getSortedImages: () => {
        // 後方互換性のため、getSortedAndFilteredImagesを呼び出す
        return get().getSortedAndFilteredImages();
      },
      startSlideshow: () => set({ isSlideshowActive: true }),
      stopSlideshow: () => set({ isSlideshowActive: false }),
      toggleSlideshow: () => set((state) => ({ isSlideshowActive: !state.isSlideshowActive })),
      setSlideshowInterval: (interval) => set({ slideshowInterval: interval }),

      // Phase 4: グループ関連アクション
      setGroups: (groups) => set({ groups }),
      addGroup: (group) =>
        set((state) => ({
          groups: [group, ...state.groups],
        })),
      updateGroup: (id, data) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        })),
      removeGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          // 削除したグループが選択されていたらクリア
          selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
        })),
      toggleSelectionMode: () =>
        set((state) => ({
          isSelectionMode: !state.isSelectionMode,
          // 選択モード終了時は選択をクリア
          selectedImageIds: state.isSelectionMode ? [] : state.selectedImageIds,
        })),
      toggleImageSelection: (id) =>
        set((state) => ({
          selectedImageIds: state.selectedImageIds.includes(id)
            ? state.selectedImageIds.filter((imgId) => imgId !== id)
            : [...state.selectedImageIds, id],
        })),
      toggleSelectAll: () =>
        set((state) => {
          const filteredImages = state.getSortedAndFilteredImages();
          const allSelected =
            filteredImages.length > 0 &&
            filteredImages.every((img) => state.selectedImageIds.includes(img.id));
          return {
            selectedImageIds: allSelected
              ? []
              : filteredImages.map((img) => img.id),
          };
        }),
      clearSelection: () => set({ selectedImageIds: [] }),
      setSelectedGroupId: (id) => set({ selectedGroupId: id }),
    }),
    {
      name: 'image-gallery-settings',
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        filterSettings: state.filterSettings,
        slideshowInterval: state.slideshowInterval,
        selectedGroupId: state.selectedGroupId, // グループフィルターを永続化
      }),
    }
  )
);
