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

    if !config_path.exists() {
        return Err("未找到 .codex/config.toml 配置文件".to_string());
    }

    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let lines: Vec<&str> = config_content.lines().collect();

    // 1. 寻找 model_provider 这一行
    let mut provider_name = "codex_local_access".to_string(); // 默认值
    let mut is_enabled = false;

    for line in &lines {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if without_comment.starts_with("model_provider") && without_comment.contains('=') {
            is_enabled = !trimmed.starts_with('#');
            if let Some(val) = without_comment.split('=').nth(1) {
                provider_name = val.trim().trim_matches('"').to_string();
            }
            break;
        }
    }

    // 2. 根据 provider_name 寻找对应的配置节
    let target_section = format!("[model_providers.{}]", provider_name);
    let mut section_start_idx = None;
    for (i, line) in lines.iter().enumerate() {
        if line.trim() == target_section {
            section_start_idx = Some(i);
            break;
        }
    }

    let mut key = String::new();
    let mut provider_url = String::new();

    if let Some(start) = section_start_idx {
        for i in (start + 1)..lines.len() {
            let line = lines[i].trim();
            if line.starts_with('[') {
                break; // 进入下一个 section 了
            }
            if !line.starts_with('#') && line.contains('=') {
                let parts: Vec<&str> = line.splitn(2, '=').collect();
                if parts.len() == 2 {
                    let k = parts[0].trim();
                    let v = parts[1].trim().trim_matches('"').to_string();
                    if k == "experimental_bearer_token" {
                        key = v;
                    } else if k == "base_url" {
                        provider_url = v;
                    }
                }
            }
        }
    }

    // 3. 读取 auth.json 中的 key，如果 auth.json 存在且有效的话，其 OPENAI_API_KEY 应该与 key 一致或以它为准
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

