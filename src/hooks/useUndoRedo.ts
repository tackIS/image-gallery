import { useState, useEffect, useCallback } from 'react';
import {
  logAction,
  getLastUndoableAction,
  getLastRedoableAction,
  markActionUndone,
  markActionRedone,
  updateImageMetadata,
  getAllImages,
} from '../utils/tauri-commands';
import { useImageStore } from '../store/imageStore';
import type { ActionLogEntry } from '../types/image';

type UndoRedoState = {
  canUndo: boolean;
  canRedo: boolean;
  lastAction: ActionLogEntry | null;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  logMetadataChange: (
    imageId: number,
    field: string,
    oldValue: string | number | null,
    newValue: string | number | null,
  ) => Promise<void>;
};

export function useUndoRedo(): UndoRedoState {
  const [lastUndoable, setLastUndoable] = useState<ActionLogEntry | null>(null);
  const [lastRedoable, setLastRedoable] = useState<ActionLogEntry | null>(null);
  const { setImages, showToast } = useImageStore();

  const refresh = useCallback(async () => {
    try {
      const [undoable, redoable] = await Promise.all([
        getLastUndoableAction(),
        getLastRedoableAction(),
      ]);
      setLastUndoable(undoable);
      setLastRedoable(redoable);
    } catch {
      // silently ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [undoable, redoable] = await Promise.all([
          getLastUndoableAction(),
          getLastRedoableAction(),
        ]);
        if (!cancelled) {
          setLastUndoable(undoable);
          setLastRedoable(redoable);
        }
      } catch {
        // silently ignore
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const logMetadataChange = useCallback(async (
    imageId: number,
    field: string,
    oldValue: string | number | null,
    newValue: string | number | null,
  ) => {
    await logAction(
      `update_${field}`,
      'images',
      imageId,
      oldValue != null ? String(oldValue) : null,
      newValue != null ? String(newValue) : null,
    );
    await refresh();
  }, [refresh]);

  const applyAction = useCallback(async (action: ActionLogEntry, value: string | null) => {
    if (action.target_table === 'images') {
      const field = action.action_type.replace('update_', '');
      const updateData: Record<string, unknown> = { id: action.target_id };

      if (field === 'rating') {
        updateData.rating = value ? parseInt(value) : 0;
      } else if (field === 'comment') {
        updateData.comment = value || '';
      } else if (field === 'tags') {
        updateData.tags = value ? JSON.parse(value) : [];
      } else if (field === 'is_favorite') {
        updateData.is_favorite = value ? parseInt(value) : 0;
      }

      await updateImageMetadata(updateData as { id: number; rating?: number; comment?: string; tags?: string[]; is_favorite?: number });
      const images = await getAllImages();
      setImages(images);
    }
  }, [setImages]);

  const undo = useCallback(async () => {
    if (!lastUndoable) return;
    try {
      await applyAction(lastUndoable, lastUndoable.old_value);
      await markActionUndone(lastUndoable.id);
      showToast('Undone', 'info');
      await refresh();
    } catch (err) {
      console.error('Undo failed:', err);
      showToast('Undo failed', 'error');
    }
  }, [lastUndoable, applyAction, refresh, showToast]);

  const redo = useCallback(async () => {
    if (!lastRedoable) return;
    try {
      await applyAction(lastRedoable, lastRedoable.new_value);
      await markActionRedone(lastRedoable.id);
      showToast('Redone', 'info');
      await refresh();
    } catch (err) {
      console.error('Redo failed:', err);
      showToast('Redo failed', 'error');
    }
  }, [lastRedoable, applyAction, refresh, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    canUndo: lastUndoable !== null,
    canRedo: lastRedoable !== null,
    lastAction: lastUndoable,
    undo,
    redo,
    logMetadataChange,
  };
}
