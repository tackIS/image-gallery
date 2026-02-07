import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  startFileWatcher,
  stopFileWatcher,
  getAllDirectories,
  getAllImages,
} from '../utils/tauri-commands';
import { useImageStore } from '../store/imageStore';

type FileChangePayload = {
  added: string[];
  removed: string[];
};

/**
 * アクティブディレクトリのファイル変更を監視し、自動的にギャラリーを更新するフック
 */
export function useDirectoryWatcher() {
  const { setImages, showToast } = useImageStore();

  const startWatching = useCallback(async () => {
    try {
      const dirs = await getAllDirectories();
      const activePaths = dirs
        .filter((d) => d.is_active === 1)
        .map((d) => d.path);

      if (activePaths.length > 0) {
        await startFileWatcher(activePaths);
      }
    } catch (err) {
      console.error('Failed to start file watcher:', err);
    }
  }, []);

  // ファイル変更イベントのリスナー
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen<FileChangePayload>('file-system-change', async (event) => {
        const { added, removed } = event.payload;
        const total = added.length + removed.length;

        if (total === 0) return;

        try {
          // DBを再読み込みして最新状態を反映
          const images = await getAllImages();
          setImages(images);

          // トースト通知
          const parts: string[] = [];
          if (added.length > 0) {
            parts.push(`${added.length} file${added.length > 1 ? 's' : ''} added`);
          }
          if (removed.length > 0) {
            parts.push(`${removed.length} file${removed.length > 1 ? 's' : ''} removed`);
          }
          showToast(parts.join(', '), 'info');
        } catch (err) {
          console.error('Failed to process file change:', err);
        }
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [setImages, showToast]);

  // ウォッチャーの起動/停止
  useEffect(() => {
    startWatching();

    return () => {
      stopFileWatcher().catch((err) => {
        console.error('Failed to stop file watcher:', err);
      });
    };
  }, [startWatching]);

  return { restartWatcher: startWatching };
}
