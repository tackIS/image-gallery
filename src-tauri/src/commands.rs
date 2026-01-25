use serde::{Deserialize, Serialize};
use std::fs;

#[tauri::command]
pub async fn initialize_database() -> Result<String, String> {
    crate::db::init_db().await?;
    Ok("Database initialized successfully".to_string())
}

#[tauri::command]
pub fn get_database_path() -> Result<String, String> {
    let db_path = crate::db::get_db_path()?;
    Ok(db_path.to_string_lossy().to_string())
}

/**
 * データベースをバックアップします
 * バックアップファイル名: gallery_backup_YYYYMMDD_HHMMSS.db
 */
#[tauri::command]
pub fn backup_database() -> Result<String, String> {
    let db_path = crate::db::get_db_path()?;

    if !db_path.exists() {
        return Err("Database file does not exist".to_string());
    }

    // バックアップファイル名を生成（タイムスタンプ付き）
    let now = chrono::Local::now();
    let backup_filename = format!("gallery_backup_{}.db", now.format("%Y%m%d_%H%M%S"));
    let backup_path = db_path.parent()
        .ok_or("Failed to get database directory")?
        .join(backup_filename);

    // ファイルをコピー
    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Failed to backup database: {}", e))?;

    println!("Database backed up to: {:?}", backup_path);
    Ok(backup_path.to_string_lossy().to_string())
}

/**
 * データベースをリセット（削除）します
 * 注意: この操作は元に戻せません
 */
#[tauri::command]
pub fn reset_database() -> Result<String, String> {
    let db_path = crate::db::get_db_path()?;

    if !db_path.exists() {
        return Ok("Database file does not exist".to_string());
    }

    // データベースファイルを削除
    fs::remove_file(&db_path)
        .map_err(|e| format!("Failed to delete database: {}", e))?;

    println!("Database deleted: {:?}", db_path);
    Ok("Database reset successfully".to_string())
}

/**
 * ディレクトリ選択ダイアログを表示します
 */
#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app
        .dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/**
 * 指定されたディレクトリ内の画像・動画をスキャンしてファイルパスのリストを返します
 */
#[tauri::command]
pub async fn scan_directory(
    path: String,
) -> Result<Vec<ImageFileInfo>, String> {
    // ディレクトリをスキャン
    let file_paths = crate::fs_utils::scan_images_in_directory(&path)?;

    // ファイル情報のリストを作成
    let result: Vec<ImageFileInfo> = file_paths
        .into_iter()
        .map(|file_path| {
            let file_name = crate::fs_utils::get_file_name(&file_path);
            let file_type = crate::fs_utils::get_file_type(&file_path);

            // 動画の場合のみメタデータ抽出
            let metadata = if file_type == "video" {
                crate::video_utils::extract_video_metadata(&file_path).ok()
            } else {
                None
            };

            ImageFileInfo {
                file_path,
                file_name,
                file_type,
                duration_seconds: metadata.as_ref().map(|m| m.duration_seconds),
                width: metadata.as_ref().map(|m| m.width),
                height: metadata.as_ref().map(|m| m.height),
                video_codec: metadata.as_ref().map(|m| m.video_codec.clone()),
                audio_codec: metadata.as_ref().and_then(|m| m.audio_codec.clone()),
            }
        })
        .collect();

    println!("Scanned {} files (images and videos)", result.len());

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageFileInfo {
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,

    // Phase 3追加
    pub duration_seconds: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}
