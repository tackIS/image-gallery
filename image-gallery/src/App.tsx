import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';

function App() {
  const [dbStatus, setDbStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const initDB = async () => {
      try {
        // データベースパスを取得
        const dbPath = await invoke<string>('get_database_path');
        console.log('Database path:', dbPath);

        // データベースに接続（マイグレーションが自動実行される）
        const dbUrl = `sqlite:${dbPath}`;
        console.log('Connecting to database:', dbUrl);
        const db = await Database.load(dbUrl);

        // initialize_databaseコマンドを呼び出し
        const result = await invoke<string>('initialize_database');
        setDbStatus(result);

        // データベース接続をクローズ
        await db.close();
      } catch (error) {
        setDbStatus(`Error: ${error}`);
        console.error('Database initialization error:', error);
      }
    };
    initDB();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Image Gallery Manager</h1>
      <p className="text-gray-600">Database Status: {dbStatus}</p>
    </div>
  );
}

export default App;
