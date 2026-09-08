use std::fs;
use std::path::{Path, PathBuf};

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct CodexConfig {
    key: String,
    provider_url: String,
    is_enabled: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct PresetConfig {
    pub id: String,
    pub name: String,
    pub key: String,
    pub provider_url: String,
    #[serde(default)]
    pub updated_at: Option<u64>,
}

fn get_codex_dir() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法找到用户主目录".to_string())?;
    Ok(Path::new(&home).join(".codex"))
}

/// 根据编译模式返回配置文件名：dev 用 _dev 后缀，release 用正式文件名
fn config_file_names() -> (&'static str, &'static str) {
    if cfg!(debug_assertions) {
        ("config_dev.toml", "auth_dev.json")
    } else {
        ("config.toml", "auth.json")
    }
}

#[tauri::command]
fn get_codex_config() -> Result<CodexConfig, String> {
    let codex_dir = get_codex_dir()?;
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    let mut key = String::new();
    let mut provider_url = String::new();
    let mut is_enabled = false;

    // 1. 如果 config.toml 存在，解析 provider 与配置
    if config_path.exists() {
        let config_content =
            fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;
        let lines: Vec<&str> = config_content.lines().collect();

        let mut active_provider = None;
        let mut last_commented_provider = None;

        for line in &lines {
            let trimmed = line.trim();
            if !trimmed.starts_with('#')
                && trimmed.starts_with("model_provider")
                && trimmed.contains('=')
            {
                if let Some(val) = trimmed.split('=').nth(1) {
                    let name = val.trim().trim_matches('"').trim_matches('\'').to_string();
                    if !name.is_empty() {
                        active_provider = Some(name);
                        break;
                    }
                }
            } else {
                let without_comment = trimmed.trim_start_matches('#').trim();
                if without_comment.starts_with("model_provider") && without_comment.contains('=') {
                    if let Some(val) = without_comment.split('=').nth(1) {
                        let name = val.trim().trim_matches('"').trim_matches('\'').to_string();
                        if !name.is_empty() && last_commented_provider.is_none() {
                            last_commented_provider = Some(name);
                        }
                    }
                }
            }
        }

        let provider_name = if let Some(p) = active_provider {
            is_enabled = true;
            p
        } else if let Some(p) = last_commented_provider {
            is_enabled = false;
            p
        } else {
            is_enabled = false;
            "custom".to_string()
        };

        // 根据 provider_name 寻找对应的配置节
        let target_section = format!("[model_providers.{}]", provider_name);
        let mut section_start_idx = None;
        for (i, line) in lines.iter().enumerate() {
            if line.trim() == target_section {
                section_start_idx = Some(i);
                break;
            }
        }

        if let Some(start) = section_start_idx {
            for i in (start + 1)..lines.len() {
                let line = lines[i].trim();
                if line.starts_with('[') {
                    break;
                }
                if !line.starts_with('#') && line.contains('=') {
                    let parts: Vec<&str> = line.splitn(2, '=').collect();
                    if parts.len() == 2 {
                        let k = parts[0].trim();
                        let raw_val = parts[1].trim();
                        let v = if (raw_val.starts_with('"') && raw_val.contains('"'))
                            || (raw_val.starts_with('\'') && raw_val.contains('\''))
                        {
                            let quote_char = raw_val.chars().next().unwrap();
                            raw_val
                                .trim_start_matches(quote_char)
                                .split(quote_char)
                                .next()
                                .unwrap_or("")
                                .to_string()
                        } else {
                            raw_val.split('#').next().unwrap_or("").trim().to_string()
                        };

                        if k == "experimental_bearer_token" {
                            key = v;
                        } else if k == "base_url" {
                            provider_url = v;
                        }
                    }
                }
            }
        }
    }

    // 2. 读取 auth.json 中的 key，如果 auth.json 存在且有效的话，其 OPENAI_API_KEY 应该与 key 一致或以它为准
    if auth_path.exists() {
        if let Ok(auth_content) = fs::read_to_string(&auth_path) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&auth_content) {
                if let Some(k) = v.get("OPENAI_API_KEY") {
                    if let Some(k_str) = k.as_str() {
                        if !k_str.is_empty() {
                            key = k_str.to_string();
                        }
                    }
                }
            }
        }
    }

    Ok(CodexConfig {
        key,
        provider_url,
        is_enabled,
    })
}

