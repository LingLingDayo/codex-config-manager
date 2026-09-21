use super::field_patcher::apply_top_level_string_field;

pub fn apply_model_to_lines(lines: &mut Vec<String>, model: &str) {
    apply_top_level_string_field(lines, "model", model, &[], &["model_provider"]);
}

pub fn apply_model_reasoning_effort_to_lines(lines: &mut Vec<String>, effort: &str) {
    apply_top_level_string_field(
        lines,
        "model_reasoning_effort",
        effort,
        &["model"],
        &["model_provider"],
    );
}

/// 规范化 model_provider 行并安全合并/创建 [model_providers.custom] 节
pub fn apply_custom_provider_to_lines(lines: &mut Vec<String>, key: &str, real_url: &str) {
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
}

/// 注释掉所有 model_provider、model 及 model_reasoning_effort 行
pub fn comment_out_custom_provider_to_lines(lines: &mut Vec<String>) {
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

    // 注释掉所有未注释的 model 与 model_reasoning_effort 行（全文件扫描，杜绝 section 截断遗漏）
    for line in lines {
        let trimmed = line.trim();
        let without_comment = trimmed.trim_start_matches('#').trim();
        if let Some((k, _)) = without_comment.split_once('=') {
            let key = k.trim();
            if (key == "model" || key == "model_reasoning_effort") && !trimmed.starts_with('#') {
                *line = format!("# {}", without_comment);
            }
        }
    }
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
    fn test_apply_custom_provider_to_lines_new() {
        let mut lines = Vec::new();
        apply_custom_provider_to_lines(&mut lines, "sk-12345", "https://api.openai.com/v1");
        assert_eq!(lines[0], "model_provider = \"custom\"");
        assert!(lines.contains(&"[model_providers.custom]".to_string()));
        assert!(lines.contains(&"experimental_bearer_token = \"sk-12345\"".to_string()));
        assert!(lines.contains(&"base_url = \"https://api.openai.com/v1\"".to_string()));
    }

    #[test]
    fn test_comment_out_custom_provider_to_lines() {
        let mut lines = vec![
            "model = \"gpt-5.6\"".to_string(),
            "model_reasoning_effort = \"high\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        comment_out_custom_provider_to_lines(&mut lines);
        assert_eq!(lines[0], "# model = \"gpt-5.6\"");
        assert_eq!(lines[1], "# model_reasoning_effort = \"high\"");
        assert_eq!(lines[2], "# model_provider = \"custom\"");
    }
}
