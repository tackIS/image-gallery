import { useEffect, useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { initializeDatabase, getDatabasePath, getAllGroups } from '../utils/tauri-commands';
import Header from './Header';
import Sidebar from './Sidebar';
import ImageGrid from './ImageGrid';
import ImageDetail from './ImageDetail';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import SelectionBar from './SelectionBar';
import Toast from './Toast';

function MainGallery() {
  const {
    images,
    currentDirectory,
    error,
    isLoading,
    setError,
    setLoading,
    setGroups,
    isSelectionMode,
    toggleSelectAll,
    clearSelection,
    toggleSelectionMode,
    setSelectedGroupId,
    setGroupFilteredImageIds,
  } = useImageStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // メインギャラリーに戻った時にグループフィルター状態をクリア
  useEffect(() => {
    setSelectedGroupId(null);
    setGroupFilteredImageIds([]);
  }, [setSelectedGroupId, setGroupFilteredImageIds]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // データベースパスを取得（ディレクトリ作成のみ）
        const dbPath = await getDatabasePath();
        console.log('Database path:', dbPath);

        // データベース初期化（Tauriが自動でマイグレーションを実行）
        await initializeDatabase();
        console.log('Database initialized successfully');

        // グループを読み込み
        const groups = await getAllGroups();
        setGroups(groups);
        console.log(`Loaded ${groups.length} groups`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Database initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setError, setLoading, setGroups]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールド内では動作しない
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        // Escapeだけは入力フィールド内でも動作させる
        if (e.key === 'Escape' && isSelectionMode) {
          clearSelection();
          toggleSelectionMode();
        }
        return;
      }

      // Ctrl/Cmd + A: 全選択
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isSelectionMode) {
        e.preventDefault();
        toggleSelectAll();
      }

      // Ctrl/Cmd + D: 選択解除
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && isSelectionMode) {
        e.preventDefault();
        clearSelection();
      }

      // Escape: 選択モード終了
      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
        toggleSelectionMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, toggleSelectAll, clearSelection, toggleSelectionMode]);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <Sidebar isOpen={isSidebarOpen} />

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded mb-4 mx-4">
              Error: {error}
            </div>
          )}

          {isLoading && <LoadingSpinner />}

          {!isLoading && currentDirectory && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current directory: <span className="font-medium dark:text-gray-300">{currentDirectory}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Images found: <span className="font-medium dark:text-gray-300">{images.length}</span>
              </p>
            </div>
          )}

          {!isLoading && !currentDirectory && <EmptyState />}

          {!isLoading && currentDirectory && images.length > 0 && <ImageGrid />}
        </main>
      </div>

      {/* 選択バー（選択モード時） */}
      {isSelectionMode && <SelectionBar />}

      {/* トースト通知 */}
      <Toast />

      {/* 画像詳細モーダル */}
      <ImageDetail />
    </div>
  );
}

export default MainGallery;