fn get_default_station_name() -> String {
    std::env::var("VITE_DEFAULT_STATION_NAME")
        .ok()
        .or_else(|| option_env!("VITE_DEFAULT_STATION_NAME").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_DEFAULT_STATION_IDENTIFIER").ok())
        .or_else(|| option_env!("VITE_DEFAULT_STATION_IDENTIFIER").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_STATION_NAME").ok())
        .or_else(|| option_env!("VITE_STATION_NAME").map(|s| s.to_string()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "LingAI".to_string())
}

fn get_default_station_url() -> String {
    std::env::var("VITE_DEFAULT_STATION_URL")
        .ok()
        .or_else(|| option_env!("VITE_DEFAULT_STATION_URL").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_STATION_URL").ok())
        .or_else(|| option_env!("VITE_STATION_URL").map(|s| s.to_string()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "https://lingai.linglingdayo.top".to_string())
}

fn is_default_station(url: &str) -> bool {
    let trimmed = url.trim().trim_end_matches('/');
    let def_name = get_default_station_name();
    let def_url = get_default_station_url();
    let def_url_trimmed = def_url.trim_end_matches('/');

    trimmed.eq_ignore_ascii_case(&def_name)
        || trimmed.eq_ignore_ascii_case(def_url_trimmed)
        || trimmed.eq_ignore_ascii_case(&format!("{}/v1", def_url_trimmed))
        // 兼容原生 LingAI 默认识别
        || trimmed.eq_ignore_ascii_case("lingai")
        || trimmed.eq_ignore_ascii_case("https://lingai.linglingdayo.top")
        || trimmed.eq_ignore_ascii_case("https://lingai.linglingdayo.top/v1")
}

#[tauri::command]
fn save_codex_config(key: String, provider_url: String) -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    if !codex_dir.exists() {
        fs::create_dir_all(&codex_dir).map_err(|e| format!("创建 .codex 目录失败: {}", e))?;
    }
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    if !config_path.exists() {
        fs::write(&config_path, "").map_err(|e| format!("创建 config.toml 失败: {}", e))?;
    }

    let trimmed_url = provider_url.trim().trim_end_matches('/');
    let real_url = if is_default_station(trimmed_url) {
        get_default_station_url()
    } else {
        trimmed_url.to_string()
    };

    // 1. 读取并修改 config.toml
    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();

    // 规范化 model_provider 行：确保有且仅有一行未注释的 model_provider = "custom"，清理重复或多余的行
    let mut first_provider_line_idx = None;
    let mut extra_provider_line_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if without_comment.starts_with("model_provider") && without_comment.contains('=') {
            if first_provider_line_idx.is_none() {
                first_provider_line_idx = Some(i);
            } else {
                extra_provider_line_indices.push(i);
            }
        }
    }

    // 倒序删除多余的 model_provider 行，防止索引位移
    for i in extra_provider_line_indices.into_iter().rev() {
        lines.remove(i);
    }

    if let Some(idx) = first_provider_line_idx {
        lines[idx] = "model_provider = \"custom\"".to_string();
    } else {
        lines.insert(0, "model_provider = \"custom\"".to_string());
    }

    // 检查并更新 [model_providers.custom] 节
    let mut custom_section_start_idx = None;
    for (i, line) in lines.iter().enumerate() {
        if line.trim() == "[model_providers.custom]" {
            custom_section_start_idx = Some(i);
            break;
        }
    }

    if let Some(start) = custom_section_start_idx {
        let mut section_end_idx = lines.len();
        for i in (start + 1)..lines.len() {
            if lines[i].trim().starts_with('[') {
                section_end_idx = i;
                break;
            }
        }

        let mut has_name = false;
        let mut has_base_url = false;
        let mut has_api = false;
        let mut has_requires_auth = false;
        let mut has_supports_websockets = false;
        let mut has_token = false;

        for i in (start + 1)..section_end_idx {
            let line = &mut lines[i];
            let trimmed = line.trim();
            if !trimmed.starts_with('#') && trimmed.contains('=') {
                let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
                if parts.len() == 2 {
                    let k = parts[0].trim();
                    if k == "name" {
                        *line = "name = \"custom\"".to_string();
                        has_name = true;
                    } else if k == "base_url" {
                        *line = format!("base_url = \"{}\"", real_url);
                        has_base_url = true;
                    } else if k == "api" {
                        *line = "api = \"responses\"".to_string();
                        has_api = true;
                    } else if k == "requires_openai_auth" {
                        *line = "requires_openai_auth = true".to_string();
                        has_requires_auth = true;
                    } else if k == "supports_websockets" {
                        *line = "supports_websockets = false".to_string();
                        has_supports_websockets = true;
                    } else if k == "experimental_bearer_token" {
                        *line = format!("experimental_bearer_token = \"{}\"", key);
                        has_token = true;
                    }
                }
            }
        }

        let mut added_lines = Vec::new();
        if !has_name {
            added_lines.push("name = \"custom\"".to_string());
        }
        if !has_base_url {
            added_lines.push(format!("base_url = \"{}\"", real_url));
        }
        if !has_api {
            added_lines.push("api = \"responses\"".to_string());
        }
        if !has_requires_auth {
            added_lines.push("requires_openai_auth = true".to_string());
        }
        if !has_supports_websockets {
            added_lines.push("supports_websockets = false".to_string());
        }
        if !has_token {
            added_lines.push(format!("experimental_bearer_token = \"{}\"", key));
        }

        for (offset, added_line) in added_lines.into_iter().enumerate() {
            lines.insert(section_end_idx + offset, added_line);
        }
    } else {
        // 追加新 [model_providers.custom] 段落
        lines.push(String::new());
        lines.push("[model_providers.custom]".to_string());
        lines.push("name = \"custom\"".to_string());
        lines.push(format!("base_url = \"{}\"", real_url));
        lines.push("api = \"responses\"".to_string());
        lines.push("requires_openai_auth = true".to_string());
        lines.push("supports_websockets = false".to_string());
        lines.push(format!("experimental_bearer_token = \"{}\"", key));
    }

    // 写回 config.toml
    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 2. 写入 auth.json
    let need_create_auth = if !auth_path.exists() {
        true
    } else {
        match fs::read_to_string(&auth_path) {
            Ok(content) => content.trim().is_empty(),
            Err(_) => true,
        }
    };

    if need_create_auth {
        let auth_content = format!(
            "{{\n  \"OPENAI_API_KEY\": \"{}\",\n  \"auth_mode\": \"apikey\"\n}}",
            key
        );
        fs::write(&auth_path, auth_content).map_err(|e| format!("写入 auth.json 失败: {}", e))?;
    } else if let Ok(content) = fs::read_to_string(&auth_path) {
        if let Ok(mut json_val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = json_val.as_object_mut() {
                obj.insert(
                    "OPENAI_API_KEY".to_string(),
                    serde_json::Value::String(key.clone()),
                );
                if !obj.contains_key("auth_mode") {
                    obj.insert(
                        "auth_mode".to_string(),
                        serde_json::Value::String("apikey".to_string()),
                    );
                }
                if let Ok(updated_content) = serde_json::to_string_pretty(&json_val) {
                    let _ = fs::write(&auth_path, updated_content);
                }
            }
        } else {
            let auth_content = format!(
                "{{\n  \"OPENAI_API_KEY\": \"{}\",\n  \"auth_mode\": \"apikey\"\n}}",
                key
            );
            let _ = fs::write(&auth_path, auth_content);
        }
    }

    Ok(())
}

#[tauri::command]
fn restore_codex_default() -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    if !config_path.exists() {
        return Ok(());
    }

    // 1. 修改 config.toml，注释掉所有 model_provider 行并清理重复
    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();
    let mut first_provider_idx = None;
    let mut extra_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if without_comment.starts_with("model_provider") && without_comment.contains('=') {
            if first_provider_idx.is_none() {
                first_provider_idx = Some(i);
            } else {
                extra_indices.push(i);
            }
        }
    }

    for i in extra_indices.into_iter().rev() {
        lines.remove(i);
    }

    if let Some(idx) = first_provider_idx {
        let trimmed = lines[idx].trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        lines[idx] = format!("# {}", without_comment);
    }

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 2. 清理 auth.json 中的 OPENAI_API_KEY，保留有效 JSON 结构及其他凭证
    if auth_path.exists() {
        if let Ok(content) = fs::read_to_string(&auth_path) {
            if let Ok(mut json_val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = json_val.as_object_mut() {
                    obj.remove("OPENAI_API_KEY");
                    if obj.get("auth_mode").and_then(|v| v.as_str()) == Some("apikey")
                        && !obj.contains_key("tokens")
                    {
                        obj.remove("auth_mode");
                    }
                    if let Ok(updated_content) = serde_json::to_string_pretty(&json_val) {
                        let _ = fs::write(&auth_path, updated_content);
                    }
                }
            } else {
                let _ = fs::write(&auth_path, "{}");
            }
        }
    }

    Ok(())
}

fn presets_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "presets_dev.json"
    } else {
        "presets.json"
    }
}

fn default_presets() -> Vec<PresetConfig> {
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
fn get_presets() -> Result<Vec<PresetConfig>, String> {
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
fn save_presets(presets: Vec<PresetConfig>) -> Result<(), String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_codex_config,
            save_codex_config,
            restore_codex_default,
            get_presets,
            save_presets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
