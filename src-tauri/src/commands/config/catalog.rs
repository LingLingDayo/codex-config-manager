use std::path::{Path, PathBuf};

use super::toml_utils::{is_line_exact_key, parse_toml_string_value};

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

/// 将 config.toml 中的 model_catalog_json 值解析为绝对路径（相对路径基于 .codex 目录）
pub fn resolve_catalog_path(codex_dir: &Path, catalog_file: &str) -> PathBuf {
    let p = Path::new(catalog_file);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        codex_dir.join(p)
    }
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

/// 为指定 slug 创建一个结构完整且符合 Codex ModelInfo 规范的模型条目：
/// 优先从现有的 models 数组中挑选一个参考模型条目（深拷贝）并替换 slug、display_name 与 description；
/// 若当前没有任何参考条目，则基于最小完备骨架构造，确保绝不会因字段缺失导致 Codex 反序列化失败崩溃。
pub fn create_model_entry(
    existing_models: &[serde_json::Value],
    slug: &str,
    display_name: &str,
) -> serde_json::Value {
    if let Some(template) = existing_models.first() {
        if let Some(obj) = template.as_object() {
            let mut cloned = obj.clone();
            cloned.insert("slug".to_string(), serde_json::json!(slug));
            cloned.insert("display_name".to_string(), serde_json::json!(display_name));
            cloned.insert("description".to_string(), serde_json::json!(display_name));
            cloned.insert("is_custom_added".to_string(), serde_json::json!(true));
            return serde_json::Value::Object(cloned);
        }
    }

    serde_json::json!({
        "slug": slug,
        "display_name": display_name,
        "description": display_name,
        "default_reasoning_level": "medium",
        "supported_reasoning_levels": [
            { "effort": "low", "description": "Fast responses with lighter reasoning" },
            { "effort": "medium", "description": "Balances speed and reasoning depth for everyday tasks" },
            { "effort": "high", "description": "Greater reasoning depth for complex problems" },
            { "effort": "xhigh", "description": "Extra high reasoning depth for complex problems" },
            { "effort": "max", "description": "Maximum reasoning depth for the hardest problems" },
            { "effort": "ultra", "description": "Maximum reasoning with automatic task delegation" }
        ],
        "default_reasoning_summary": "none",
        "default_service_tier": null,
        "default_verbosity": "low",
        "experimental_supported_tools": [],
        "hidden": false,
        "input_modalities": ["text", "image"],
        "instructions": null,
        "instructions_variables": null,
        "is_custom_added": true,
        "model_specialty": null,
        "multi_agent": null,
        "multi_agent_version": "v2",
        "node_repl_auto_review_required": false,
        "node_repl_disabled": false,
        "permissions": null,
        "prefer_websockets": true,
        "priority": 10,
        "service_tiers": [
            { "description": "1.5x speed, increased usage", "id": "priority", "name": "Fast" },
            { "description": "The fastest available responses for latency-sensitive work.", "id": "ultrafast", "name": "Ultrafast" }
        ],
        "shell_type": "shell_command",
        "support_verbosity": true,
        "supported_in_api": true,
        "supports_image_detail_original": true,
        "supports_parallel_tool_calls": true,
        "supports_personality": false,
        "supports_reasoning_summaries": true,
        "supports_reasoning_summary_parameter": true,
        "supports_search_tool": true,
        "tool_mode": "code_mode_only",
        "truncation_policy": { "limit": 10000, "mode": "tokens" },
        "upgrade": null,
        "use_responses_lite": true,
        "visibility": "list",
        "web_search_tool_type": "text_and_image"
    })
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

        let is_custom_added = models[idx]
            .get("is_custom_added")
            .and_then(|b| b.as_bool())
            .unwrap_or(false);

        // 如果是自定义追加的模型，或者条目仅有极简壳（小于等于3个字段），直接整体移除
        if is_custom_added || models[idx].as_object().map(|e| e.len() <= 3).unwrap_or(false) {
            models.remove(idx);
            return serde_json::to_string_pretty(&v)
                .map(Some)
                .map_err(|e| format!("序列化模型目录失败: {}", e));
        }

        // 原生内置条目：绝对不能直接删除 display_name 字段，否则 Codex 反序列化将因 missing field 崩溃；
        // 将 display_name 安全重置为 slug 本身
        let current_dn = models[idx].get("display_name").and_then(|s| s.as_str()).unwrap_or("");
        if current_dn == slug {
            return Ok(None);
        }
        if let Some(entry) = models[idx].as_object_mut() {
            entry.insert("display_name".to_string(), serde_json::json!(slug));
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
        let new_entry = create_model_entry(models, slug, trimmed_dn);
        models.push(new_entry);
    }

    serde_json::to_string_pretty(&v)
        .map(Some)
        .map_err(|e| format!("序列化模型目录失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_display_name_from_catalog_edge_cases() {
        let catalog = r#"{ "models": [ { "slug": "a" }, { "slug": "b", "display_name": "B 别名" } ] }"#;
        assert_eq!(parse_display_name_from_catalog(catalog, "b"), "B 别名");
        assert_eq!(parse_display_name_from_catalog(catalog, "a"), "");
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

        let lines = vec!["# model_catalog_json = \"old.json\"".to_string()];
        assert_eq!(parse_active_catalog_file_from_lines(&lines), None);

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
        assert_eq!(lines.len(), 5);
        assert_eq!(lines[2], "model_catalog_json = \"ccm-model-catalog.json\"");
        assert_eq!(lines[3], "model_provider = \"custom\"");
    }

    #[test]
    fn test_apply_display_name_to_catalog_creates_complete_entry() {
        let result = apply_display_name_to_catalog(None, "glm-5.3", "GLM 5.3").unwrap();
        let content = result.expect("应生成新目录内容");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 1);
        assert_eq!(models[0]["slug"], "glm-5.3");
        assert_eq!(models[0]["display_name"], "GLM 5.3");
        assert_eq!(models[0]["shell_type"], "shell_command");
        assert_eq!(models[0]["visibility"], "list");
        assert_eq!(models[0]["priority"], 10);
    }

    #[test]
    fn test_apply_display_name_to_catalog_clones_existing_template() {
        let catalog = r#"{
  "models": [
    {
      "slug": "gpt-5.6-sol",
      "display_name": "5.6 Sol",
      "priority": 1,
      "shell_type": "shell_command",
      "custom_field": "preserved"
    }
  ]
}"#;
        let result = apply_display_name_to_catalog(Some(catalog), "glm-5.3", "GLM 5.3").unwrap();
        let content = result.expect("应成功追加条目");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[1]["slug"], "glm-5.3");
        assert_eq!(models[1]["display_name"], "GLM 5.3");
        assert_eq!(models[1]["custom_field"], "preserved");
        assert_eq!(models[1]["is_custom_added"], true);
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
        assert_eq!(models[0]["context_window"], 272000);
        assert_eq!(models[1]["display_name"], "5.6 Terra");

        let no_change = apply_display_name_to_catalog(Some(&content), "gpt-5.6-sol", "5.6 Sol").unwrap();
        assert!(no_change.is_none());
    }

    #[test]
    fn test_apply_display_name_to_catalog_clear_alias_safe() {
        // 原生模型：清除别名时，必须保留 display_name 键，重置为 slug
        let catalog = r#"{ "models": [ { "slug": "gpt-5.6-sol", "display_name": "Custom Sol", "context_window": 100, "priority": 1 } ] }"#;
        let result = apply_display_name_to_catalog(Some(catalog), "gpt-5.6-sol", "").unwrap();
        let content = result.expect("应产生清除变更");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 1);
        assert_eq!(models[0]["display_name"], "gpt-5.6-sol");
        assert_eq!(models[0]["context_window"], 100);

        // 自定义追加的模型：清除别名时，安全整项删除
        let custom_catalog = r#"{ "models": [ { "slug": "glm-5.3", "display_name": "GLM", "is_custom_added": true } ] }"#;
        let result = apply_display_name_to_catalog(Some(custom_catalog), "glm-5.3", "").unwrap();
        let content = result.expect("应移除自定义条目");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(v["models"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_apply_display_name_to_catalog_rejects_invalid_structure() {
        assert!(apply_display_name_to_catalog(Some("not json"), "a", "A").is_err());
        assert!(apply_display_name_to_catalog(Some(r#"{ "models": {} }"#), "a", "A").is_err());
        assert!(apply_display_name_to_catalog(Some(r#"["a"]"#), "a", "A").is_err());
    }
}
