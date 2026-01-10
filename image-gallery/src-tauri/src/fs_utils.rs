use std::path::Path;
use walkdir::WalkDir;

/// 画像ファイルの拡張子リスト
const VALID_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];

/**
 * 指定されたディレクトリ内の画像ファイルをスキャンします
 *
 * @param dir_path スキャンするディレクトリのパス
 * @return 見つかった画像ファイルのパスの配列
 */
pub fn scan_images_in_directory(dir_path: &str) -> Result<Vec<String>, String> {
    let mut image_paths = Vec::new();

    for entry in WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                if VALID_EXTENSIONS.contains(&ext_str.as_str()) {
                    image_paths.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(image_paths)
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
