use serde::{Deserialize, Serialize};
use std::fs;

// ============================================================
// バリデーション用ヘルパー関数
// ============================================================

/// グループ名のバリデーション（1〜100文字）
fn validate_group_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Group name cannot be empty".to_string());
    }
    if trimmed.chars().count() > 100 {
        return Err("Group name is too long (max 100 characters)".to_string());
    }
    Ok(trimmed.to_string())
}

/// グループ説明のバリデーション（最大500文字）
fn validate_group_description(description: &Option<String>) -> Result<Option<String>, String> {
    match description {
        Some(desc) => {
            let trimmed = desc.trim();
            if trimmed.chars().count() > 500 {
                return Err("Description is too long (max 500 characters)".to_string());
            }
            if trimmed.is_empty() {
                Ok(None)
            } else {
                Ok(Some(trimmed.to_string()))
            }
        }
        None => Ok(None),
    }
}

/// カラーコードのバリデーション（HEX形式: #RGB or #RRGGBB）
fn validate_color(color: &str) -> Result<String, String> {
    let trimmed = color.trim();

    // #で始まるかチェック
    if !trimmed.starts_with('#') {
        return Err("Invalid color format: must start with '#'".to_string());
    }

    let hex_part = &trimmed[1..];

    // 長さチェック（3文字または6文字）
    if hex_part.len() != 3 && hex_part.len() != 6 {
        return Err("Invalid color format: must be #RGB or #RRGGBB".to_string());
    }

    // 16進数文字のみかチェック
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid color format: must contain only hexadecimal characters".to_string());
    }

    Ok(trimmed.to_string())
}

