use std::path::Path;
use walkdir::WalkDir;

/// 画像ファイルの拡張子リスト
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];

/// 動画ファイルの拡張子リスト
const VIDEO_EXTENSIONS: &[&str] = &["mp4"];

/// すべてのサポート対象拡張子を取得
fn get_all_extensions() -> Vec<&'static str> {
    let mut exts = Vec::new();
    exts.extend_from_slice(IMAGE_EXTENSIONS);
    exts.extend_from_slice(VIDEO_EXTENSIONS);
    exts
}

/**
 * ファイルの種類を判定します
 *
 * @param path ファイルのパス
 * @return "image", "video", または "unknown"
 */
pub fn get_file_type(path: &str) -> String {
    if let Some(ext) = Path::new(path).extension() {
        let ext_str = ext.to_str().unwrap_or("").to_lowercase();
        if IMAGE_EXTENSIONS.contains(&ext_str.as_str()) {
            return "image".to_string();
        } else if VIDEO_EXTENSIONS.contains(&ext_str.as_str()) {
            return "video".to_string();
        }
    }
    "unknown".to_string()
}

/**
 * 指定されたディレクトリ内のメディアファイル（画像・動画）をスキャンします
 *
 * @param dir_path スキャンするディレクトリのパス
 * @return 見つかったメディアファイルのパスの配列
 */
pub fn scan_images_in_directory(dir_path: &str) -> Result<Vec<String>, String> {
    let valid_extensions = get_all_extensions();
    let mut file_paths = Vec::new();

    for entry in WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                if valid_extensions.contains(&ext_str.as_str()) {
                    file_paths.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(file_paths)
}

/**
 * パスからファイル名を取得します
 *
 * @param path ファイルのパス
 * @return ファイル名
 */
pub fn get_file_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}
