import { LayoutGrid, List, Calendar } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import type { ViewMode } from '../../store/imageStore';

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useImageStore();

  const modes: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { value: 'grid', icon: LayoutGrid, label: 'Grid view' },
    { value: 'list', icon: List, label: 'List view' },
    { value: 'timeline', icon: Calendar, label: 'Timeline view' },
  ];

  return (
    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setViewMode(value)}
          className={`p-1.5 transition-colors ${
            viewMode === value
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
          aria-label={label}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
