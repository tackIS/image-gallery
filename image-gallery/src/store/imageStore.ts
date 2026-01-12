import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ImageData } from '../types/image';

/**
 * ソート基準の型
 */
export type SortBy = 'name' | 'created_at' | 'rating';

/**
 * ソート順序の型
 */
export type SortOrder = 'asc' | 'desc';

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
  /** エラーメッセージをクリアします */
  clearError: () => void;
  /** ストアの状態を初期値にリセットします */
  reset: () => void;
  /** ソート基準を設定します */
  setSortBy: (sortBy: SortBy) => void;
  /** ソート順序を設定します */
  setSortOrder: (sortOrder: SortOrder) => void;
  /** ソート済みの画像配列を取得します */
  getSortedImages: () => ImageData[];
}

/**
 * 画像ギャラリーのグローバル状態管理用Zustandストア
 */
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
      clearError: () => set({ error: null }),
      reset: () => set({ images: [], currentDirectory: null, selectedImageId: null, isLoading: false, error: null }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      getSortedImages: () => {
        const { images, sortBy, sortOrder } = get();
        const sorted = [...images].sort((a, b) => {
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
    }),
    {
      name: 'image-gallery-sort-settings',
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
