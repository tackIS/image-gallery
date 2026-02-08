import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';
import { useImageStore } from '../../store/imageStore';
import type { ActionLogEntry } from '../../types/image';

vi.mock('../../utils/tauri-commands', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
  getLastUndoableAction: vi.fn().mockResolvedValue(null),
  getLastRedoableAction: vi.fn().mockResolvedValue(null),
  markActionUndone: vi.fn().mockResolvedValue(undefined),
  markActionRedone: vi.fn().mockResolvedValue(undefined),
  updateImageMetadata: vi.fn().mockResolvedValue(undefined),
  getAllImages: vi.fn().mockResolvedValue([]),
}));

const tauriCommands = await import('../../utils/tauri-commands') as {
  logAction: ReturnType<typeof vi.fn>;
  getLastUndoableAction: ReturnType<typeof vi.fn>;
  getLastRedoableAction: ReturnType<typeof vi.fn>;
  markActionUndone: ReturnType<typeof vi.fn>;
  markActionRedone: ReturnType<typeof vi.fn>;
  updateImageMetadata: ReturnType<typeof vi.fn>;
  getAllImages: ReturnType<typeof vi.fn>;
};

const makeActionLog = (overrides: Partial<ActionLogEntry> = {}): ActionLogEntry => ({
  id: 1,
  action_type: 'update_rating',
  target_table: 'images',
  target_id: 10,
  old_value: '3',
  new_value: '5',
  created_at: '2026-01-15T10:00:00Z',
  is_undone: 0,
  ...overrides,
});

describe('useUndoRedo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useImageStore.getState().reset();
    tauriCommands.getLastUndoableAction.mockResolvedValue(null);
    tauriCommands.getLastRedoableAction.mockResolvedValue(null);
  });

  it('initial state: canUndo=false, canRedo=false', async () => {
    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => {
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  it('logMetadataChange calls logAction with correct arguments', async () => {
    tauriCommands.logAction.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      await result.current.logMetadataChange(10, 'rating', 3, 5);
    });

    expect(tauriCommands.logAction).toHaveBeenCalledWith(
      'update_rating',
      'images',
      10,
      '3',
      '5',
    );
  });

  it('logMetadataChange handles null values', async () => {
    tauriCommands.logAction.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      await result.current.logMetadataChange(10, 'comment', null, 'new comment');
    });

    expect(tauriCommands.logAction).toHaveBeenCalledWith(
      'update_comment',
      'images',
      10,
      null,
      'new comment',
    );
  });

  it('undo: does nothing when lastUndoable is null', async () => {
    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => expect(result.current.canUndo).toBe(false));

    await act(async () => {
      await result.current.undo();
    });

    expect(tauriCommands.updateImageMetadata).not.toHaveBeenCalled();
    expect(tauriCommands.markActionUndone).not.toHaveBeenCalled();
  });

  it('undo: applies old_value and marks action as undone', async () => {
    const action = makeActionLog();
    tauriCommands.getLastUndoableAction.mockResolvedValue(action);
    tauriCommands.getAllImages.mockResolvedValue([]);

    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      await result.current.undo();
    });

    expect(tauriCommands.updateImageMetadata).toHaveBeenCalledWith({
      id: 10,
      rating: 3,
    });
    expect(tauriCommands.markActionUndone).toHaveBeenCalledWith(1);
  });

  it('redo: does nothing when lastRedoable is null', async () => {
    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => expect(result.current.canRedo).toBe(false));

    await act(async () => {
      await result.current.redo();
    });

    expect(tauriCommands.updateImageMetadata).not.toHaveBeenCalled();
    expect(tauriCommands.markActionRedone).not.toHaveBeenCalled();
  });

  it('redo: applies new_value and marks action as redone', async () => {
    const action = makeActionLog({ is_undone: 1 });
    tauriCommands.getLastRedoableAction.mockResolvedValue(action);
    tauriCommands.getAllImages.mockResolvedValue([]);

    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));

    await act(async () => {
      await result.current.redo();
    });

    expect(tauriCommands.updateImageMetadata).toHaveBeenCalledWith({
      id: 10,
      rating: 5,
    });
    expect(tauriCommands.markActionRedone).toHaveBeenCalledWith(1);
  });

  it('undo failure: shows error toast', async () => {
    const action = makeActionLog();
    tauriCommands.getLastUndoableAction.mockResolvedValue(action);
    tauriCommands.updateImageMetadata.mockRejectedValue(new Error('DB error'));

    const showToastSpy = vi.spyOn(useImageStore.getState(), 'showToast');

    const { result } = renderHook(() => useUndoRedo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));

    await act(async () => {
      await result.current.undo();
    });

    expect(showToastSpy).toHaveBeenCalledWith('Undo failed', 'error');
    showToastSpy.mockRestore();
  });
});
