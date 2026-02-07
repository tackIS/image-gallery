use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;

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

    // 空の配列のチェック
    if image_ids.is_empty() {
        return Ok(());
    }

    let db_path = crate::db::get_db_path()?;
    let mut conn = Connection::open(&db_path)
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

    // トランザクション開始（複数の書き込み操作を原子的に実行）
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 各画像の存在確認と追加
    for image_id in &image_ids {
        // 画像の存在確認
        let image_exists: bool = tx
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
        tx.execute(
            "INSERT OR IGNORE INTO image_groups (image_id, group_id) VALUES (?, ?)",
            rusqlite::params![image_id, group_id],
        )
        .map_err(|e| format!("Failed to add image {} to group: {}", image_id, e))?;
    }

    // トランザクションをコミット
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}

/**
 * 画像をグループから削除します
 */
#[tauri::command]
pub fn remove_images_from_group(image_ids: Vec<i64>, group_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    // 空の配列のチェック
    if image_ids.is_empty() {
        return Ok(());
    }

    let db_path = crate::db::get_db_path()?;
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // トランザクション開始（複数の書き込み操作を原子的に実行）
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    for image_id in &image_ids {
        tx.execute(
            "DELETE FROM image_groups WHERE image_id = ? AND group_id = ?",
            rusqlite::params![image_id, group_id],
        )
        .map_err(|e| format!("Failed to remove image from group: {}", e))?;
    }

    // トランザクションをコミット
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

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

// ============================================================
// Phase 6: マルチディレクトリ管理
// ============================================================

/**
 * ディレクトリ情報を表す構造体
 */
#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryData {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub is_active: i64,
    pub last_scanned_at: Option<String>,
    pub file_count: i64,
    pub created_at: String,
}

/**
 * ディレクトリを追加し、初回スキャンを実行します
 */
