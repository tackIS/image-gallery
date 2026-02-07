use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEvent};
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// ファイルシステム変更イベントのペイロード
#[derive(Clone, serde::Serialize)]
pub struct FileChangePayload {
    pub added: Vec<String>,
    pub removed: Vec<String>,
}

/// ウォッチャーの状態を保持
pub struct WatcherState {
    _debouncer: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    watched_paths: Vec<String>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            _debouncer: None,
            watched_paths: Vec::new(),
        }
    }
}

/// サポート対象の拡張子かチェック
fn is_supported_extension(path: &Path) -> bool {
    const SUPPORTED: &[&str] = &[
        "jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov",
    ];

    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// ウォッチャーを起動して指定ディレクトリの変更を監視
pub fn start_watching(app: &AppHandle, paths: Vec<String>) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    // 既存のウォッチャーを停止
    watcher_state._debouncer = None;
    watcher_state.watched_paths.clear();

    if paths.is_empty() {
        return Ok(());
    }

    let app_handle = app.clone();

    // 2秒のデバウンスでイベントをバッチ処理
    let mut debouncer = new_debouncer(
        Duration::from_secs(2),
        move |result: Result<Vec<DebouncedEvent>, notify::Error>| {
            match result {
                Ok(events) => {
                    let mut added = Vec::new();
                    let mut removed = Vec::new();

                    for event in events {
                        let path = &event.path;
                        if !is_supported_extension(path) {
                            continue;
                        }

                        let path_str = path.to_string_lossy().to_string();

                        if path.exists() {
                            added.push(path_str);
                        } else {
                            removed.push(path_str);
                        }
                    }

                    // 重複を除去
                    added.sort();
                    added.dedup();
                    removed.sort();
                    removed.dedup();

                    if !added.is_empty() || !removed.is_empty() {
                        let payload = FileChangePayload { added, removed };
                        if let Err(e) = app_handle.emit("file-system-change", &payload) {
                            eprintln!("Failed to emit file-system-change event: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Watch error: {}", e);
                }
            }
        },
    )
    .map_err(|e| format!("Failed to create debouncer: {}", e))?;

    // 各ディレクトリを監視対象に追加
    for path in &paths {
        let dir_path = Path::new(path);
        if dir_path.exists() && dir_path.is_dir() {
            debouncer
                .watcher()
                .watch(dir_path, RecursiveMode::Recursive)
                .map_err(|e| format!("Failed to watch {}: {}", path, e))?;
            watcher_state.watched_paths.push(path.clone());
        }
    }

    println!(
        "File watcher started for {} directories",
        watcher_state.watched_paths.len()
    );

    watcher_state._debouncer = Some(debouncer);

    Ok(())
}

/// ウォッチャーを停止
pub fn stop_watching(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    watcher_state._debouncer = None;
    watcher_state.watched_paths.clear();

    println!("File watcher stopped");

    Ok(())
}

/// 現在監視中のディレクトリパスを取得
pub fn get_watched_paths(app: &AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<Mutex<WatcherState>>();
    let watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(watcher_state.watched_paths.clone())
}
