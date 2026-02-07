import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportMetadataJson, exportMetadataCsv } from '../../utils/tauri-commands';

type ExportFormat = 'json' | 'csv';

type ExportSectionProps = {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
};

export default function ExportSection({ onMessage }: ExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);

      const { save } = await import('@tauri-apps/plugin-dialog');
      const outputPath = await save({
        title: `Export metadata as ${format.toUpperCase()}`,
        defaultPath: `gallery_export.${format}`,
        filters: format === 'json'
          ? [{ name: 'JSON', extensions: ['json'] }]
          : [{ name: 'CSV', extensions: ['csv'] }],
      });

      if (!outputPath) return;

      if (format === 'json') {
        await exportMetadataJson(outputPath);
      } else {
        await exportMetadataCsv(outputPath);
      }

      onMessage({
        type: 'success',
        text: `${format.toUpperCase()}ファイルにエクスポートしました: ${outputPath}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      onMessage({
        type: 'error',
        text: `エクスポートに失敗しました: ${error}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Download size={20} className="text-gray-700 dark:text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">エクスポート</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        メタデータ（コメント、タグ、評価、グループ情報）をファイルに書き出します。
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          {isExporting ? '処理中...' : 'JSON形式'}
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          {isExporting ? '処理中...' : 'CSV形式'}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        JSON: グループ情報含む完全エクスポート / CSV: 画像メタデータのみ
      </p>
    </div>
  );
}
