pub mod commands;
pub mod models;
pub mod utils;

pub use models::*;

use commands::{
    detect_codex_path, get_app_settings, get_codex_config, get_presets, launch_codex_app,
    pick_codex_path, restore_codex_default, save_app_settings, save_codex_config, save_codex_model,
    save_presets,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_codex_config,
            save_codex_config,
            save_codex_model,
            restore_codex_default,
            get_presets,
            save_presets,
            get_app_settings,
            save_app_settings,
            pick_codex_path,
            detect_codex_path,
            launch_codex_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
