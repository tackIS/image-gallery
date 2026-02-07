import { useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { importMetadataJson, getAllImages, getAllGroups } from '../../utils/tauri-commands';
import { useImageStore } from '../../store/imageStore';

type ImportSectionProps = {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
};

export default function ImportSection({ onMessage }: ImportSectionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const { setImages, setGroups } = useImageStore();

  const handleSelectFile = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const filePath = await open({
        title: 'Import metadata from JSON',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
        directory: false,
      });

      if (!filePath) return;

      setSelectedPath(filePath as string);
      setShowConfirm(true);
    } catch (error) {
      console.error('File selection failed:', error);
      onMessage({
        type: 'error',
        text: `ファイル選択に失敗しました: ${error}`,
      });
    }
  };

  const handleImport = async () => {
    if (!selectedPath) return;

    try {
      setIsImporting(true);
      const summary = await importMetadataJson(selectedPath);

      // ストアを更新
      const [images, groups] = await Promise.all([
        getAllImages(),
        getAllGroups(),
      ]);
      setImages(images);
      setGroups(groups);

      onMessage({
        type: 'success',
        text: summary,
      });
      setShowConfirm(false);
      setSelectedPath(null);
    } catch (error) {
      console.error('Import failed:', error);
      onMessage({
        type: 'error',
        text: `インポートに失敗しました: ${error}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Upload size={20} className="text-gray-700 dark:text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">インポート</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        エクスポートしたJSONファイルからメタデータを復元します。既存の画像にマッチするデータのみ更新されます。
      </p>

      {!showConfirm ? (
        <button
          onClick={handleSelectFile}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={16} />
          JSONファイルを選択
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold mb-1">確認</p>
              <p>既存のメタデータが上書きされます。続行しますか？</p>
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 break-all">
                {selectedPath}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1 bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? '処理中...' : 'インポートする'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setSelectedPath(null);
              }}
              disabled={isImporting}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
