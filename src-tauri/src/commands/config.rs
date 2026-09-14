use std::fs;

use crate::models::CodexConfig;
use crate::utils::{
    config_file_names, default_catalog_file_name, get_codex_dir, get_default_station_url,
    is_default_station,
};

/// 解析单行 TOML 字符串或标量值，去除外层引号或尾随注释
fn parse_toml_string_value(raw_val: &str) -> String {
    let raw_val = raw_val.trim();
    if (raw_val.starts_with('"') && raw_val.contains('"'))
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
    }
}

/// 判断某行去除注释后的键名是否严格等于 target_key
fn is_line_exact_key(line: &str, target_key: &str) -> bool {
    let trimmed = line.trim();
    let without_comment = trimmed.trim_start_matches('#').trim();
    if let Some((k, _)) = without_comment.split_once('=') {
        k.trim() == target_key
    } else {
        false
    }
}

pub fn parse_codex_config_from_content(
    config_content: Option<&str>,
    auth_content: Option<&str>,
    catalog_content: Option<&str>,
) -> CodexConfig {
    let mut key = String::new();
    let mut provider_url = String::new();
    let mut is_enabled = false;
    let mut model = String::new();
    let mut model_reasoning_effort = String::new();

    if let Some(content) = config_content {
        let lines: Vec<&str> = content.lines().collect();

        let mut active_provider = None;
        let mut last_commented_provider = None;

        for line in &lines {
            let trimmed = line.trim();

            // 全局解析未注释的 model 与 model_reasoning_effort，避免受 section 截断影响
            if !trimmed.starts_with('#') && trimmed.contains('=') {
                if let Some((k, raw_val)) = trimmed.split_once('=') {
                    let k = k.trim();
                    if k == "model" {
                        let v = parse_toml_string_value(raw_val);
                        if !v.is_empty() {
                            model = v;
                        }
                    } else if k == "model_reasoning_effort" {
                        let v = parse_toml_string_value(raw_val);
                        if !v.is_empty() {
                            model_reasoning_effort = v;
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
                        let v = parse_toml_string_value(raw_val);

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

    // 读取 auth 中的 key，如果存在且有效的话，其 OPENAI_API_KEY 应该以它为准
    if let Some(auth) = auth_content {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(auth) {
            if let Some(k) = v.get("OPENAI_API_KEY") {
                if let Some(k_str) = k.as_str() {
                    if !k_str.is_empty() {
                        key = k_str.to_string();
                    }
                }
            }
        }
    }

    // 别名依附于当前生效的模型 slug：从模型目录中查询其 display_name
    let model_display_name = if !model.is_empty() {
        catalog_content
            .map(|c| parse_display_name_from_catalog(c, &model))
            .unwrap_or_default()
    } else {
        String::new()
    };

    CodexConfig {
        key,
        provider_url,
        is_enabled,
        model,
        model_reasoning_effort,
        model_display_name,
    }
}

/// 从模型目录 JSON 中查询指定 slug 的显示别名（display_name）
pub fn parse_display_name_from_catalog(catalog_content: &str, slug: &str) -> String {
    let slug = slug.trim();
    if slug.is_empty() {
        return String::new();
    }
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(catalog_content) {
        if let Some(models) = v.get("models").and_then(|m| m.as_array()) {
            for entry in models {
                if entry.get("slug").and_then(|s| s.as_str()) == Some(slug) {
                    if let Some(dn) = entry.get("display_name").and_then(|s| s.as_str()) {
                        return dn.to_string();
                    }
                }
            }
        }
    }
    String::new()
}

/// 解析 lines 中当前生效（未注释）的 model_catalog_json 指向的目录文件名
/// 顶层字段仅存在于首个 section 之前，section 内的同名行属于该 section 而不生效
pub fn parse_active_catalog_file_from_lines(lines: &[String]) -> Option<String> {
    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            break;
        }
        if trimmed.starts_with('#') {
            continue;
        }
        if is_line_exact_key(line, "model_catalog_json") {
            if let Some((_, raw_val)) = trimmed.split_once('=') {
                let v = parse_toml_string_value(raw_val);
                if !v.is_empty() {
                    return Some(v);
                }
            }
        }
    }
    None
}

/// 解析 lines 中当前生效（未注释）的 model 值，作为别名依附的 slug 兜底
fn parse_active_model_from_lines(lines: &[String]) -> String {
    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            continue;
        }
        if is_line_exact_key(line, "model") {
            if let Some((_, raw_val)) = trimmed.split_once('=') {
                let v = parse_toml_string_value(raw_val);
                if !v.is_empty() {
                    return v;
                }
            }
        }
    }
    String::new()
}

#[tauri::command]
pub fn get_codex_config() -> Result<CodexConfig, String> {
    let codex_dir = get_codex_dir()?;
    let (config_file, auth_file) = config_file_names();
    let config_path = codex_dir.join(config_file);
    let auth_path = codex_dir.join(auth_file);

    let config_content = if config_path.exists() {
        Some(fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?)
    } else {
        None
    };

    let auth_content = if auth_path.exists() {
        fs::read_to_string(&auth_path).ok()
    } else {
        None
    };

    // 依据 config.toml 中生效的 model_catalog_json 定位并读取模型目录文件
    let catalog_content = config_content.as_deref().and_then(|content| {
        let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        let catalog_file = parse_active_catalog_file_from_lines(&lines)?;
        let catalog_path = resolve_catalog_path(&codex_dir, &catalog_file);
        if catalog_path.exists() {
            fs::read_to_string(&catalog_path).ok()
        } else {
            None
        }
    });

    Ok(parse_codex_config_from_content(
        config_content.as_deref(),
        auth_content.as_deref(),
        catalog_content.as_deref(),
    ))
}

/// 将 config.toml 中的 model_catalog_json 值解析为绝对路径（相对路径基于 .codex 目录）
pub fn resolve_catalog_path(codex_dir: &std::path::Path, catalog_file: &str) -> std::path::PathBuf {
    let p = std::path::Path::new(catalog_file);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        codex_dir.join(p)
    }
}

pub fn apply_model_to_lines(lines: &mut Vec<String>, model: &str) {
    let trimmed_model = model.trim();
    let first_section_idx = lines.iter().position(|l| l.trim().starts_with('['));

    // 全文件扫描所有 key == "model" 的行索引（区分顶层与 section 内部）
    let mut root_model_indices = Vec::new();
    let mut section_model_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if is_line_exact_key(line, "model") {
            if let Some(sec_idx) = first_section_idx {
                if i < sec_idx {
                    root_model_indices.push(i);
                } else {
                    section_model_indices.push(i);
                }
            } else {
                root_model_indices.push(i);
            }
        }
    }

    if trimmed_model.is_empty() {
        // 清空模型：将所有现存的 model 行全部转为注释，防止 section 内部遗留生效
        for &idx in root_model_indices.iter().chain(section_model_indices.iter()) {
            let trimmed = lines[idx].trim();
            if !trimmed.starts_with('#') {
                let without_comment = trimmed.trim_start_matches('#').trim();
                lines[idx] = format!("# {}", without_comment);
            }
        }

        // 清理多余的重复注释行：若顶层有则保留顶层首行，其余包括 section 内部的残留均清理
        let mut to_remove = Vec::new();
        if !root_model_indices.is_empty() {
            to_remove.extend(root_model_indices.into_iter().skip(1));
            to_remove.extend(section_model_indices);
        } else if section_model_indices.len() > 1 {
            to_remove.extend(section_model_indices.into_iter().skip(1));
        }
        to_remove.sort_unstable();
        for idx in to_remove.into_iter().rev() {
            lines.remove(idx);
        }
    } else {
        let new_line = format!("model = \"{}\"", trimmed_model);

        // 如果在顶层已有 model 行（无论已注释或未注释），直接在顶层首个匹配处更新
        if let Some(&first_root_idx) = root_model_indices.first() {
            lines[first_root_idx] = new_line;

            // 删除顶层其余多余行及 section 内部错位的 model 行
            let mut to_remove = Vec::new();
            to_remove.extend(root_model_indices.into_iter().skip(1));
            to_remove.extend(section_model_indices);
            to_remove.sort_unstable();
            for idx in to_remove.into_iter().rev() {
                lines.remove(idx);
            }
        } else {
            // 顶层没有 model 行（原本不存在，或者错写在 section 之后）
            // 彻底清除 section 内部错位的旧行
            let mut to_remove = section_model_indices;
            to_remove.sort_unstable();
            for idx in to_remove.into_iter().rev() {
                lines.remove(idx);
            }

            // 归位到顶层规范位置：优先插入在顶层 model_provider 之前，否则在首个 section 之前
            let current_first_sec = lines.iter().position(|l| l.trim().starts_with('['));
            let limit = current_first_sec.unwrap_or(lines.len());

            let mut insert_pos = limit;
            for (i, line) in lines[..limit].iter().enumerate() {
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

pub fn apply_model_reasoning_effort_to_lines(lines: &mut Vec<String>, effort: &str) {
    let trimmed_effort = effort.trim();
    let first_section_idx = lines.iter().position(|l| l.trim().starts_with('['));

    // 全文件扫描所有 key == "model_reasoning_effort" 的行索引
    let mut root_effort_indices = Vec::new();
    let mut section_effort_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if is_line_exact_key(line, "model_reasoning_effort") {
            if let Some(sec_idx) = first_section_idx {
                if i < sec_idx {
                    root_effort_indices.push(i);
                } else {
                    section_effort_indices.push(i);
                }
            } else {
                root_effort_indices.push(i);
            }
        }
    }

    if trimmed_effort.is_empty() {
        // 清空思考强度：将所有行转为注释
        for &idx in root_effort_indices.iter().chain(section_effort_indices.iter()) {
            let trimmed = lines[idx].trim();
            if !trimmed.starts_with('#') {
                let without_comment = trimmed.trim_start_matches('#').trim();
                lines[idx] = format!("# {}", without_comment);
            }
        }

        // 清理多余的重复注释行
        let mut to_remove = Vec::new();
        if !root_effort_indices.is_empty() {
            to_remove.extend(root_effort_indices.into_iter().skip(1));
            to_remove.extend(section_effort_indices);
        } else if section_effort_indices.len() > 1 {
            to_remove.extend(section_effort_indices.into_iter().skip(1));
        }
        to_remove.sort_unstable();
        for idx in to_remove.into_iter().rev() {
            lines.remove(idx);
        }
    } else {
        let new_line = format!("model_reasoning_effort = \"{}\"", trimmed_effort);

        if let Some(&first_root_idx) = root_effort_indices.first() {
            lines[first_root_idx] = new_line;

            let mut to_remove = Vec::new();
            to_remove.extend(root_effort_indices.into_iter().skip(1));
            to_remove.extend(section_effort_indices);
            to_remove.sort_unstable();
            for idx in to_remove.into_iter().rev() {
                lines.remove(idx);
            }
        } else {
            // 删除 section 内部错位的旧行
            let mut to_remove = section_effort_indices;
            to_remove.sort_unstable();
            for idx in to_remove.into_iter().rev() {
                lines.remove(idx);
            }

            // 寻找顶层归位插入位置：优先在顶层 model 之后，其次在 model_provider 之前，否则在首个 section 之前
            let current_first_sec = lines.iter().position(|l| l.trim().starts_with('['));
            let limit = current_first_sec.unwrap_or(lines.len());

            let mut insert_pos = limit;
            let mut found_target = false;

            // 1. 尝试寻找顶层 model 行
            for (i, line) in lines[..limit].iter().enumerate() {
                if is_line_exact_key(line, "model") {
                    insert_pos = i + 1;
                    found_target = true;
                    break;
                }
            }

            // 2. 若无 model，尝试寻找顶层 model_provider 行
            if !found_target {
                for (i, line) in lines[..limit].iter().enumerate() {
                    let trimmed = line.trim();
                    let without_comment = trimmed.trim_start_matches('#').trim();
                    if without_comment.starts_with("model_provider") && without_comment.contains('=') {
                        insert_pos = i;
                        break;
                    }
                }
            }

            lines.insert(insert_pos, new_line);
        }
    }
}

#[tauri::command]
pub fn save_codex_reasoning_effort(reasoning_effort: String) -> Result<(), String> {
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

    apply_model_reasoning_effort_to_lines(&mut lines, &reasoning_effort);

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    Ok(())
}

/// 确保 lines 顶层存在生效的 model_catalog_json 行：
/// 已有未注释行则沿用不动；仅有注释行则恢复启用；完全缺失则在顶层规范位置插入默认文件名
pub fn apply_model_catalog_json_to_lines(lines: &mut Vec<String>, file_name: &str) {
    // 已存在生效的 model_catalog_json 行：沿用其指向的目录文件，不做任何改动
    if parse_active_catalog_file_from_lines(lines).is_some() {
        return;
    }

    let first_section_idx = lines.iter().position(|l| l.trim().starts_with('['));
    let mut root_commented_indices = Vec::new();
    let mut section_indices = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if is_line_exact_key(line, "model_catalog_json") {
            if let Some(sec_idx) = first_section_idx {
                if i < sec_idx {
                    root_commented_indices.push(i);
                } else {
                    section_indices.push(i);
                }
            } else {
                root_commented_indices.push(i);
            }
        }
    }

    // 清理 section 内部错位的行，防止歧义
    section_indices.sort_unstable();
    for idx in section_indices.into_iter().rev() {
        lines.remove(idx);
    }

    if let Some(&first_idx) = root_commented_indices.first() {
        // 恢复首个注释行并保留其原指向的文件，删除其余重复注释行
        let without_comment = lines[first_idx].trim().trim_start_matches('#').trim();
        lines[first_idx] = without_comment.to_string();
        let mut dup_indices: Vec<usize> = root_commented_indices.iter().skip(1).copied().collect();
        dup_indices.sort_unstable();
        for idx in dup_indices.into_iter().rev() {
            lines.remove(idx);
        }
        return;
    }

    // 完全缺失：归位插入到顶层，优先在 model_reasoning_effort / model 之后，其次 model_provider 之前
    let new_line = format!("model_catalog_json = \"{}\"", file_name);
    let current_first_sec = lines.iter().position(|l| l.trim().starts_with('['));
    let limit = current_first_sec.unwrap_or(lines.len());

    let mut insert_pos = limit;
    let mut found_anchor = false;
    for anchor_key in ["model_reasoning_effort", "model"] {
        for (i, line) in lines[..limit].iter().enumerate() {
            if is_line_exact_key(line, anchor_key) {
                insert_pos = i + 1;
                found_anchor = true;
                break;
            }
        }
        if found_anchor {
            break;
        }
    }
    if !found_anchor {
        for (i, line) in lines[..limit].iter().enumerate() {
            let trimmed = line.trim();
            let without_comment = trimmed.trim_start_matches('#').trim();
            if without_comment.starts_with("model_provider") && without_comment.contains('=') {
                insert_pos = i;
                break;
            }
        }
    }

    lines.insert(insert_pos, new_line);
}

/// 在模型目录 JSON 中为指定 slug 写入/更新/清除显示别名（display_name）
/// 返回 Ok(Some(新内容)) 表示需要写回；Ok(None) 表示无需变更；Err 表示目录文件结构异常，已拒绝覆盖
pub fn apply_display_name_to_catalog(
    catalog_content: Option<&str>,
    slug: &str,
    display_name: &str,
) -> Result<Option<String>, String> {
    let slug = slug.trim();
    if slug.is_empty() {
        return Ok(None);
    }
    let trimmed_dn = display_name.trim();

    if trimmed_dn.is_empty() {
        // 清除别名：仅处理已存在且结构合法的目录文件
        let content = match catalog_content {
            Some(c) if !c.trim().is_empty() => c,
            _ => return Ok(None),
        };
        let mut v: serde_json::Value = serde_json::from_str(content)
            .map_err(|e| format!("模型目录文件解析失败，已跳过别名清理: {}", e))?;
        let models = match v.get_mut("models").and_then(|m| m.as_array_mut()) {
            Some(m) => m,
            None => return Ok(None),
        };
        let idx = match models
            .iter()
            .position(|e| e.get("slug").and_then(|s| s.as_str()) == Some(slug))
        {
            Some(i) => i,
            None => return Ok(None),
        };
        let removed = match models[idx].as_object_mut() {
            Some(entry) => entry.remove("display_name").is_some(),
            None => false,
        };
        if !removed {
            return Ok(None);
        }
        // 条目仅剩 slug 字段时（本工具创建的最小条目）整体移除，避免残留空壳
        if models[idx].as_object().map(|e| e.len() == 1).unwrap_or(false) {
            models.remove(idx);
        }
        return serde_json::to_string_pretty(&v)
            .map(Some)
            .map_err(|e| format!("序列化模型目录失败: {}", e));
    }

    // 写入/更新别名
    let mut v: serde_json::Value = match catalog_content {
        Some(c) if !c.trim().is_empty() => serde_json::from_str(c)
            .map_err(|e| format!("模型目录文件解析失败，已拒绝覆盖: {}", e))?,
        _ => serde_json::json!({ "models": [] }),
    };
    if !v.is_object() {
        return Err("模型目录文件结构异常（顶层非对象），已拒绝覆盖".to_string());
    }
    if v.get("models").is_some() && !v["models"].is_array() {
        return Err("模型目录文件结构异常（models 非数组），已拒绝覆盖".to_string());
    }
    if v.get("models").is_none() {
        v["models"] = serde_json::json!([]);
    }
    let models = v["models"].as_array_mut().unwrap();

    if let Some(entry) = models
        .iter_mut()
        .find(|e| e.get("slug").and_then(|s| s.as_str()) == Some(slug))
    {
        if !entry.is_object() {
            return Err("模型目录条目结构异常，已拒绝覆盖".to_string());
        }
        if entry.get("display_name").and_then(|s| s.as_str()) == Some(trimmed_dn) {
            return Ok(None);
        }
        entry["display_name"] = serde_json::Value::String(trimmed_dn.to_string());
    } else {
        models.push(serde_json::json!({ "slug": slug, "display_name": trimmed_dn }));
    }

    serde_json::to_string_pretty(&v)
        .map(Some)
        .map_err(|e| format!("序列化模型目录失败: {}", e))
}

#[tauri::command]
pub fn save_codex_config(
    key: String,
    provider_url: String,
    model: Option<String>,
    model_reasoning_effort: Option<String>,
    model_display_name: Option<String>,
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

    if let Some(ref e) = model_reasoning_effort {
        apply_model_reasoning_effort_to_lines(&mut lines, e);
    }

    // 处理模型别名：依附于当前生效的模型 slug，写入 model_catalog_json 指向的目录文件
    if let Some(ref dn) = model_display_name {
        let slug = match &model {
            Some(m) if !m.trim().is_empty() => m.trim().to_string(),
            _ => parse_active_model_from_lines(&lines),
        };
        if !slug.is_empty() {
            let trimmed_dn = dn.trim();
            // 确定目录文件：优先沿用 config.toml 中已生效的 model_catalog_json；
            // 写入别名且无生效配置时，恢复注释行或插入本工具自管的默认目录文件名
            let catalog_file = parse_active_catalog_file_from_lines(&lines).or_else(|| {
                if trimmed_dn.is_empty() {
                    None
                } else {
                    apply_model_catalog_json_to_lines(&mut lines, default_catalog_file_name());
                    parse_active_catalog_file_from_lines(&lines)
                }
            });
            if let Some(file) = catalog_file {
                let catalog_path = resolve_catalog_path(&codex_dir, &file);
                let existing = if catalog_path.exists() {
                    Some(
                        fs::read_to_string(&catalog_path)
                            .map_err(|e| format!("读取模型目录文件失败: {}", e))?,
                    )
                } else {
                    None
                };
                if let Some(new_content) =
                    apply_display_name_to_catalog(existing.as_deref(), &slug, trimmed_dn)?
                {
                    fs::write(&catalog_path, new_content)
                        .map_err(|e| format!("写入模型目录文件失败: {}", e))?;
                }
            }
        }
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

    // 2. 注释掉所有未注释的 model 与 model_reasoning_effort 行（全文件扫描，杜绝 section 截断遗漏）
    for line in &mut lines {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if let Some((k, _)) = without_comment.split_once('=') {
            let key = k.trim();
            if (key == "model" || key == "model_reasoning_effort") && !trimmed.starts_with('#') {
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

    #[test]
    fn test_apply_model_reasoning_effort_after_model() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_model_reasoning_effort_to_lines(&mut lines, "high");
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines[1], "model_reasoning_effort = \"high\"");
        assert_eq!(lines[2], "model_provider = \"custom\"");
    }

    #[test]
    fn test_apply_model_reasoning_effort_update_and_clear() {
        let mut lines = vec![
            "model_reasoning_effort = \"low\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_model_reasoning_effort_to_lines(&mut lines, "medium");
        assert_eq!(lines[0], "model_reasoning_effort = \"medium\"");

        apply_model_reasoning_effort_to_lines(&mut lines, "");
        assert_eq!(lines[0], "# model_reasoning_effort = \"medium\"");
    }

    #[test]
    fn test_apply_model_after_section_migrates_to_root() {
        let mut lines = vec![
            "model_provider = \"custom\"".to_string(),
            "[model_providers.custom]".to_string(),
            "name = \"custom\"".to_string(),
            "model = \"legacy-model\"".to_string(),
        ];
        apply_model_to_lines(&mut lines, "gpt-5.6-sol");
        // 旧的在 section 内部的 model 行应被删除，并在顶层标准位置插入
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines[1], "model_provider = \"custom\"");
        assert_eq!(lines[2], "[model_providers.custom]");
        assert_eq!(lines[3], "name = \"custom\"");
        assert_eq!(lines.len(), 4);
    }

    #[test]
    fn test_apply_model_after_section_clear() {
        let mut lines = vec![
            "[model_providers.custom]".to_string(),
            "model = \"legacy-model\"".to_string(),
        ];
        apply_model_to_lines(&mut lines, "");
        assert_eq!(lines[0], "[model_providers.custom]");
        assert_eq!(lines[1], "# model = \"legacy-model\"");
    }

    #[test]
    fn test_apply_reasoning_effort_after_section_migrates_to_root() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "[notice]".to_string(),
            "model_reasoning_effort = \"low\"".to_string(),
        ];
        apply_model_reasoning_effort_to_lines(&mut lines, "high");
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines[1], "model_reasoning_effort = \"high\"");
        assert_eq!(lines[2], "[notice]");
        assert_eq!(lines.len(), 3);
    }

    #[test]
    fn test_parse_string_value_and_exact_key() {
        assert_eq!(parse_toml_string_value("\"gpt-5.6-sol\""), "gpt-5.6-sol");
        assert_eq!(parse_toml_string_value("'gpt-5.6-sol'"), "gpt-5.6-sol");
        assert_eq!(parse_toml_string_value("high # 思考强度"), "high");

        assert!(is_line_exact_key("model = \"gpt-5.6-sol\"", "model"));
        assert!(is_line_exact_key("# model = \"gpt-5.6-sol\"", "model"));
        assert!(!is_line_exact_key("review_model = \"deepseek\"", "model"));
        assert!(!is_line_exact_key("model_provider = \"custom\"", "model"));
        assert!(!is_line_exact_key("model_catalog_json = \"x.json\"", "model"));
    }

    #[test]
    fn test_parse_codex_config_when_model_after_sections() {
        let toml_content = r#"
model_provider = "custom"

[notice]
hide_gpt5_1_migration_prompt = true

[model_providers.custom]
name = "custom"
base_url = "https://api.example.com/v1"
experimental_bearer_token = "sk-test-token"

# 用户把 model 与 model_reasoning_effort 放在了 section 后面或末尾
model = "gpt-5.6-sol"
model_reasoning_effort = "xhigh"
"#;
        let config = parse_codex_config_from_content(Some(toml_content), None, None);
        assert_eq!(config.model, "gpt-5.6-sol");
        assert_eq!(config.model_reasoning_effort, "xhigh");
        assert_eq!(config.provider_url, "https://api.example.com/v1");
        assert_eq!(config.key, "sk-test-token");
        assert!(config.is_enabled);
    }

    #[test]
    fn test_parse_codex_config_when_model_commented_after_sections() {
        let toml_content = r#"
model_provider = "custom"

[model_providers.custom]
base_url = "https://api.example.com/v1"

# model = "gpt-5.6-sol"
# model_reasoning_effort = "high"
"#;
        let config = parse_codex_config_from_content(Some(toml_content), None, None);
        assert_eq!(config.model, "");
        assert_eq!(config.model_reasoning_effort, "");
    }

    #[test]
    fn test_parse_codex_config_ignores_similar_keys() {
        let toml_content = r#"
model_provider = "custom"
review_model = "deepseek-v4-flash"
model_catalog_json = "cockpit.json"

[model_providers.custom]
base_url = "https://api.example.com/v1"
"#;
        let config = parse_codex_config_from_content(Some(toml_content), None, None);
        assert_eq!(config.model, "");
        assert_eq!(config.model_reasoning_effort, "");
    }

    #[test]
    fn test_parse_codex_config_reads_display_name_from_catalog() {
        let toml_content = r#"
model = "gpt-5.6-sol"
model_catalog_json = "ccm-model-catalog.json"
"#;
        let catalog_content = r#"{
  "models": [
    { "slug": "gpt-5.6-sol", "display_name": "5.6 Sol", "context_window": 272000 },
    { "slug": "gpt-5.6-terra", "display_name": "5.6 Terra" }
  ]
}"#;
        let config =
            parse_codex_config_from_content(Some(toml_content), None, Some(catalog_content));
        assert_eq!(config.model, "gpt-5.6-sol");
        assert_eq!(config.model_display_name, "5.6 Sol");
    }

    #[test]
    fn test_parse_codex_config_display_name_empty_without_match_or_model() {
        let toml_content = "model = \"gpt-5.6-sol\"";
        let catalog_content = r#"{ "models": [ { "slug": "other-model", "display_name": "Other" } ] }"#;
        let config =
            parse_codex_config_from_content(Some(toml_content), None, Some(catalog_content));
        assert_eq!(config.model_display_name, "");

        // 未指定模型时即使有目录也不产生别名
        let config = parse_codex_config_from_content(Some("model_provider = \"custom\""), None, Some(catalog_content));
        assert_eq!(config.model_display_name, "");
    }

    #[test]
    fn test_parse_display_name_from_catalog_edge_cases() {
        let catalog = r#"{ "models": [ { "slug": "a" }, { "slug": "b", "display_name": "B 别名" } ] }"#;
        assert_eq!(parse_display_name_from_catalog(catalog, "b"), "B 别名");
        // 条目存在但无 display_name
        assert_eq!(parse_display_name_from_catalog(catalog, "a"), "");
        // slug 不存在 / 空 slug / 非法 JSON
        assert_eq!(parse_display_name_from_catalog(catalog, "c"), "");
        assert_eq!(parse_display_name_from_catalog(catalog, ""), "");
        assert_eq!(parse_display_name_from_catalog("not json", "b"), "");
    }

    #[test]
    fn test_parse_active_catalog_file_from_lines() {
        let lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_catalog_json = \"cockpit-model-catalog.json\"".to_string(),
        ];
        assert_eq!(
            parse_active_catalog_file_from_lines(&lines),
            Some("cockpit-model-catalog.json".to_string())
        );

        // 注释行不生效
        let lines = vec!["# model_catalog_json = \"old.json\"".to_string()];
        assert_eq!(parse_active_catalog_file_from_lines(&lines), None);

        // 排除相似键
        let lines = vec!["model_catalog_json_backup = \"x.json\"".to_string()];
        assert_eq!(parse_active_catalog_file_from_lines(&lines), None);
    }

    #[test]
    fn test_apply_model_catalog_json_keeps_existing_active_line() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_catalog_json = \"cockpit-model-catalog.json\"".to_string(),
        ];
        apply_model_catalog_json_to_lines(&mut lines, "ccm-model-catalog.json");
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[1], "model_catalog_json = \"cockpit-model-catalog.json\"");
    }

    #[test]
    fn test_apply_model_catalog_json_restores_commented_line() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "# model_catalog_json = \"cockpit-model-catalog.json\"".to_string(),
            "# model_catalog_json = \"dup.json\"".to_string(),
        ];
        apply_model_catalog_json_to_lines(&mut lines, "ccm-model-catalog.json");
        // 恢复首个注释行并保留原文件指向，重复行被清理
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[1], "model_catalog_json = \"cockpit-model-catalog.json\"");
    }

    #[test]
    fn test_apply_model_catalog_json_inserts_after_model() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_reasoning_effort = \"high\"".to_string(),
            "model_provider = \"custom\"".to_string(),
            "[model_providers.custom]".to_string(),
            "model_catalog_json = \"misplaced.json\"".to_string(),
        ];
        apply_model_catalog_json_to_lines(&mut lines, "ccm-model-catalog.json");
        // section 内错位行被移除，新行插入到 model_reasoning_effort 之后
        assert_eq!(lines.len(), 5);
        assert_eq!(lines[2], "model_catalog_json = \"ccm-model-catalog.json\"");
        assert_eq!(lines[3], "model_provider = \"custom\"");
    }

    #[test]
    fn test_apply_display_name_to_catalog_creates_minimal_entry() {
        let result = apply_display_name_to_catalog(None, "gpt-5.6-sol", "5.6 Sol").unwrap();
        let content = result.expect("应生成新目录内容");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 1);
        assert_eq!(models[0]["slug"], "gpt-5.6-sol");
        assert_eq!(models[0]["display_name"], "5.6 Sol");
    }

    #[test]
    fn test_apply_display_name_to_catalog_updates_existing_and_preserves_others() {
        let catalog = r#"{
  "models": [
    { "slug": "gpt-5.6-sol", "display_name": "Old Name", "context_window": 272000 },
    { "slug": "gpt-5.6-terra", "display_name": "5.6 Terra" }
  ]
}"#;
        let result = apply_display_name_to_catalog(Some(catalog), "gpt-5.6-sol", "5.6 Sol").unwrap();
        let content = result.expect("应产生更新");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0]["display_name"], "5.6 Sol");
        // 其他元数据字段原样保留
        assert_eq!(models[0]["context_window"], 272000);
        assert_eq!(models[1]["display_name"], "5.6 Terra");

        // 相同别名重复写入无需变更
        let no_change = apply_display_name_to_catalog(Some(&content), "gpt-5.6-sol", "5.6 Sol").unwrap();
        assert!(no_change.is_none());
    }

    #[test]
    fn test_apply_display_name_to_catalog_appends_entry() {
        let catalog = r#"{ "models": [ { "slug": "gpt-5.6-terra", "display_name": "5.6 Terra" } ] }"#;
        let result = apply_display_name_to_catalog(Some(catalog), "gpt-5.6-sol", "5.6 Sol").unwrap();
        let content = result.expect("应追加条目");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[1]["slug"], "gpt-5.6-sol");
        assert_eq!(models[1]["display_name"], "5.6 Sol");
    }

    #[test]
    fn test_apply_display_name_to_catalog_clear_alias() {
        // 清除别名：移除 display_name，保留条目其余元数据
        let catalog = r#"{ "models": [ { "slug": "a", "display_name": "A", "context_window": 100 } ] }"#;
        let result = apply_display_name_to_catalog(Some(catalog), "a", "").unwrap();
        let content = result.expect("应产生清除变更");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 1);
        assert!(models[0].get("display_name").is_none());
        assert_eq!(models[0]["context_window"], 100);

        // 最小条目清除后整体移除
        let minimal = r#"{ "models": [ { "slug": "b", "display_name": "B" } ] }"#;
        let result = apply_display_name_to_catalog(Some(minimal), "b", "  ").unwrap();
        let content = result.expect("应移除最小条目");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(v["models"].as_array().unwrap().len(), 0);

        // 无别名可清 / 无目录文件 / slug 为空：均无需变更
        let no_alias = r#"{ "models": [ { "slug": "a" } ] }"#;
        assert!(apply_display_name_to_catalog(Some(no_alias), "a", "").unwrap().is_none());
        assert!(apply_display_name_to_catalog(None, "a", "").unwrap().is_none());
        assert!(apply_display_name_to_catalog(Some(catalog), "", "X").unwrap().is_none());
    }

    #[test]
    fn test_apply_display_name_to_catalog_rejects_invalid_structure() {
        // 非法 JSON 拒绝覆盖，防止破坏既有目录文件
        assert!(apply_display_name_to_catalog(Some("not json"), "a", "A").is_err());
        // models 非数组拒绝覆盖
        assert!(apply_display_name_to_catalog(Some(r#"{ "models": {} }"#), "a", "A").is_err());
        // 顶层非对象拒绝覆盖
        assert!(apply_display_name_to_catalog(Some(r#"["a"]"#), "a", "A").is_err());
    }
}
