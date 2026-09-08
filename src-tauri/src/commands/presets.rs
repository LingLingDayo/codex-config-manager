use std::fs;

use crate::models::PresetConfig;
use crate::utils::{
    get_codex_dir, get_default_station_name, get_default_station_url, is_default_station,
    presets_file_name,
};

pub fn default_presets() -> Vec<PresetConfig> {
    let name = get_default_station_name();
    let url = get_default_station_url();
    vec![PresetConfig {
        id: "preset_default_station".to_string(),
        name: format!("{} (推荐)", name),
        key: "".to_string(),
        provider_url: url,
        updated_at: None,
    }]
}

#[tauri::command]
pub fn get_presets() -> Result<Vec<PresetConfig>, String> {
    let codex_dir = get_codex_dir()?;
    let presets_path = codex_dir.join(presets_file_name());

    if !presets_path.exists() {
        let defaults = default_presets();
        let _ = save_presets(defaults.clone());
        return Ok(defaults);
    }

    let content = fs::read_to_string(&presets_path)
        .map_err(|e| format!("读取预设文件失败: {}", e))?;

    if content.trim().is_empty() {
        let defaults = default_presets();
        let _ = save_presets(defaults.clone());
        return Ok(defaults);
    }

    let mut presets: Vec<PresetConfig> = serde_json::from_str(&content)
        .map_err(|e| format!("解析预设配置失败: {}", e))?;

    let def_url = get_default_station_url();
    for p in &mut presets {
        if is_default_station(&p.provider_url) && p.provider_url != def_url {
            p.provider_url = def_url.clone();
        }
    }

    Ok(presets)
}

#[tauri::command]
pub fn save_presets(presets: Vec<PresetConfig>) -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    if !codex_dir.exists() {
        fs::create_dir_all(&codex_dir).map_err(|e| format!("创建 .codex 目录失败: {}", e))?;
    }
    let presets_path = codex_dir.join(presets_file_name());

    let content = serde_json::to_string_pretty(&presets)
        .map_err(|e| format!("序列化预设配置失败: {}", e))?;

    fs::write(&presets_path, content)
        .map_err(|e| format!("写入预设文件失败: {}", e))?;

    Ok(())
}
