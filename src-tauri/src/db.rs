use std::path::PathBuf;
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_db_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;

    // 新しい標準的な場所: ~/Library/Application Support/com.imagegallery
    let new_db_dir = home_dir.join("Library/Application Support/com.imagegallery");
    let new_db_path = new_db_dir.join("gallery.db");

    // 古い場所: ~/.image_gallery
    let old_db_dir = home_dir.join(".image_gallery");
    let old_db_path = old_db_dir.join("gallery.db");

    // 新しいディレクトリを作成
    std::fs::create_dir_all(&new_db_dir)
        .map_err(|e| format!("Failed to create db directory: {}", e))?;

    // 既存のデータベースを旧場所から新場所に移行
    if old_db_path.exists() && !new_db_path.exists() {
        println!("Migrating database from old location to Application Support...");
        std::fs::copy(&old_db_path, &new_db_path)
            .map_err(|e| format!("Failed to migrate database: {}", e))?;
        println!("Database migration completed successfully");

        // 古いデータベースファイルを削除（オプション: バックアップとして残すことも可能）
        if let Err(e) = std::fs::remove_file(&old_db_path) {
            eprintln!("Warning: Failed to remove old database file: {}", e);
        } else {
            println!("Old database file removed");
        }

        // 古いディレクトリが空なら削除
        if let Ok(entries) = std::fs::read_dir(&old_db_dir) {
            if entries.count() == 0 {
                let _ = std::fs::remove_dir(&old_db_dir);
            }
        }
    }

    Ok(new_db_path)
}

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
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
        },
        Migration {
            version: 2,
            description: "add_file_type_column",
            sql: "
                ALTER TABLE images ADD COLUMN file_type TEXT DEFAULT 'image';
                CREATE INDEX IF NOT EXISTS idx_file_type ON images(file_type);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_is_favorite_column",
            sql: "
                ALTER TABLE images ADD COLUMN is_favorite INTEGER DEFAULT 0;
                CREATE INDEX IF NOT EXISTS idx_is_favorite ON images(is_favorite);
            ",
            kind: MigrationKind::Up,
        }
    ]
}

pub async fn init_db() -> Result<(), String> {
    let _db_path = get_db_path()?;
    // データベースディレクトリが作成されたことを確認
    Ok(())
}

