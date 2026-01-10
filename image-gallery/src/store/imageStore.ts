import { create } from 'zustand';
import type { ImageData } from '../types/image';

/**
 * 画像ギャラリーのグローバル状態を管理するストアのインターフェース
 */
interface ImageStore {
  /** 読み込まれた画像データの配列 */
  images: ImageData[];
  /** 現在選択されているディレクトリのパス */
  currentDirectory: string | null;
  /** データ読み込み中かどうかを示すフラグ */
  isLoading: boolean;
  /** エラーメッセージ（エラーがない場合はnull） */
  error: string | null;

  /** 画像データの配列を設定します */
  setImages: (images: ImageData[]) => void;
  /** 現在のディレクトリパスを設定します */
  setCurrentDirectory: (path: string | null) => void;
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
}

/**
 * 画像ギャラリーのグローバル状態管理用Zustandストア
 */
export const useImageStore = create<ImageStore>((set) => ({
  images: [],
  currentDirectory: null,
  isLoading: false,
  error: null,

  setImages: (images) => set({ images }),
  setCurrentDirectory: (path) => set({ currentDirectory: path }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateImage: (id, data) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...data } : img
      ),
    })),
  clearError: () => set({ error: null }),
  reset: () => set({ images: [], currentDirectory: null, isLoading: false, error: null }),
}));
