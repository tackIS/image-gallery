import { useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { useImageStore } from './store/imageStore';
import { initializeDatabase, getDatabasePath } from './utils/tauri-commands';
import Header from './components/Header';
import ImageGrid from './components/ImageGrid';
import ImageDetail from './components/ImageDetail';

function App() {
  const { images, currentDirectory, error, isLoading, setError, setLoading } = useImageStore();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // データベースパスを取得
        const dbPath = await getDatabasePath();
        console.log('Database path:', dbPath);

        // データベースに接続（マイグレーションが自動実行される）
        const dbUrl = `sqlite:${dbPath}`;
        console.log('Connecting to database:', dbUrl);
        const db = await Database.load(dbUrl);

        // データベース初期化
        await initializeDatabase();
        console.log('Database initialized successfully');

        // データベース接続をクローズ
        await db.close();
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4 mx-4">
            Error: {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}

        {!isLoading && currentDirectory && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm text-gray-600">
              Current directory: <span className="font-medium">{currentDirectory}</span>
            </p>
            <p className="text-sm text-gray-600">
              Images found: <span className="font-medium">{images.length}</span>
            </p>
          </div>
        )}

        {!isLoading && !currentDirectory && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <p className="text-lg">No directory selected</p>
            <p className="text-sm mt-2">Click "Select Directory" to get started</p>
          </div>
        )}

        {!isLoading && currentDirectory && images.length > 0 && <ImageGrid />}
      </main>

      {/* 画像詳細モーダル */}
      <ImageDetail />
    </div>
  );
}

export default App;