#[tauri::command]
fn save_codex_config(key: String, provider_url: String) -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    if !config_path.exists() {
        return Err("未找到 .codex/config.toml 配置文件".to_string());
    }

    // 映射 provider_url
    let trimmed_url = provider_url.trim();
    let real_url = if trimmed_url.eq_ignore_ascii_case("lingai")
        || trimmed_url.trim_end_matches('/') == "https://lingai.linglingdayo.top"
        || trimmed_url.trim_end_matches('/') == "https://lingai.linglingdayo.top/v1"
    {
        "https://lingai.linglingdayo.top".to_string()
    } else {
        provider_url
    };

    // 1. 读取并修改 config.toml
    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();

    // 寻找未注释的 model_provider = "xxx"
    let mut active_provider = None;
    for line in &lines {
        let trimmed = line.trim();
        if !trimmed.starts_with('#') && trimmed.contains("model_provider") && trimmed.contains('=')
        {
            if let Some(val) = trimmed.split('=').nth(1) {
                let name = val.trim().trim_matches('"').trim_matches('\'').to_string();
                if !name.is_empty() {
                    active_provider = Some(name);
                    break;
                }
            }
        }
    }

    // 检查对应的配置节是否存在
    let mut active_section_exists = false;
    if let Some(ref name) = active_provider {
        let target_section = format!("[model_providers.{}]", name);
        for line in &lines {
            if line.trim() == target_section {
                active_section_exists = true;
                break;
            }
        }
    }

    let use_custom_format = active_provider.is_none() || !active_section_exists;

    if use_custom_format {
        // 注释掉所有现有的 model_provider 行，防止冲突
        for line in &mut lines {
            let trimmed = line.trim();
            let without_comment = trimmed.trim_start_matches('#').trim();
            if without_comment.starts_with("model_provider") && without_comment.contains('=') {
                if !trimmed.starts_with('#') {
                    *line = format!("# {}", trimmed);
                }
            }
        }

        // 插入 model_provider = "custom" 到最开始
        lines.insert(0, "model_provider = \"custom\"".to_string());

        // 检查 [model_providers.custom] 节是否已存在于 lines 中
        let mut custom_section_start_idx = None;
        for (i, line) in lines.iter().enumerate() {
            if line.trim() == "[model_providers.custom]" {
                custom_section_start_idx = Some(i);
                break;
            }
        }

        if let Some(start) = custom_section_start_idx {
            // 如果已存在，更新其内容，强制按用户自定义格式设置所有字段
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
            if !has_token {
                added_lines.push(format!("experimental_bearer_token = \"{}\"", key));
            }
            if !has_supports_websockets {
                added_lines.push("supports_websockets = false".to_string());
            }
            if !has_requires_auth {
                added_lines.push("requires_openai_auth = true".to_string());
            }
            if !has_api {
                added_lines.push("api = \"responses\"".to_string());
            }
            if !has_base_url {
                added_lines.push(format!("base_url = \"{}\"", real_url));
            }
            if !has_name {
                added_lines.push("name = \"custom\"".to_string());
            }

            for added_line in added_lines {
                lines.insert(section_end_idx, added_line);
            }
        } else {
            // 追加新段落，严格匹配用户指定的格式
            lines.push(String::new());
            lines.push("[model_providers.custom]".to_string());
            lines.push("name = \"custom\"".to_string());
            lines.push(format!("base_url = \"{}\"", real_url));
            lines.push("api = \"responses\"".to_string());
            lines.push("requires_openai_auth = true".to_string());
            lines.push("supports_websockets = false".to_string());
            lines.push(format!("experimental_bearer_token = \"{}\"", key));
        }
    } else {
        // 原有 provider 存在，就地更新该配置节，不破坏/不转换已有的其他字段和命名
        let name = active_provider.unwrap();
        let target_section = format!("[model_providers.{}]", name);
        let mut section_start_idx = None;
        for (i, line) in lines.iter().enumerate() {
            if line.trim() == target_section {
                section_start_idx = Some(i);
                break;
            }
        }

        if let Some(start) = section_start_idx {
            let mut section_end_idx = lines.len();
            for i in (start + 1)..lines.len() {
                if lines[i].trim().starts_with('[') {
                    section_end_idx = i;
                    break;
                }
            }

            let mut has_base_url = false;
            let mut has_token = false;

            for i in (start + 1)..section_end_idx {
                let line = &mut lines[i];
                let trimmed = line.trim();
                if !trimmed.starts_with('#') && trimmed.contains('=') {
                    let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
                    if parts.len() == 2 {
                        let k = parts[0].trim();
                        if k == "base_url" {
                            *line = format!("base_url = \"{}\"", real_url);
                            has_base_url = true;
                        } else if k == "experimental_bearer_token" {
                            *line = format!("experimental_bearer_token = \"{}\"", key);
                            has_token = true;
                        }
                    }
                }
            }

            let mut offset = 0;
            if !has_token {
                lines.insert(
                    section_end_idx,
                    format!("experimental_bearer_token = \"{}\"", key),
                );
                offset += 1;
            }
            if !has_base_url {
                lines.insert(
                    section_end_idx + offset,
                    format!("base_url = \"{}\"", real_url),
                );
            }
        }
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
    } else {
        // 如果 auth.json 存在且非空，仅更新 OPENAI_API_KEY 字段，避免破坏其他配置内容
        if let Ok(content) = fs::read_to_string(&auth_path) {
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
            }
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
        return Err("未找到 .codex/config.toml 配置文件".to_string());
    }

    // 1. 修改 config.toml，注释掉 model_provider 行
    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();

    for line in &mut lines {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if without_comment.starts_with("model_provider") && without_comment.contains('=') {
            if !trimmed.starts_with('#') {
                *line = format!("# {}", trimmed);
            }
            break;
        }
    }

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 2. 清空 auth.json 文件内容
    fs::write(&auth_path, "").map_err(|e| format!("清空 auth.json 失败: {}", e))?;

    Ok(())
}

fn presets_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "presets_dev.json"
    } else {
        "presets.json"
    }
}

#[tauri::command]
fn get_presets() -> Result<Vec<PresetConfig>, String> {
    let codex_dir = get_codex_dir()?;
    let presets_path = codex_dir.join(presets_file_name());

    if !presets_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&presets_path)
        .map_err(|e| format!("读取预设文件失败: {}", e))?;

    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    let presets: Vec<PresetConfig> = serde_json::from_str(&content)
        .map_err(|e| format!("解析预设配置失败: {}", e))?;

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
