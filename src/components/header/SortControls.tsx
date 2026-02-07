import { ArrowUpDown } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import type { SortBy } from '../../store/imageStore';

export default function SortControls() {
  const { sortBy, sortOrder, setSortBy, setSortOrder } = useImageStore();

  return (
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
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        title={`${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
      >
        <ArrowUpDown size={16} />
        <span className="text-sm">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
      </button>
    </div>
  );
}
