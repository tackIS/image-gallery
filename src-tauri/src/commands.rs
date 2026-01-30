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

// ============================================================
// Phase 4: グループ管理機能
// ============================================================

/**
 * グループ情報を表す構造体
 */
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupData {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub representative_image_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub image_count: i64,
}

/**
 * グループ作成時の入力データ
 */
#[derive(Debug, Deserialize)]
pub struct CreateGroupInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub representative_image_id: Option<i64>,
}

/**
 * グループ更新時の入力データ
 */
#[derive(Debug, Deserialize)]
pub struct UpdateGroupInput {
    pub id: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub representative_image_id: Option<i64>,
}

/**
 * グループを作成します
 */
#[tauri::command]
pub fn create_group(input: CreateGroupInput) -> Result<i64, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let color = input.color.unwrap_or_else(|| "#3b82f6".to_string());

    conn.execute(
        "INSERT INTO groups (name, description, color, representative_image_id) VALUES (?, ?, ?, ?)",
        rusqlite::params![
            input.name,
            input.description,
            color,
            input.representative_image_id,
        ],
    )
    .map_err(|e| format!("Failed to create group: {}", e))?;

    Ok(conn.last_insert_rowid())
}

/**
 * 全グループを取得します（画像数を含む）
 */
#[tauri::command]
pub fn get_all_groups() -> Result<Vec<GroupData>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT
            g.id,
            g.name,
            g.description,
            g.color,
            g.representative_image_id,
            g.created_at,
            g.updated_at,
            COUNT(ig.image_id) as image_count
        FROM groups g
        LEFT JOIN image_groups ig ON g.id = ig.group_id
        GROUP BY g.id
        ORDER BY g.created_at DESC"
    )
    .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let groups = stmt.query_map([], |row| {
        Ok(GroupData {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
            representative_image_id: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            image_count: row.get(7)?,
        })
    })
    .map_err(|e| format!("Failed to query groups: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect groups: {}", e))?;

    Ok(groups)
}

/**
 * グループ情報を更新します
 */
#[tauri::command]
pub fn update_group(input: UpdateGroupInput) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut updates = vec![];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(name) = input.name {
        updates.push("name = ?");
        params.push(Box::new(name));
    }
    if let Some(description) = input.description {
        updates.push("description = ?");
        params.push(Box::new(description));
    }
    if let Some(color) = input.color {
        updates.push("color = ?");
        params.push(Box::new(color));
    }
    if let Some(rep_id) = input.representative_image_id {
        updates.push("representative_image_id = ?");
        params.push(Box::new(rep_id));
    }

    if updates.is_empty() {
        return Ok(());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(Box::new(input.id));

    let query = format!("UPDATE groups SET {} WHERE id = ?", updates.join(", "));
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    conn.execute(&query, params_refs.as_slice())
        .map_err(|e| format!("Failed to update group: {}", e))?;

    Ok(())
}

/**
 * グループを削除します
 */
#[tauri::command]
pub fn delete_group(group_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // CASCADE設定により、image_groups の関連レコードも自動削除される
    conn.execute("DELETE FROM groups WHERE id = ?", rusqlite::params![group_id])
        .map_err(|e| format!("Failed to delete group: {}", e))?;

    Ok(())
}

/**
 * 画像をグループに追加します
 */
#[tauri::command]
pub fn add_images_to_group(image_ids: Vec<i64>, group_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    for image_id in image_ids {
        // UNIQUE制約により重複挿入は無視される
        let _ = conn.execute(
            "INSERT OR IGNORE INTO image_groups (image_id, group_id) VALUES (?, ?)",
            rusqlite::params![image_id, group_id],
        );
    }

    Ok(())
}

/**
 * 画像をグループから削除します
 */
#[tauri::command]
pub fn remove_images_from_group(image_ids: Vec<i64>, group_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    for image_id in image_ids {
        conn.execute(
            "DELETE FROM image_groups WHERE image_id = ? AND group_id = ?",
            rusqlite::params![image_id, group_id],
        )
        .map_err(|e| format!("Failed to remove image from group: {}", e))?;
    }

    Ok(())
}

