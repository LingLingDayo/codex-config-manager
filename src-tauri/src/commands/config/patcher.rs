use super::toml_utils::is_line_exact_key;

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
