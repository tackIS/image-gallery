import { Search, X } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useImageStore();

  return (
    <div role="search" className="flex-1 max-w-md mx-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by filename..."
          aria-label="画像を検索"
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
  );
}
