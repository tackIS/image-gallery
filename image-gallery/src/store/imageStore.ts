import { create } from 'zustand';
import type { ImageData } from '../types/image';

interface ImageStore {
  images: ImageData[];
  currentDirectory: string | null;
  isLoading: boolean;
  error: string | null;

  setImages: (images: ImageData[]) => void;
  setCurrentDirectory: (path: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateImage: (id: number, data: Partial<ImageData>) => void;
  clearError: () => void;
}

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
}));
