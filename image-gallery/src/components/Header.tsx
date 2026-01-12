import { useState } from 'react';
import { FolderOpen, Settings, ArrowUpDown } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import type { SortBy } from '../store/imageStore';
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';
import SettingsModal from './SettingsModal';

/**
 * アプリケーションヘッダーコンポーネント
 * ディレクトリ選択ボタンと統計情報を表示します
 */
export default function Header() {
  const { images, setImages, setCurrentDirectory, setLoading, setError, sortBy, sortOrder, setSortBy, setSortOrder } = useImageStore();
  const [showSettings, setShowSettings] = useState(false);

  // 画像と動画の件数を計算
  const imageCount = images.filter(m => m.file_type === 'image').length;
  const videoCount = images.filter(m => m.file_type === 'video').length;

  const handleSelectDirectory = async () => {
    try {
      setLoading(true);
      setError(null);

      // ディレクトリ選択ダイアログを表示
      const path = await selectDirectory();

      if (path) {
        console.log('Selected directory:', path);

        // ディレクトリ内の画像をスキャン
        const images = await scanDirectory(path);
        console.log(`Scanned ${images.length} images`);

        setImages(images);
        setCurrentDirectory(path);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to select directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <>
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Gallery</h1>
          {images.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
              {videoCount > 0 && (
                <>, {videoCount} {videoCount === 1 ? 'video' : 'videos'}</>
              )}
            </p>
          )}
        </div>

        {/* ソートコントロール */}
        {images.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="created_at">Date</option>
              <option value="rating">Rating</option>
            </select>
            <button
              onClick={handleToggleSortOrder}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
              title={`${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown size={16} />
              <span className="text-sm">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
            Settings
          </button>
          <button
            onClick={handleSelectDirectory}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            <FolderOpen size={20} />
            Select Directory
          </button>
        </div>
      </header>

      {/* 設定モーダル */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
