import { useState, useRef } from 'react';
import { X, Database, AlertTriangle } from 'lucide-react';
import { backupDatabase, resetDatabase } from '../utils/tauri-commands';
import { useImageStore } from '../store/imageStore';
import ExportSection from './settings/ExportSection';
import ImportSection from './settings/ImportSection';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * 設定モーダルコンポーネント
 * データベース管理機能、エクスポート/インポート機能を提供します
 */
export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { setImages } = useImageStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const handleResetDatabase = async () => {
    try {
      setIsResetting(true);
      setMessage(null);

      // バックアップを作成する場合
      if (createBackup) {
        const backupPath = await backupDatabase();
        console.log('Database backed up to:', backupPath);
      }

      // データベースをリセット
      await resetDatabase();

      // ストアの画像リストをクリア
      setImages([]);

      setMessage({
        type: 'success',
        text: 'データベースが正常にリセットされました。アプリケーションを再起動してください。',
      });
      setShowConfirm(false);

      // 2秒後にモーダルを閉じる
      setTimeout(() => {
        onClose();
        // ページをリロードしてデータベースを再初期化
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to reset database:', error);
      setMessage({
        type: 'error',
        text: `データベースのリセットに失敗しました: ${error}`,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">設定</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* メッセージ表示 */}
          {message && (
            <div
              className={`p-3 rounded ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* エクスポートセクション */}
          <ExportSection onMessage={setMessage} />

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* インポートセクション */}
          <ImportSection onMessage={setMessage} />

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* データベース管理セクション */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-gray-700 dark:text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">データベース管理</h3>
            </div>

            {!showConfirm ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  データベースをリセットすると、すべてのメタデータ（コメント、タグ、評価）が失われます。
                </p>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                  disabled={isResetting}
                >
                  <Database size={20} />
                  データベースを初期化
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-semibold mb-1">警告</p>
                    <p>
                      この操作は元に戻せません。すべてのメタデータが削除されます。
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    リセット前にバックアップを作成
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="flex-1 bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? '処理中...' : '初期化する'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isResetting}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
