import { useEffect } from 'react';
import { useImageStore } from './store/imageStore';
import { initializeDatabase, getDatabasePath } from './utils/tauri-commands';
import Header from './components/Header';
import ImageGrid from './components/ImageGrid';
import ImageDetail from './components/ImageDetail';
import LoadingSpinner from './components/LoadingSpinner';
import EmptyState from './components/EmptyState';

function App() {
  const { images, currentDirectory, error, isLoading, setError, setLoading } = useImageStore();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // データベースパスを取得（ディレクトリ作成のみ）
        const dbPath = await getDatabasePath();
        console.log('Database path:', dbPath);

        // データベース初期化（Tauriが自動でマイグレーションを実行）
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Database initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setError, setLoading]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />

      <main>
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded mb-4 mx-4">
            Error: {error}
          </div>
        )}

        {isLoading && <LoadingSpinner />}

        {!isLoading && currentDirectory && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current directory: <span className="font-medium dark:text-gray-300">{currentDirectory}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Images found: <span className="font-medium dark:text-gray-300">{images.length}</span>
            </p>
          </div>
        )}

        {!isLoading && !currentDirectory && <EmptyState />}

        {!isLoading && currentDirectory && images.length > 0 && <ImageGrid />}
      </main>

      {/* 画像詳細モーダル */}
      <ImageDetail />
    </div>
  );
}

export default App;