/**
 * グループに所属する画像IDの配列を取得します
 */
#[tauri::command]
pub fn get_group_images(group_id: i64) -> Result<Vec<i64>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare("SELECT image_id FROM image_groups WHERE group_id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let image_ids = stmt.query_map(rusqlite::params![group_id], |row| {
        row.get(0)
    })
    .map_err(|e| format!("Failed to query group images: {}", e))?
    .collect::<Result<Vec<i64>, _>>()
    .map_err(|e| format!("Failed to collect image IDs: {}", e))?;

    Ok(image_ids)
}

/**
 * 画像が所属するグループIDの配列を取得します
 */
#[tauri::command]
pub fn get_image_groups(image_id: i64) -> Result<Vec<i64>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare("SELECT group_id FROM image_groups WHERE image_id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let group_ids = stmt.query_map(rusqlite::params![image_id], |row| {
        row.get(0)
    })
    .map_err(|e| format!("Failed to query image groups: {}", e))?
    .collect::<Result<Vec<i64>, _>>()
    .map_err(|e| format!("Failed to collect group IDs: {}", e))?;

    Ok(group_ids)
}

// ============================================================
// Phase 5: グループアルバムビュー & コメント機能
// ============================================================

/**
 * グループコメント情報を表す構造体
 */
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupComment {
    pub id: i64,
    pub group_id: i64,
    pub comment: String,
    pub created_at: String,
}

/**
 * グループコメント追加時の入力データ
 */
#[derive(Debug, Deserialize)]
pub struct AddCommentInput {
    pub group_id: i64,
    pub comment: String,
}

/**
 * グループIDから詳細情報を取得します
 */
#[tauri::command]
pub fn get_group_by_id(group_id: i64) -> Result<GroupData, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT
            g.id,
            g.name,
            g.description,
            g.color,
            g.representative_image_id,
            g.created_at,
            g.updated_at,
            COUNT(ig.image_id) as image_count
        FROM groups g
        LEFT JOIN image_groups ig ON g.id = ig.group_id
        WHERE g.id = ?
        GROUP BY g.id"
    )
    .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let group = stmt.query_row(rusqlite::params![group_id], |row| {
        Ok(GroupData {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
            representative_image_id: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            image_count: row.get(7)?,
        })
    })
    .map_err(|e| format!("Failed to query group: {}", e))?;

    Ok(group)
}

/**
 * グループの代表画像を設定します
 */
#[tauri::command]
pub fn set_representative_image(group_id: i64, image_id: Option<i64>) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "UPDATE groups SET representative_image_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        rusqlite::params![image_id, group_id],
    )
    .map_err(|e| format!("Failed to set representative image: {}", e))?;

    Ok(())
}

/**
 * グループコメントを追加します
 */
#[tauri::command]
pub fn add_group_comment(input: AddCommentInput) -> Result<i64, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "INSERT INTO group_comments (group_id, comment) VALUES (?, ?)",
        rusqlite::params![input.group_id, input.comment],
    )
    .map_err(|e| format!("Failed to add group comment: {}", e))?;

    Ok(conn.last_insert_rowid())
}

/**
 * グループの全コメントを取得します（新しい順）
 */
#[tauri::command]
pub fn get_group_comments(group_id: i64) -> Result<Vec<GroupComment>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, group_id, comment, created_at
        FROM group_comments
        WHERE group_id = ?
        ORDER BY created_at DESC"
    )
    .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let comments = stmt.query_map(rusqlite::params![group_id], |row| {
        Ok(GroupComment {
            id: row.get(0)?,
            group_id: row.get(1)?,
            comment: row.get(2)?,
            created_at: row.get(3)?,
        })
    })
    .map_err(|e| format!("Failed to query group comments: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect comments: {}", e))?;

    Ok(comments)
}

/**
 * グループコメントを削除します
 */
#[tauri::command]
pub fn delete_group_comment(comment_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "DELETE FROM group_comments WHERE id = ?",
        rusqlite::params![comment_id],
    )
    .map_err(|e| format!("Failed to delete group comment: {}", e))?;

    Ok(())
}
