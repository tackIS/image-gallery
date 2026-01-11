import { FolderOpen } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import { selectDirectory, scanDirectory } from '../utils/tauri-commands';

/**
 * アプリケーションヘッダーコンポーネント
 * ディレクトリ選択ボタンと統計情報を表示します
 */
export default function Header() {
  const { images, setImages, setCurrentDirectory, setLoading, setError } = useImageStore();

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

  return (
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
      <button
        onClick={handleSelectDirectory}
        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        <FolderOpen size={20} />
        Select Directory
      </button>
    </header>
  );
}
