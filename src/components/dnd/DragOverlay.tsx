import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { Images } from 'lucide-react';

type DragOverlayProps = {
  activeId: string | null;
  dragCount: number;
};

export default function DragOverlay({ activeId, dragCount }: DragOverlayProps) {
  if (!activeId) return null;

  return (
    <DndDragOverlay dropAnimation={null}>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-xl text-sm font-medium pointer-events-none">
        <Images size={16} />
        <span>{dragCount} {dragCount === 1 ? 'item' : 'items'}</span>
      </div>
    </DndDragOverlay>
  );
}
