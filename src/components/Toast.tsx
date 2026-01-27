import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useImageStore } from '../store/imageStore';
import type { ToastType } from '../store/imageStore';

/**
 * トースト通知コンポーネント
 * 画面右上に表示されます
 */
export default function Toast() {
  const { toasts, removeToast } = useImageStore();

  if (toasts.length === 0) {
    return null;
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-top-5 ${getStyles(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
