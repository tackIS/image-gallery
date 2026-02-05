mod db;
mod commands;
mod fs_utils;
mod video_utils;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      initialize_database,
      get_database_path,
      backup_database,
      reset_database,
      select_directory,
      scan_directory,
      video_utils::check_ffmpeg_available,
      video_utils::generate_video_thumbnail,
      // Phase 4: グループ管理コマンド
      create_group,
      get_all_groups,
      update_group,
      delete_group,
      add_images_to_group,
      remove_images_from_group,
      get_group_images,
      get_image_groups,
      // Phase 5: グループアルバムビュー & コメント機能
      get_group_by_id,
      set_representative_image,
      add_group_comment,
      get_group_comments,
      delete_group_comment,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
