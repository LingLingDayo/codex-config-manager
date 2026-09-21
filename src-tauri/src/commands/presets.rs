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
        model: "".to_string(),
        model_reasoning_effort: "".to_string(),
        model_display_name: "".to_string(),
        model_aliases: vec![],
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_presets() {
        let presets = default_presets();
        assert_eq!(presets.len(), 1);
        assert_eq!(presets[0].id, "preset_default_station");
        assert!(presets[0].name.contains("(推荐)"));
        assert_eq!(presets[0].provider_url, get_default_station_url());
        assert_eq!(presets[0].key, "");
        assert_eq!(presets[0].model, "");
        assert_eq!(presets[0].model_reasoning_effort, "");
        assert_eq!(presets[0].model_display_name, "");
        assert!(presets[0].model_aliases.is_empty());
    }

    #[test]
    fn test_preset_config_serialization() {
        let preset = PresetConfig {
            id: "preset_custom".to_string(),
            name: "自定义中转站".to_string(),
            key: "sk-test123".to_string(),
            provider_url: "https://api.example.com".to_string(),
            model: "gpt-5.6-sol".to_string(),
            model_reasoning_effort: "high".to_string(),
            model_display_name: "5.6 Sol".to_string(),
            model_aliases: vec![crate::models::ModelAlias {
                slug: "gpt-5.6-sol".to_string(),
                display_name: "5.6 Sol".to_string(),
            }],
            updated_at: Some(123456789),
        };

        let json = serde_json::to_string(&preset).unwrap();
        let deserialized: PresetConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, preset);

        // 兼容缺少扩展字段的旧版 JSON 格式
        let legacy_json = r#"{"id":"p1","name":"旧配置","key":"sk-xxx","provider_url":"https://api.legacy.com"}"#;
        let legacy_parsed: PresetConfig = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(legacy_parsed.model, "");
        assert_eq!(legacy_parsed.model_reasoning_effort, "");
        assert_eq!(legacy_parsed.model_display_name, "");
        assert!(legacy_parsed.model_aliases.is_empty());
    }
}

