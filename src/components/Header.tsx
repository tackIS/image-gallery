import { useState, useEffect } from 'react';
import { FolderOpen, Settings, Sun, Moon, Menu, CheckSquare } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { selectDirectory, scanDirectory, checkFFmpegAvailable } from '../utils/tauri-commands';
import SettingsModal from './SettingsModal';
import { useTheme } from '../hooks/useTheme';
import SearchBar from './header/SearchBar';
import SortControls from './header/SortControls';
import FilterPanel from './header/FilterPanel';
import ViewModeToggle from './header/ViewModeToggle';

type HeaderProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const {
    images,
    setImages,
    setCurrentDirectory,
    setLoading,
    setError,
    filterSettings,
    getSortedAndFilteredImages,
    isSelectionMode,
    toggleSelectionMode,
    selectedImageIds,
  } = useImageStore();
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const filteredImages = getSortedAndFilteredImages();
  const imageCount = images.filter(m => m.file_type === 'image').length;
  const videoCount = images.filter(m => m.file_type === 'video').length;

  const hasActiveFilters =
    filterSettings.fileType !== 'all' ||
    filterSettings.minRating > 0 ||
    filterSettings.selectedTags.length > 0 ||
    filterSettings.showOnlyFavorites;

  useEffect(() => {
    checkFFmpegAvailable()
      .then((msg) => console.log('[FFmpeg]', msg))
      .catch((err) => console.warn('[FFmpeg] Not available:', err));
  }, []);

  const handleSelectDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const path = await selectDirectory();
      if (path) {
        const images = await scanDirectory(path);
        setImages(images);
        setCurrentDirectory(path);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-2 flex items-center gap-3">
        {/* Left: Sidebar toggle + Title */}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 shrink-0"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Menu size={20} />
        </button>

        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Image Gallery</h1>
            {images.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors ${
                  isSelectionMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label={isSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                title={isSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
              >
                <CheckSquare size={16} />
                {isSelectionMode && selectedImageIds.length > 0 && (
                  <span>{selectedImageIds.length}</span>
                )}
              </button>
            )}
          </div>
          {images.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasActiveFilters && `${filteredImages.length} / `}
              {imageCount} images{videoCount > 0 && `, ${videoCount} videos`}
            </p>
          )}
        </div>

        {/* Center: Search */}
        {images.length > 0 && <SearchBar />}

        {/* Right: Controls */}
        {images.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <ViewModeToggle />
            <FilterPanel />
            <SortControls />
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
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
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleSelectDirectory}
            className="flex items-center gap-2 bg-blue-500 dark:bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            <FolderOpen size={20} />
            <span className="hidden sm:inline">Add Dir</span>
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
