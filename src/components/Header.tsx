import { useState } from 'react';
import { FolderOpen, Settings, ArrowUpDown, Filter, X, Search, Sun, Moon } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import type { SortBy } from '../store/imageStore';
import type { FileType } from '../types/image';
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';
import SettingsModal from './SettingsModal';
import { useTheme } from '../hooks/useTheme';

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
    getTagsWithCount,
    getSortedAndFilteredImages,
    searchQuery,
    setSearchQuery,
  } = useImageStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const tagsWithCount = getTagsWithCount();
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
    filterSettings.selectedTags.length > 0 ||
    filterSettings.showOnlyFavorites;

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Image Gallery</h1>
          {images.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {hasActiveFilters && `${filteredImages.length} / `}
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
              {videoCount > 0 && (
                <>, {videoCount} {videoCount === 1 ? 'video' : 'videos'}</>
              )}
            </p>
          )}
        </div>

        {/* 検索バー */}
        {images.length > 0 && (
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename..."
                className="w-full pl-10 pr-10 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-gray-400 dark:text-gray-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ソートとフィルターコントロール */}
        {images.length > 0 && (
          <div className="flex items-center gap-4">
            {/* フィルターボタン */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded transition-colors ${
                  hasActiveFilters
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                aria-label="Toggle filters"
              >
                <Filter size={16} />
                <span className="text-sm">Filter</span>
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {(filterSettings.fileType !== 'all' ? 1 : 0) +
                      (filterSettings.minRating > 0 ? 1 : 0) +
                      filterSettings.selectedTags.length +
                      (filterSettings.showOnlyFavorites ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* フィルタードロップダウン */}
              {showFilters && (
                <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* お気に入りフィルター */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSettings.showOnlyFavorites}
                        onChange={(e) =>
                          setFilterSettings({ showOnlyFavorites: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show only favorites</span>
                    </label>
                  </div>

                  {/* ファイルタイプフィルター */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      File Type
                    </label>
                    <select
                      value={filterSettings.fileType}
                      onChange={(e) =>
                        setFilterSettings({ fileType: e.target.value as FileType | 'all' })
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">All</option>
                      <option value="image">Images only</option>
                      <option value="video">Videos only</option>
                    </select>
                  </div>

                  {/* 評価フィルター */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  {tagsWithCount.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tags
                        </label>
                        {filterSettings.selectedTags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Match:</span>
                            <button
                              onClick={() =>
                                setFilterSettings({
                                  tagFilterMode:
                                    filterSettings.tagFilterMode === 'any' ? 'all' : 'any',
                                })
                              }
                              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-700 dark:text-gray-300"
                            >
                              {filterSettings.tagFilterMode === 'any' ? 'ANY' : 'ALL'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {tagsWithCount.map(({ tag, count }) => (
                          <button
                            key={tag}
                            onClick={() => handleToggleTag(tag)}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              filterSettings.selectedTags.includes(tag)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <span>{tag}</span>
                            <span className={`text-xs ${
                              filterSettings.selectedTags.includes(tag)
                                ? 'text-blue-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              ({count})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* リセットボタン */}
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ソートコントロール */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="name">Name</option>
                <option value="created_at">Date</option>
                <option value="rating">Rating</option>
              </select>
              <button
                onClick={handleToggleSortOrder}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                title={`${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown size={16} />
                <span className="text-sm">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
              const currentIndex = themes.indexOf(theme);
              const nextIndex = (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex]);
            }}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label={`Current theme: ${theme}. Click to change.`}
            title={`Theme: ${theme}`}
          >
            {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 sm:px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={handleSelectDirectory}
            className="flex items-center gap-2 bg-blue-500 dark:bg-blue-600 text-white px-2 sm:px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            <FolderOpen size={20} />
            <span className="hidden sm:inline">Select Directory</span>
          </button>
        </div>
      </header>

      {/* 設定モーダル */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
