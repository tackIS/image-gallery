import { test as base } from '@playwright/test';

/**
 * Tauri API をモックした Playwright テストフィクスチャ
 * ブラウザ環境で __TAURI_INTERNALS__ を注入し、invoke コマンドをスタブする
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      // Tauri invoke モック
      const mockResponses: Record<string, unknown> = {
        initialize_database: 'Database initialized',
        get_database_path: '/mock/path/gallery.db',
        get_all_directories: [],
        get_all_groups: [],
        get_all_images: [],
        check_ffmpeg_available: 'ffmpeg available',
        get_watched_directories: [],
        start_file_watcher: undefined,
        stop_file_watcher: undefined,
        select_directory: null,
        backup_database: '/mock/path/backup.db',
        reset_database: 'Database reset',
        create_group: 1,
        update_group: undefined,
        delete_group: undefined,
        add_images_to_group: undefined,
        remove_images_from_group: undefined,
        get_group_images: [],
        get_image_groups: [],
        scan_directory: [],
        scan_single_directory: [],
        scan_all_active_directories: [],
        log_action: 1,
        get_last_undoable_action: null,
        get_last_redoable_action: null,
        mark_action_undone: undefined,
        mark_action_redone: undefined,
        export_metadata_json: '/mock/export.json',
        export_metadata_csv: '/mock/export.csv',
        import_metadata_json: 'Imported',
      };

      (window as Record<string, unknown>).__TAURI_INTERNALS__ = {
        invoke: (cmd: string) => {
          if (cmd in mockResponses) {
            return Promise.resolve(mockResponses[cmd]);
          }
          console.warn(`[Tauri Mock] Unhandled command: ${cmd}`);
          return Promise.resolve(null);
        },
        convertFileSrc: (path: string) => path,
        metadata: () => Promise.resolve({}),
      };
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
