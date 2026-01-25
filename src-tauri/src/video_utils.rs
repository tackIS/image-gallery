use std::path::PathBuf;
use std::process::Command;
use std::fs;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration_seconds: f64,
    pub width: i32,
    pub height: i32,
    pub video_codec: String,
    pub audio_codec: Option<String>,
}

/// ffmpegバイナリのパスを検出
pub fn find_ffmpeg() -> Option<PathBuf> {
    // 1. PATH環境変数から検索
    if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Some(PathBuf::from(path));
        }
    }

    // 2. 標準的なインストール場所をチェック
    let standard_paths = vec![
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ];

    for path in standard_paths {
        if PathBuf::from(path).exists() {
            return Some(PathBuf::from(path));
        }
    }

    None
}

/// ffmpegが利用可能かチェック
#[tauri::command]
pub fn check_ffmpeg_available() -> Result<String, String> {
    match find_ffmpeg() {
        Some(path) => {
            // バージョン情報取得
            let output = Command::new(&path)
                .arg("-version")
                .output()
                .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

            let version = String::from_utf8_lossy(&output.stdout);
            let first_line = version.lines().next().unwrap_or("Unknown version");

            Ok(format!("FFmpeg found: {} ({})", path.display(), first_line))
        },
        None => Err("FFmpeg not found. Please install via Homebrew: brew install ffmpeg".to_string()),
    }
}

/// ffprobeで動画メタデータを取得
pub fn extract_video_metadata(video_path: &str) -> Result<VideoMetadata, String> {
    let ffmpeg_path = find_ffmpeg()
        .ok_or("FFmpeg not found")?;

    let ffprobe_path = ffmpeg_path
        .parent()
        .unwrap()
        .join("ffprobe");

    if !ffprobe_path.exists() {
        return Err("ffprobe not found".to_string());
    }

    // ffprobeでJSON形式の情報取得
    let output = Command::new(ffprobe_path)
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe execution failed".to_string());
    }

    // JSONパース
    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    // ビデオストリーム取得
    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .ok_or("No video stream found")?;

    let audio_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "audio")
        });

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Duration not found")?;

    Ok(VideoMetadata {
        duration_seconds: duration,
        width: video_stream["width"].as_i64().unwrap_or(0) as i32,
        height: video_stream["height"].as_i64().unwrap_or(0) as i32,
        video_codec: video_stream["codec_name"].as_str().unwrap_or("unknown").to_string(),
        audio_codec: audio_stream.map(|s| s["codec_name"].as_str().unwrap_or("unknown").to_string()),
    })
}

/// サムネイルディレクトリを取得（なければ作成）
pub fn get_thumbnail_dir() -> Result<PathBuf, String> {
    let db_path = crate::db::get_db_path()?;
    let thumbnail_dir = db_path
        .parent()
        .ok_or("Failed to get db directory")?
        .join("thumbnails");

    fs::create_dir_all(&thumbnail_dir)
        .map_err(|e| format!("Failed to create thumbnail directory: {}", e))?;

    Ok(thumbnail_dir)
}

/// 動画のサムネイルを生成
pub fn generate_thumbnail(
    video_path: &str,
    image_id: i64,
    timestamp_seconds: f64,
) -> Result<String, String> {
    let ffmpeg_path = find_ffmpeg()
        .ok_or("FFmpeg not found")?;

    let thumbnail_dir = get_thumbnail_dir()?;
    let thumbnail_path = thumbnail_dir.join(format!("{}.jpg", image_id));

    // サムネイルが既に存在する場合はスキップ
    if thumbnail_path.exists() {
        return Ok(thumbnail_path.to_string_lossy().to_string());
    }

    // ffmpegコマンド実行
    let output = Command::new(ffmpeg_path)
        .args(&[
            "-ss", &timestamp_seconds.to_string(),  // 指定秒数にシーク
            "-i", video_path,                       // 入力ファイル
            "-vframes", "1",                        // 1フレームのみ
            "-vf", "scale=400:400:force_original_aspect_ratio=decrease", // リサイズ
            "-q:v", "2",                            // JPEG品質（1-31, 低いほど高品質）
            thumbnail_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg thumbnail generation failed: {}", error));
    }

    Ok(thumbnail_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_video_thumbnail(
    video_path: String,
    image_id: i64,
) -> Result<String, String> {
    // 動画の3秒目からサムネイル生成（冒頭は黒画面が多いため）
    generate_thumbnail(&video_path, image_id, 3.0)
}
