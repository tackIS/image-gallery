import { useEffect, useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { initializeDatabase, getAllGroups, getAllImages, getImagesByDirectoryId } from '../utils/tauri-commands';
import { useDirectoryWatcher } from '../hooks/useDirectoryWatcher';
import Header from './Header';
import Sidebar from './Sidebar';
import ImageGrid from './ImageGrid';
import ImageDetail from './ImageDetail';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import SelectionBar from './SelectionBar';
import Toast from './Toast';
import DndProvider from './dnd/DndProvider';
import UndoRedoBar from './UndoRedoBar';

/**
 * ImageDetailを必要な時だけマウントするラッパー
 */
function ConditionalImageDetail() {
  const selectedImageId = useImageStore(s => s.selectedImageId);
  if (selectedImageId === null) return null;
  return <ImageDetail />;
}

function MainGallery() {
  const hasImages = useImageStore(s => s.images.length > 0);
  const imageCount = useImageStore(s => s.images.length);
  const currentDirectory = useImageStore(s => s.currentDirectory);
  const error = useImageStore(s => s.error);
  const isLoading = useImageStore(s => s.isLoading);
  const isSelectionMode = useImageStore(s => s.isSelectionMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ファイルウォッチャーを起動（アクティブディレクトリの変更を自動検出）
  useDirectoryWatcher();

  useEffect(() => {
    const init = async () => {
      try {
        // データベース初期化とグループ読み込みを並行実行
        const [, groups] = await Promise.all([
          initializeDatabase(),
          getAllGroups(),
        ]);
        useImageStore.getState().setGroups(groups);

        // 既に画像が読み込み済みで、同じディレクトリの場合は再フェッチをスキップ
        const state = useImageStore.getState();
        const dirId = state.selectedDirectoryId;
        if (state.images.length > 0 && dirId === state._lastLoadedDirectoryId) return;

        useImageStore.getState().setLoading(true);

        // selectedDirectoryId に応じて画像をロード
        if (dirId !== null) {
          const dirImages = await getImagesByDirectoryId(dirId);
          useImageStore.getState().setImages(dirImages);
        } else {
          const allImages = await getAllImages();
          useImageStore.getState().setImages(allImages);
        }
        useImageStore.setState({ _lastLoadedDirectoryId: dirId });
      } catch (err) {
        useImageStore.getState().setError(err instanceof Error ? err.message : String(err));
        console.error('Database initialization error:', err);
      } finally {
        useImageStore.getState().setLoading(false);
      }
    };
    init();
  }, []);

  // キーボードショートカット（getState()で常に最新状態を参照）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          const state = useImageStore.getState();
          if (state.isSelectionMode) {
            state.clearSelection();
            state.toggleSelectionMode();
          }
        }
        return;
      }

      const state = useImageStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && state.isSelectionMode) {
        e.preventDefault();
        state.toggleSelectAll();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && state.isSelectionMode) {
        e.preventDefault();
        state.clearSelection();
      }

      if (e.key === 'Escape' && state.isSelectionMode) {
        state.clearSelection();
        state.toggleSelectionMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <DndProvider>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* サイドバー */}
          <Sidebar isOpen={isSidebarOpen} />

          {/* メインコンテンツ */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {error && (
              <div className="shrink-0 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded mb-4 mx-4">
                Error: {error}
              </div>
            )}

            {isLoading && <LoadingSpinner />}

            {!isLoading && currentDirectory && (
              <div className="shrink-0 px-4 pt-4 pb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current directory: <span className="font-medium dark:text-gray-300">{currentDirectory}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Images found: <span className="font-medium dark:text-gray-300">{imageCount}</span>
                </p>
              </div>
            )}

            {!isLoading && !hasImages && <EmptyState />}

            {!isLoading && hasImages && <ImageGrid />}
          </main>
        </div>

        {/* 選択バー（選択モード時） */}
        {isSelectionMode && <SelectionBar />}

        {/* Undo/Redo バー */}
        <UndoRedoBar />

        {/* トースト通知 */}
        <Toast />

        {/* 画像詳細モーダル（選択時のみマウント） */}
        <ConditionalImageDetail />
      </div>
    </DndProvider>
  );
}

export default MainGallery;
