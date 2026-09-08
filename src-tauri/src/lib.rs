pub mod commands;
pub mod models;
pub mod utils;

pub use models::*;

use commands::{
    get_codex_config, get_presets, restore_codex_default, save_codex_config, save_codex_model,
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
            save_presets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
