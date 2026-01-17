import { ImageOff } from 'lucide-react';

/**
 * 空状態表示コンポーネント
 * メディアファイルが読み込まれていない場合に表示されます
 */
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-400">
      <ImageOff size={64} className="mb-4" />
      <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">No Media Files Found</h2>
      <p className="text-sm">
        Click "Select Directory" to load images and videos from a folder
      </p>
    </div>
  );
}
