mod db;
mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // データベースパスを取得
  let db_path = db::get_db_path().expect("Failed to get database path");
  let db_url = format!("sqlite:{}", db_path.to_string_lossy());

  // マイグレーションを取得
  let migrations = db::get_migrations();

  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations(&db_url, migrations)
        .build()
    )
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