#[tauri::command]
pub async fn add_directory(path: String) -> Result<DirectoryData, String> {
    use rusqlite::Connection;

    let dir_path = Path::new(&path);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("Directory does not exist: {}", path));
    }

    let name = dir_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 既存チェック
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM directories WHERE path = ?",
            rusqlite::params![path],
            |row| row.get(0),
        )
        .ok();

    if let Some(existing_id) = existing {
        // 既存なら再アクティブ化
        conn.execute(
            "UPDATE directories SET is_active = 1 WHERE id = ?",
            rusqlite::params![existing_id],
        )
        .map_err(|e| format!("Failed to reactivate directory: {}", e))?;
    } else {
        conn.execute(
            "INSERT INTO directories (path, name) VALUES (?, ?)",
            rusqlite::params![path, name],
        )
        .map_err(|e| format!("Failed to add directory: {}", e))?;
    }

    // ディレクトリIDを取得
    let dir_id: i64 = conn
        .query_row(
            "SELECT id FROM directories WHERE path = ?",
            rusqlite::params![path],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get directory id: {}", e))?;

    // 既存画像のバックフィル（パスがこのディレクトリに含まれる画像のdirectory_idを設定）
    let prefix = if path.ends_with('/') {
        path.clone()
    } else {
        format!("{}/", path)
    };
    conn.execute(
        "UPDATE images SET directory_id = ? WHERE file_path LIKE ? AND directory_id IS NULL",
        rusqlite::params![dir_id, format!("{}%", prefix)],
    )
    .map_err(|e| format!("Failed to backfill directory_id: {}", e))?;

    // ファイル数を更新
    let file_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM images WHERE directory_id = ?",
            rusqlite::params![dir_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "UPDATE directories SET file_count = ?, last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?",
        rusqlite::params![file_count, dir_id],
    )
    .map_err(|e| format!("Failed to update directory file count: {}", e))?;

    // 最新のディレクトリ情報を返す
    let dir = conn
        .query_row(
            "SELECT id, path, name, is_active, last_scanned_at, file_count, created_at FROM directories WHERE id = ?",
            rusqlite::params![dir_id],
            |row| {
                Ok(DirectoryData {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    is_active: row.get(3)?,
                    last_scanned_at: row.get(4)?,
                    file_count: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| format!("Failed to get directory data: {}", e))?;

    Ok(dir)
}

/**
 * ディレクトリを削除します（画像データは保持、directory_idをNULLに）
 */
#[tauri::command]
pub fn remove_directory(directory_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 画像のdirectory_idをNULLに
    conn.execute(
        "UPDATE images SET directory_id = NULL WHERE directory_id = ?",
        rusqlite::params![directory_id],
    )
    .map_err(|e| format!("Failed to unlink images: {}", e))?;

    conn.execute(
        "DELETE FROM directories WHERE id = ?",
        rusqlite::params![directory_id],
    )
    .map_err(|e| format!("Failed to delete directory: {}", e))?;

    Ok(())
}

/**
 * 全ディレクトリを取得します
 */
#[tauri::command]
pub fn get_all_directories() -> Result<Vec<DirectoryData>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, path, name, is_active, last_scanned_at, file_count, created_at
            FROM directories ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let dirs = stmt
        .query_map([], |row| {
            Ok(DirectoryData {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                is_active: row.get(3)?,
                last_scanned_at: row.get(4)?,
                file_count: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query directories: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect directories: {}", e))?;

    Ok(dirs)
}

/**
 * ディレクトリのアクティブ/非アクティブ状態を切り替えます
 */
#[tauri::command]
pub fn set_directory_active(directory_id: i64, is_active: bool) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let active_val: i64 = if is_active { 1 } else { 0 };
    conn.execute(
        "UPDATE directories SET is_active = ? WHERE id = ?",
        rusqlite::params![active_val, directory_id],
    )
    .map_err(|e| format!("Failed to update directory active state: {}", e))?;

    Ok(())
}

/**
 * 指定ディレクトリを再スキャンします
 */
#[tauri::command]
pub async fn scan_single_directory(directory_id: i64) -> Result<Vec<ImageFileInfo>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // ディレクトリパスを取得
    let dir_path: String = conn
        .query_row(
            "SELECT path FROM directories WHERE id = ?",
            rusqlite::params![directory_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Directory not found: {}", e))?;

    // ファイルスキャン
    let file_paths = crate::fs_utils::scan_images_in_directory(&dir_path)?;

    let result: Vec<ImageFileInfo> = file_paths
        .into_iter()
        .map(|file_path| {
            let file_name = crate::fs_utils::get_file_name(&file_path);
            let file_type = crate::fs_utils::get_file_type(&file_path);
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

    // ファイル数を更新
    conn.execute(
        "UPDATE directories SET file_count = ?, last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?",
        rusqlite::params![result.len() as i64, directory_id],
    )
    .map_err(|e| format!("Failed to update directory: {}", e))?;

    println!("Scanned {} files for directory {}", result.len(), dir_path);

    Ok(result)
}

/**
 * 全アクティブディレクトリをスキャンします
 */
#[tauri::command]
pub async fn scan_all_active_directories() -> Result<Vec<ImageFileInfo>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, path FROM directories WHERE is_active = 1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let dirs: Vec<(i64, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to query active directories: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect directories: {}", e))?;

    drop(stmt);

    let mut all_results = Vec::new();

    for (dir_id, dir_path) in &dirs {
        let file_paths = crate::fs_utils::scan_images_in_directory(dir_path)?;
        let mut dir_count = 0i64;

        for file_path in file_paths {
            let file_name = crate::fs_utils::get_file_name(&file_path);
            let file_type = crate::fs_utils::get_file_type(&file_path);
            let metadata = if file_type == "video" {
                crate::video_utils::extract_video_metadata(&file_path).ok()
            } else {
                None
            };

            all_results.push(ImageFileInfo {
                file_path,
                file_name,
                file_type,
                duration_seconds: metadata.as_ref().map(|m| m.duration_seconds),
                width: metadata.as_ref().map(|m| m.width),
                height: metadata.as_ref().map(|m| m.height),
                video_codec: metadata.as_ref().map(|m| m.video_codec.clone()),
                audio_codec: metadata.as_ref().and_then(|m| m.audio_codec.clone()),
            });
            dir_count += 1;
        }

        conn.execute(
            "UPDATE directories SET file_count = ?, last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?",
            rusqlite::params![dir_count, dir_id],
        )
        .map_err(|e| format!("Failed to update directory: {}", e))?;
    }

    println!("Scanned {} files across {} active directories", all_results.len(), dirs.len());

    Ok(all_results)
}

// ============================================================
// Phase 6: Undo/Redo アクションログ
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionLogEntry {
    pub id: i64,
    pub action_type: String,
    pub target_table: String,
    pub target_id: i64,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
    pub is_undone: i64,
}

/**
 * アクションをログに記録します
 */
#[tauri::command]
pub fn log_action(
    action_type: String,
    target_table: String,
    target_id: i64,
    old_value: Option<String>,
    new_value: Option<String>,
) -> Result<i64, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 新しいアクションを記録すると、それ以降のundoneアクションは無効化（redo不可に）
    conn.execute(
        "DELETE FROM action_log WHERE is_undone = 1",
        [],
    )
    .map_err(|e| format!("Failed to clear redo stack: {}", e))?;

    conn.execute(
        "INSERT INTO action_log (action_type, target_table, target_id, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![action_type, target_table, target_id, old_value, new_value],
    )
    .map_err(|e| format!("Failed to log action: {}", e))?;

    // 最大50件に制限
    conn.execute(
        "DELETE FROM action_log WHERE id NOT IN (SELECT id FROM action_log ORDER BY id DESC LIMIT 50)",
        [],
    )
    .map_err(|e| format!("Failed to trim action log: {}", e))?;

    Ok(conn.last_insert_rowid())
}

/**
 * 最新のundo可能なアクションを取得します
 */
#[tauri::command]
pub fn get_last_undoable_action() -> Result<Option<ActionLogEntry>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let result = conn.query_row(
        "SELECT id, action_type, target_table, target_id, old_value, new_value, created_at, is_undone
        FROM action_log WHERE is_undone = 0 ORDER BY id DESC LIMIT 1",
        [],
        |row| {
            Ok(ActionLogEntry {
                id: row.get(0)?,
                action_type: row.get(1)?,
                target_table: row.get(2)?,
                target_id: row.get(3)?,
                old_value: row.get(4)?,
                new_value: row.get(5)?,
                created_at: row.get(6)?,
                is_undone: row.get(7)?,
            })
        },
    );

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to get undoable action: {}", e)),
    }
}

/**
 * 最新のredo可能なアクションを取得します
 */
#[tauri::command]
pub fn get_last_redoable_action() -> Result<Option<ActionLogEntry>, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let result = conn.query_row(
        "SELECT id, action_type, target_table, target_id, old_value, new_value, created_at, is_undone
        FROM action_log WHERE is_undone = 1 ORDER BY id ASC LIMIT 1",
        [],
        |row| {
            Ok(ActionLogEntry {
                id: row.get(0)?,
                action_type: row.get(1)?,
                target_table: row.get(2)?,
                target_id: row.get(3)?,
                old_value: row.get(4)?,
                new_value: row.get(5)?,
                created_at: row.get(6)?,
                is_undone: row.get(7)?,
            })
        },
    );

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to get redoable action: {}", e)),
    }
}

/**
 * アクションをundo済みとしてマークします
 */
#[tauri::command]
pub fn mark_action_undone(action_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "UPDATE action_log SET is_undone = 1 WHERE id = ?",
        rusqlite::params![action_id],
    )
    .map_err(|e| format!("Failed to mark action as undone: {}", e))?;

    Ok(())
}

/**
 * アクションをredo済みとしてマークします
 */
#[tauri::command]
pub fn mark_action_redone(action_id: i64) -> Result<(), String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "UPDATE action_log SET is_undone = 0 WHERE id = ?",
        rusqlite::params![action_id],
    )
    .map_err(|e| format!("Failed to mark action as redone: {}", e))?;

    Ok(())
}