/// コメントのバリデーション（1〜500文字）
fn validate_comment(comment: &str) -> Result<String, String> {
    let trimmed = comment.trim();
    if trimmed.is_empty() {
        return Err("Comment cannot be empty".to_string());
    }
    if trimmed.chars().count() > 500 {
        return Err("Comment is too long (max 500 characters)".to_string());
    }
    Ok(trimmed.to_string())
}

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
 * サムネイルディレクトリも同時に削除します
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

    // サムネイルディレクトリも削除（存在する場合）
    if let Some(db_dir) = db_path.parent() {
        let thumbnail_dir = db_dir.join("thumbnails");
        if thumbnail_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&thumbnail_dir) {
                eprintln!("Warning: Failed to delete thumbnails directory: {}", e);
            } else {
                println!("Thumbnails directory deleted: {:?}", thumbnail_dir);
            }
        }
    }

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

    // バリデーション
    let name = validate_group_name(&input.name)?;
    let description = validate_group_description(&input.description)?;
    let color = match &input.color {
        Some(c) => validate_color(c)?,
        None => "#3b82f6".to_string(),
    };

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 代表画像IDが指定されている場合、画像の存在確認
    if let Some(image_id) = input.representative_image_id {
        let image_exists: bool = conn
            .query_row(
                "SELECT 1 FROM images WHERE id = ?",
                rusqlite::params![image_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_exists {
            return Err(format!("Representative image with ID {} not found", image_id));
        }
    }

    conn.execute(
        "INSERT INTO groups (name, description, color, representative_image_id) VALUES (?, ?, ?, ?)",
        rusqlite::params![
            name,
            description,
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

    // グループの存在確認
    let group_exists: bool = conn
        .query_row(
            "SELECT 1 FROM groups WHERE id = ?",
            rusqlite::params![input.id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !group_exists {
        return Err(format!("Group with ID {} not found", input.id));
    }

    let mut updates = vec![];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    // 名前のバリデーションと追加
    if let Some(name) = input.name {
        let validated_name = validate_group_name(&name)?;
        updates.push("name = ?");
        params.push(Box::new(validated_name));
    }

    // 説明のバリデーションと追加
    if let Some(description) = input.description {
        // 空文字列の場合はNULLに設定
        let trimmed = description.trim();
        if trimmed.chars().count() > 500 {
            return Err("Description is too long (max 500 characters)".to_string());
        }
        updates.push("description = ?");
        if trimmed.is_empty() {
            params.push(Box::new(None::<String>));
        } else {
            params.push(Box::new(trimmed.to_string()));
        }
    }

    // カラーコードのバリデーションと追加
    if let Some(color) = input.color {
        let validated_color = validate_color(&color)?;
        updates.push("color = ?");
        params.push(Box::new(validated_color));
    }

    // 代表画像IDのバリデーションと追加
    if let Some(rep_id) = input.representative_image_id {
        // 画像の存在確認
        let image_exists: bool = conn
            .query_row(
                "SELECT 1 FROM images WHERE id = ?",
                rusqlite::params![rep_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_exists {
            return Err(format!("Representative image with ID {} not found", rep_id));
        }

        // グループに属しているか確認
        let image_in_group: bool = conn
            .query_row(
                "SELECT 1 FROM image_groups WHERE image_id = ? AND group_id = ?",
                rusqlite::params![rep_id, input.id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_in_group {
            return Err(format!(
                "Image {} does not belong to group {}",
                rep_id, input.id
            ));
        }

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
    let affected_rows = conn.execute("DELETE FROM groups WHERE id = ?", rusqlite::params![group_id])
        .map_err(|e| format!("Failed to delete group: {}", e))?;

    if affected_rows == 0 {
        return Err(format!("Group with ID {} not found", group_id));
    }

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

    // グループの存在確認
    let group_exists: bool = conn
        .query_row(
            "SELECT 1 FROM groups WHERE id = ?",
            rusqlite::params![group_id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !group_exists {
        return Err(format!("Group with ID {} not found", group_id));
    }

    // 空の配列のチェック
    if image_ids.is_empty() {
        return Ok(());
    }

    // 各画像の存在確認と追加
    for image_id in image_ids {
        // 画像の存在確認
        let image_exists: bool = conn
            .query_row(
                "SELECT 1 FROM images WHERE id = ?",
                rusqlite::params![image_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_exists {
            return Err(format!("Image with ID {} not found", image_id));
        }

        // UNIQUE制約により重複挿入は無視される（INSERT OR IGNORE）
        // ただし、その他のエラー（DB接続エラー等）は検出する
        conn.execute(
            "INSERT OR IGNORE INTO image_groups (image_id, group_id) VALUES (?, ?)",
            rusqlite::params![image_id, group_id],
        )
        .map_err(|e| format!("Failed to add image {} to group: {}", image_id, e))?;
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
 * 代表画像はそのグループに属している必要があります
 */
#[tauri::command]
pub fn set_representative_image(group_id: i64, image_id: Option<i64>) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // NULLに設定する場合はチェック不要
    if let Some(id) = image_id {
        // 画像の存在確認
        let image_exists: bool = conn
            .query_row(
                "SELECT 1 FROM images WHERE id = ?",
                rusqlite::params![id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_exists {
            return Err(format!("Image with ID {} not found", id));
        }

        // グループに属しているか確認
        let image_in_group: bool = conn
            .query_row(
                "SELECT 1 FROM image_groups WHERE image_id = ? AND group_id = ?",
                rusqlite::params![id, group_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !image_in_group {
            return Err(format!(
                "Image {} does not belong to group {}",
                id, group_id
            ));
        }
    }

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

    // コメントのバリデーション
    let comment = validate_comment(&input.comment)?;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // グループの存在確認
    let group_exists: bool = conn
        .query_row(
            "SELECT 1 FROM groups WHERE id = ?",
            rusqlite::params![input.group_id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !group_exists {
        return Err(format!("Group with ID {} not found", input.group_id));
    }

    conn.execute(
        "INSERT INTO group_comments (group_id, comment) VALUES (?, ?)",
        rusqlite::params![input.group_id, comment],
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
