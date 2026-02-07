import { FolderOpen, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import type { DirectoryData } from '../../types/image';

type DirectoryItemProps = {
  directory: DirectoryData;
  onRemove: () => void;
  onToggleActive: () => void;
  onRescan: () => void;
};

export default function DirectoryItem({ directory, onRemove, onToggleActive, onRescan }: DirectoryItemProps) {
  const isActive = directory.is_active === 1;
  const dirName = directory.name || directory.path.split('/').filter(Boolean).pop() || directory.path;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'text-gray-700 dark:text-gray-300'
        : 'text-gray-400 dark:text-gray-500 opacity-60'
    }`}>
      <FolderOpen size={14} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium" title={directory.path}>
          {dirName}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {directory.file_count} files
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/dir:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title={isActive ? 'Deactivate' : 'Activate'}
        >
          {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRescan(); }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Rescan"
        >
          <RefreshCw size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
