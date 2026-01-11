use serde::{Deserialize, Serialize};

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
            ImageFileInfo {
                file_path,
                file_name,
                file_type,
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
}