// ============================================================
// Phase 6: エクスポート/インポート
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
struct ExportImageData {
    file_path: String,
    file_name: String,
    file_type: String,
    comment: Option<String>,
    tags: Option<String>,
    rating: i64,
    is_favorite: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportGroupData {
    id: i64,
    name: String,
    description: Option<String>,
    color: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportGroupMembership {
    group_name: String,
    image_file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportData {
    version: String,
    exported_at: String,
    images: Vec<ExportImageData>,
    groups: Vec<ExportGroupData>,
    group_memberships: Vec<ExportGroupMembership>,
}

/**
 * メタデータをJSON形式でエクスポートします
 */
#[tauri::command]
pub fn export_metadata_json(output_path: String) -> Result<String, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // 画像メタデータを取得
    let mut stmt = conn
        .prepare("SELECT file_path, file_name, file_type, comment, tags, rating, is_favorite FROM images ORDER BY id")
        .map_err(|e| format!("Failed to prepare images query: {}", e))?;

    let images: Vec<ExportImageData> = stmt
        .query_map([], |row| {
            Ok(ExportImageData {
                file_path: row.get(0)?,
                file_name: row.get(1)?,
                file_type: row.get(2)?,
                comment: row.get(3)?,
                tags: row.get(4)?,
                rating: row.get(5)?,
                is_favorite: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query images: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect images: {}", e))?;

    // グループ情報を取得
    let mut stmt = conn
        .prepare("SELECT id, name, description, color FROM groups ORDER BY id")
        .map_err(|e| format!("Failed to prepare groups query: {}", e))?;

    let groups: Vec<ExportGroupData> = stmt
        .query_map([], |row| {
            Ok(ExportGroupData {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query groups: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect groups: {}", e))?;

    // グループメンバーシップを取得
    let mut stmt = conn
        .prepare(
            "SELECT g.name, i.file_path
            FROM image_groups ig
            JOIN groups g ON ig.group_id = g.id
            JOIN images i ON ig.image_id = i.id
            ORDER BY g.name, i.file_path",
        )
        .map_err(|e| format!("Failed to prepare memberships query: {}", e))?;

    let memberships: Vec<ExportGroupMembership> = stmt
        .query_map([], |row| {
            Ok(ExportGroupMembership {
                group_name: row.get(0)?,
                image_file_path: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query memberships: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect memberships: {}", e))?;

    let export_data = ExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Local::now().to_rfc3339(),
        images,
        groups,
        group_memberships: memberships,
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    let mut file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;

    file.write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write JSON file: {}", e))?;

    println!("Exported {} images, {} groups, {} memberships to JSON",
        export_data.images.len(), export_data.groups.len(), export_data.group_memberships.len());

    Ok(output_path)
}

/**
 * メタデータをCSV形式でエクスポートします
 */
#[tauri::command]
pub fn export_metadata_csv(output_path: String) -> Result<String, String> {
    use rusqlite::Connection;

    let db_path = crate::db::get_db_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT file_path, file_name, file_type, comment, tags, rating, is_favorite FROM images ORDER BY id",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut wtr = csv::Writer::from_path(&output_path)
        .map_err(|e| format!("Failed to create CSV file: {}", e))?;

    // ヘッダー
    wtr.write_record(["file_path", "file_name", "file_type", "comment", "tags", "rating", "is_favorite"])
        .map_err(|e| format!("Failed to write CSV header: {}", e))?;

    let mut count = 0u64;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|e| format!("Failed to query images: {}", e))?;

    for row_result in rows {
        let (file_path, file_name, file_type, comment, tags, rating, is_favorite) =
            row_result.map_err(|e| format!("Failed to read row: {}", e))?;

        wtr.write_record([
            &file_path,
            &file_name,
            &file_type,
            &comment.unwrap_or_default(),
            &tags.unwrap_or_default(),
            &rating.to_string(),
            &is_favorite.to_string(),
        ])
        .map_err(|e| format!("Failed to write CSV row: {}", e))?;

        count += 1;
    }

    wtr.flush()
        .map_err(|e| format!("Failed to flush CSV: {}", e))?;

    println!("Exported {} images to CSV", count);

    Ok(output_path)
}

/**
 * JSONファイルからメタデータをインポートします
 */
#[tauri::command]
pub fn import_metadata_json(input_path: String) -> Result<String, String> {
    use rusqlite::Connection;

    let json_str = fs::read_to_string(&input_path)
        .map_err(|e| format!("Failed to read input file: {}", e))?;

    let export_data: ExportData = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let db_path = crate::db::get_db_path()?;
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut updated_images = 0u64;
    let mut created_groups = 0u64;
    let mut added_memberships = 0u64;

    // 画像メタデータの更新（file_pathでマッチ）
    for img in &export_data.images {
        let exists: bool = tx
            .query_row(
                "SELECT 1 FROM images WHERE file_path = ?",
                rusqlite::params![img.file_path],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if exists {
            tx.execute(
                "UPDATE images SET comment = ?, tags = ?, rating = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE file_path = ?",
                rusqlite::params![img.comment, img.tags, img.rating, img.is_favorite, img.file_path],
            )
            .map_err(|e| format!("Failed to update image: {}", e))?;
            updated_images += 1;
        }
    }

    // グループのインポート（名前でマッチ、なければ新規作成）
    for group in &export_data.groups {
        let existing_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM groups WHERE name = ?",
                rusqlite::params![group.name],
                |row| row.get(0),
            )
            .ok();

        if existing_id.is_none() {
            tx.execute(
                "INSERT INTO groups (name, description, color) VALUES (?, ?, ?)",
                rusqlite::params![group.name, group.description, group.color],
            )
            .map_err(|e| format!("Failed to create group: {}", e))?;
            created_groups += 1;
        }
    }

    // グループメンバーシップの復元
    for membership in &export_data.group_memberships {
        let group_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM groups WHERE name = ?",
                rusqlite::params![membership.group_name],
                |row| row.get(0),
            )
            .ok();

        let image_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM images WHERE file_path = ?",
                rusqlite::params![membership.image_file_path],
                |row| row.get(0),
            )
            .ok();

        if let (Some(gid), Some(iid)) = (group_id, image_id) {
            tx.execute(
                "INSERT OR IGNORE INTO image_groups (image_id, group_id) VALUES (?, ?)",
                rusqlite::params![iid, gid],
            )
            .map_err(|e| format!("Failed to add membership: {}", e))?;
            added_memberships += 1;
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    let summary = format!(
        "Import complete: {} images updated, {} groups created, {} memberships added",
        updated_images, created_groups, added_memberships
    );
    println!("{}", summary);

    Ok(summary)
}

// ============================================================
// Phase 6: ファイルウォッチャー
// ============================================================

/**
 * ファイルウォッチャーを起動します
 */
#[tauri::command]
pub fn start_file_watcher(app: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    crate::watcher::start_watching(&app, paths)
}

/**
 * ファイルウォッチャーを停止します
 */
#[tauri::command]
pub fn stop_file_watcher(app: tauri::AppHandle) -> Result<(), String> {
    crate::watcher::stop_watching(&app)
}

/**
 * 現在監視中のディレクトリパスを取得します
 */
#[tauri::command]
pub fn get_watched_directories(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    crate::watcher::get_watched_paths(&app)
}
