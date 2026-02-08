import { useEffect, useCallback, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import {
  getAllDirectories,
  selectAndAddDirectory,
  removeDirectory,
  setDirectoryActive,
  scanSingleDirectory,
  getImagesByDirectoryId,
} from '../../utils/tauri-commands';
import { useImageStore } from '../../store/imageStore';
import DirectoryItem from './DirectoryItem';
import type { DirectoryData } from '../../types/image';

type DirectoryManagerProps = {
  collapsed: boolean;
};

export default function DirectoryManager({ collapsed }: DirectoryManagerProps) {
  const [directories, setDirectories] = useState<DirectoryData[]>([]);
  const {
    setImages,
    setCurrentDirectory,
    currentDirectory,
    selectedDirectoryId,
    setSelectedDirectoryId,
    setLoading,
    showToast,
  } = useImageStore();

  const loadDirectories = useCallback(async () => {
    try {
      const dirs = await getAllDirectories();
      setDirectories(dirs);
    } catch (err) {
      console.error('Failed to load directories:', err);
    }
  }, []);

  // マウント時とcurrentDirectory変更時にディレクトリ一覧をリロード
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const dirs = await getAllDirectories();
        if (!cancelled) {
          setDirectories(dirs);
        }
      } catch (err) {
        console.error('Failed to load directories:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentDirectory]);

  const handleSelectDirectory = useCallback(async (dir: DirectoryData) => {
    try {
      setLoading(true);
      const images = await getImagesByDirectoryId(dir.id);
      setImages(images);
      setCurrentDirectory(dir.path);
      setSelectedDirectoryId(dir.id);
    } catch (err) {
      console.error('Failed to load images for directory:', err);
      showToast('Failed to load images', 'error');
    } finally {
      setLoading(false);
    }
  }, [setImages, setCurrentDirectory, setSelectedDirectoryId, setLoading, showToast]);

  const handleAddDirectory = async () => {
    try {
      const dir = await selectAndAddDirectory();
      if (dir) {
        await loadDirectories();
        showToast(`Added directory: ${dir.name}`, 'success');
      }
    } catch (err) {
      console.error('Failed to add directory:', err);
      showToast('Failed to add directory', 'error');
    }
  };

  const handleRemove = async (dirId: number) => {
    if (!confirm('Remove this directory from the gallery? Images will not be deleted from disk.')) return;
    try {
      await removeDirectory(dirId);
      if (selectedDirectoryId === dirId) {
        setSelectedDirectoryId(null);
      }
      await loadDirectories();
      showToast('Directory removed', 'success');
    } catch (err) {
      console.error('Failed to remove directory:', err);
      showToast('Failed to remove directory', 'error');
    }
  };

  const handleToggleActive = async (dir: DirectoryData) => {
    try {
      await setDirectoryActive(dir.id, dir.is_active !== 1);
      await loadDirectories();
    } catch (err) {
      console.error('Failed to toggle directory active:', err);
    }
  };

  const handleRescan = async (dirId: number) => {
    try {
      const images = await scanSingleDirectory(dirId);
      setImages(images);
      await loadDirectories();
      showToast('Directory rescanned', 'success');
    } catch (err) {
      console.error('Failed to rescan directory:', err);
      showToast('Failed to rescan directory', 'error');
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={handleAddDirectory}
        className="w-full flex justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400"
        title="Add directory"
      >
        <FolderPlus size={18} />
      </button>
    );
  }

  return (
    <div className="px-1 space-y-0.5">
      {directories.map((dir) => (
        <div key={dir.id} className="group/dir">
          <DirectoryItem
            directory={dir}
            isSelected={selectedDirectoryId === dir.id}
            onSelect={() => handleSelectDirectory(dir)}
            onRemove={() => handleRemove(dir.id)}
            onToggleActive={() => handleToggleActive(dir)}
            onRescan={() => handleRescan(dir.id)}
          />
        </div>
      ))}

      <button
        onClick={handleAddDirectory}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      >
        <FolderPlus size={14} />
        Add Directory
      </button>
    </div>
  );
}
