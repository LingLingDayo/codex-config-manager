use std::fs;

use crate::models::CodexConfig;
use crate::utils::{config_file_names, get_codex_dir, get_default_station_url, is_default_station};

#[tauri::command]
pub fn get_codex_config() -> Result<CodexConfig, String> {
    let codex_dir = get_codex_dir()?;
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    let mut key = String::new();
    let mut provider_url = String::new();
    let mut is_enabled = false;
    let mut model = String::new();

    // 1. 如果 config.toml 存在，解析 provider 与配置
    if config_path.exists() {
        let config_content =
            fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;
        let lines: Vec<&str> = config_content.lines().collect();

        let mut active_provider = None;
        let mut last_commented_provider = None;
        let mut in_section = false;

        for line in &lines {
            let trimmed = line.trim();
            if trimmed.starts_with('[') {
                in_section = true;
            }

            if !in_section {
                // 顶层 model 解析 (排除 model_provider)
                if !trimmed.starts_with('#') && trimmed.contains('=') {
                    if let Some((k, raw_val)) = trimmed.split_once('=') {
                        let k = k.trim();
                        if k == "model" {
                            let raw_val = raw_val.trim();
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
                            if !v.is_empty() {
                                model = v;
                            }
                        }
                    }
                }
            }

            if !trimmed.starts_with('#')
                && trimmed.starts_with("model_provider")
                && trimmed.contains('=')
            {
                if let Some(val) = trimmed.split('=').nth(1) {
                    let name = val.trim().trim_matches('"').trim_matches('\'').to_string();
                    if !name.is_empty() && active_provider.is_none() {
                        active_provider = Some(name);
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
        model,
    })
}

pub fn apply_model_to_lines(lines: &mut Vec<String>, model: &str) {
    let trimmed_model = model.trim();

    let mut model_line_idx = None;
    let mut extra_model_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            break;
        }
        let without_comment = trimmed.trim_start_matches('#').trim();
        if let Some((k, _)) = without_comment.split_once('=') {
            if k.trim() == "model" {
                if model_line_idx.is_none() {
                    model_line_idx = Some(i);
                } else {
                    extra_model_indices.push(i);
                }
            }
        }
    }

    for idx in extra_model_indices.into_iter().rev() {
        lines.remove(idx);
    }

    if trimmed_model.is_empty() {
        if let Some(idx) = model_line_idx {
            let trimmed = lines[idx].trim();
            let without_comment = trimmed.trim_start_matches('#').trim();
            lines[idx] = format!("# {}", without_comment);
        }
    } else {
        let new_line = format!("model = \"{}\"", trimmed_model);
        if let Some(idx) = model_line_idx {
            lines[idx] = new_line;
        } else {
            let mut insert_pos = 0;
            for (i, line) in lines.iter().enumerate() {
                let trimmed = line.trim();
                let without_comment = trimmed.trim_start_matches('#').trim();
                if without_comment.starts_with("model_provider") && without_comment.contains('=') {
                    insert_pos = i;
                    break;
                }
            }
            lines.insert(insert_pos, new_line);
        }
    }
}

#[tauri::command]
pub fn save_codex_model(model: String) -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    if !codex_dir.exists() {
        fs::create_dir_all(&codex_dir).map_err(|e| format!("创建 .codex 目录失败: {}", e))?;
    }
    let (config_file, _) = config_file_names();
    let config_path = codex_dir.join(config_file);

    if !config_path.exists() {
        fs::write(&config_path, "").map_err(|e| format!("创建 config.toml 失败: {}", e))?;
    }

    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();

    apply_model_to_lines(&mut lines, &model);

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn save_codex_config(
    key: String,
    provider_url: String,
    model: Option<String>,
) -> Result<(), String> {
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

    if let Some(ref m) = model {
        apply_model_to_lines(&mut lines, m);
    }

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
pub fn restore_codex_default() -> Result<(), String> {
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

    // 2. 注释掉所有未注释的顶层 model 行
    for line in &mut lines {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            break;
        }
        let without_comment = trimmed.trim_start_matches('#').trim();
        if let Some((k, _)) = without_comment.split_once('=') {
            if k.trim() == "model" {
                *line = format!("# {}", without_comment);
            }
        }
    }

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 3. 清理 auth.json 中的 OPENAI_API_KEY，保留有效 JSON 结构及其他凭证
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_model_to_empty_lines() {
        let mut lines = vec!["model_provider = \"custom\"".to_string()];
        apply_model_to_lines(&mut lines, "gpt-5.6-sol");
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines[1], "model_provider = \"custom\"");
    }

    #[test]
    fn test_apply_model_update_existing() {
        let mut lines = vec![
            "model = \"old-model\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_model_to_lines(&mut lines, "gpt-5.6-sol");
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines.len(), 2);
    }

    #[test]
    fn test_apply_model_clear_to_comment() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_model_to_lines(&mut lines, "");
        assert_eq!(lines[0], "# model = \"gpt-5.6-sol\"");
    }

    #[test]
    fn test_apply_model_replaces_commented() {
        let mut lines = vec![
            "# model = \"old-model\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_model_to_lines(&mut lines, "gpt-5.6-sol");
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
    }
}
