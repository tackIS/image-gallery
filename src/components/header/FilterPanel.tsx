import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import type { FileType } from '../../types/image';

export default function FilterPanel() {
  const {
    filterSettings,
    setFilterSettings,
    resetFilters,
    getTagsWithCount,
  } = useImageStore();
  const [showFilters, setShowFilters] = useState(false);

  const tagsWithCount = getTagsWithCount();

  const hasActiveFilters =
    filterSettings.fileType !== 'all' ||
    filterSettings.minRating > 0 ||
    filterSettings.selectedTags.length > 0 ||
    filterSettings.showOnlyFavorites;

  const handleToggleTag = (tag: string) => {
    const isSelected = filterSettings.selectedTags.includes(tag);
    const newTags = isSelected
      ? filterSettings.selectedTags.filter((t) => t !== tag)
      : [...filterSettings.selectedTags, tag];
    setFilterSettings({ selectedTags: newTags });
  };

  return (
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
  );
}
