use std::path::PathBuf;
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_db_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let db_dir = home_dir.join(".image_gallery");
    let db_path = db_dir.join("gallery.db");

    // ディレクトリ作成
    std::fs::create_dir_all(&db_dir).map_err(|e| format!("Failed to create db directory: {}", e))?;

    Ok(db_path)
}

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_images_table",
        sql: "
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                comment TEXT,
                tags TEXT,
                rating INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_file_path ON images(file_path);
            CREATE INDEX IF NOT EXISTS idx_file_name ON images(file_name);
        ",
        kind: MigrationKind::Up,
    }]
}

pub async fn init_db() -> Result<(), String> {
    let db_path = get_db_path()?;
    // データベースディレクトリが作成されたことを確認
    Ok(())
}
