import { Undo2, Redo2 } from 'lucide-react';
import { useUndoRedo } from '../hooks/useUndoRedo';

export default function UndoRedoBar() {
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  if (!canUndo && !canRedo) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-2 py-1 animate-slide-in-bottom">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={14} />
        Undo
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={redo}
        disabled={!canRedo}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        title="Redo (Ctrl+Shift+Z)"
      >
        Redo
        <Redo2 size={14} />
      </button>
    </div>
  );
}
