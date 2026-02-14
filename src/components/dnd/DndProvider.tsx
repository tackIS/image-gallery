import { useState, useCallback } from 'react';
import {
  DndContext,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useImageStore } from '../../store/imageStore';
import { addImagesToGroup, getAllGroups } from '../../utils/tauri-commands';
import DragOverlay from './DragOverlay';

type DndProviderProps = {
  children: React.ReactNode;
};

export default function DndProvider({ children }: DndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragCount, setDragCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);

    const { isSelectionMode, selectedImageIds } = useImageStore.getState();
    if (isSelectionMode && selectedImageIds.length > 0) {
      const imageId = parseInt(id.replace('media-', ''));
      if (selectedImageIds.includes(imageId)) {
        setDragCount(selectedImageIds.length);
      } else {
        setDragCount(1);
      }
    } else {
      setDragCount(1);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith('group-')) return;

    const groupId = parseInt(overId.replace('group-', ''));
    const draggedImageId = parseInt(String(active.id).replace('media-', ''));

    const { isSelectionMode, selectedImageIds } = useImageStore.getState();
    let imageIds: number[];
    if (isSelectionMode && selectedImageIds.length > 0 && selectedImageIds.includes(draggedImageId)) {
      imageIds = selectedImageIds;
    } else {
      imageIds = [draggedImageId];
    }

    try {
      await addImagesToGroup(imageIds, groupId);
      const updatedGroups = await getAllGroups();
      useImageStore.getState().setGroups(updatedGroups);
      useImageStore.getState().showToast(`${imageIds.length} item(s) added to group`, 'success');
    } catch (err) {
      console.error('Failed to add images to group:', err);
      useImageStore.getState().showToast('Failed to add to group', 'error');
    }
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay activeId={activeId} dragCount={dragCount} />
    </DndContext>
  );
}
