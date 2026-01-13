import { useState } from 'react';
import { FolderOpen, Settings, ArrowUpDown, Filter, X } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import type { SortBy } from '../store/imageStore';
import type { FileType } from '../types/image';
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';
import SettingsModal from './SettingsModal';

/**
 * アプリケーションヘッダーコンポーネント
 * ディレクトリ選択ボタンと統計情報を表示します
 */
export default function Header() {
  const {
    images,
    setImages,
    setCurrentDirectory,
    setLoading,
    setError,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    filterSettings,
    setFilterSettings,
    resetFilters,
    getAllTags,
    getSortedAndFilteredImages,
  } = useImageStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const availableTags = getAllTags();
  const filteredImages = getSortedAndFilteredImages();

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

  const handleToggleTag = (tag: string) => {
    const isSelected = filterSettings.selectedTags.includes(tag);
    const newTags = isSelected
      ? filterSettings.selectedTags.filter((t) => t !== tag)
      : [...filterSettings.selectedTags, tag];
    setFilterSettings({ selectedTags: newTags });
  };

  const hasActiveFilters =
    filterSettings.fileType !== 'all' ||
    filterSettings.minRating > 0 ||
    filterSettings.selectedTags.length > 0;

  return (
    <>
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Gallery</h1>
          {images.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {hasActiveFilters && `${filteredImages.length} / `}
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
              {videoCount > 0 && (
                <>, {videoCount} {videoCount === 1 ? 'video' : 'videos'}</>
              )}
            </p>
          )}
        </div>

        {/* ソートとフィルターコントロール */}
        {images.length > 0 && (
          <div className="flex items-center gap-4">
            {/* フィルターボタン */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded transition-colors ${
                  hasActiveFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                aria-label="Toggle filters"
              >
                <Filter size={16} />
                <span className="text-sm">Filter</span>
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {(filterSettings.fileType !== 'all' ? 1 : 0) +
                      (filterSettings.minRating > 0 ? 1 : 0) +
                      filterSettings.selectedTags.length}
                  </span>
                )}
              </button>

              {/* フィルタードロップダウン */}
              {showFilters && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* ファイルタイプフィルター */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Type
                    </label>
                    <select
                      value={filterSettings.fileType}
                      onChange={(e) =>
                        setFilterSettings({ fileType: e.target.value as FileType | 'all' })
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="image">Images only</option>
                      <option value="video">Videos only</option>
                    </select>
                  </div>

                  {/* 評価フィルター */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating: {filterSettings.minRating}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={filterSettings.minRating}
                      onChange={(e) =>
                        setFilterSettings({ minRating: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* タグフィルター */}
                  {availableTags.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleToggleTag(tag)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              filterSettings.selectedTags.includes(tag)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* リセットボタン */}
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ソートコントロール */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort:</label>
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
