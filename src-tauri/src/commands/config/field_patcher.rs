use super::toml_utils::is_line_exact_key;

fn first_section_index(lines: &[String]) -> Option<usize> {
    lines.iter().position(|l| l.trim().starts_with('['))
}

fn collect_key_indices(lines: &[String], key: &str) -> (Vec<usize>, Vec<usize>) {
    let first_sec = first_section_index(lines);
    let mut root = Vec::new();
    let mut section = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if !is_line_exact_key(line, key) {
            continue;
        }
        match first_sec {
            Some(sec) if i >= sec => section.push(i),
            _ => root.push(i),
        }
    }

    (root, section)
}

fn comment_out_line(line: &mut String) {
    let trimmed = line.trim();
    if trimmed.starts_with('#') {
        return;
    }
    *line = format!("# {}", trimmed);
}

fn remove_sorted_desc(lines: &mut Vec<String>, mut indices: Vec<usize>) {
    indices.sort_unstable();
    indices.dedup();
    for idx in indices.into_iter().rev() {
        if idx < lines.len() {
            lines.remove(idx);
        }
    }
}

fn find_insert_pos(lines: &[String], insert_after: &[&str], insert_before: &[&str]) -> usize {
    let limit = first_section_index(lines).unwrap_or(lines.len());
    let window = &lines[..limit];

    for after_key in insert_after {
        if let Some(i) = window.iter().position(|l| is_line_exact_key(l, after_key)) {
            return i + 1;
        }
    }
    for before_key in insert_before {
        if let Some(i) = window.iter().position(|l| is_line_exact_key(l, before_key)) {
            return i;
        }
    }
    limit
}

/// 对 TOML 顶层字符串字段执行声明式补丁：
/// - 空值：注释全部匹配行，保留顶层首行（无顶层则保留 section 首行），删除重复残留
/// - 非空：更新顶层首个匹配行并清理重复/错位行；若顶层不存在则按锚点插入
///
/// `insert_after` 按优先级寻找“插入到该键之后”的锚点；
/// `insert_before` 在无 after 锚点时寻找“插入到该键之前”的锚点。
pub fn apply_top_level_string_field(
    lines: &mut Vec<String>,
    key: &str,
    value: &str,
    insert_after: &[&str],
    insert_before: &[&str],
) {
    let trimmed = value.trim();
    let (root, section) = collect_key_indices(lines, key);

    if trimmed.is_empty() {
        for &idx in root.iter().chain(section.iter()) {
            comment_out_line(&mut lines[idx]);
        }

        let mut to_remove = Vec::new();
        if !root.is_empty() {
            to_remove.extend(root.into_iter().skip(1));
            to_remove.extend(section);
        } else if section.len() > 1 {
            to_remove.extend(section.into_iter().skip(1));
        }
        remove_sorted_desc(lines, to_remove);
        return;
    }

    let new_line = format!("{} = \"{}\"", key, trimmed);

    if let Some(&first_root) = root.first() {
        lines[first_root] = new_line;
        let mut to_remove = Vec::new();
        to_remove.extend(root.into_iter().skip(1));
        to_remove.extend(section);
        remove_sorted_desc(lines, to_remove);
        return;
    }

    remove_sorted_desc(lines, section);
    let insert_pos = find_insert_pos(lines, insert_after, insert_before);
    lines.insert(insert_pos, new_line);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_top_level_field_inserts_by_anchors() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_top_level_string_field(
            &mut lines,
            "temperature",
            "0.2",
            &["model"],
            &["model_provider"],
        );
        assert_eq!(lines[0], "model = \"gpt-5.6-sol\"");
        assert_eq!(lines[1], "temperature = \"0.2\"");
        assert_eq!(lines[2], "model_provider = \"custom\"");
    }

    #[test]
    fn test_apply_top_level_field_updates_and_dedups() {
        let mut lines = vec![
            "temperature = \"0.1\"".to_string(),
            "model_provider = \"custom\"".to_string(),
            "[notice]".to_string(),
            "temperature = \"0.9\"".to_string(),
        ];
        apply_top_level_string_field(
            &mut lines,
            "temperature",
            "0.2",
            &["model"],
            &["model_provider"],
        );
        assert_eq!(lines[0], "temperature = \"0.2\"");
        assert_eq!(lines[1], "model_provider = \"custom\"");
        assert_eq!(lines[2], "[notice]");
        assert_eq!(lines.len(), 3);
    }

    #[test]
    fn test_apply_top_level_field_empty_comments_keep_first() {
        let mut lines = vec![
            "temperature = \"0.2\"".to_string(),
            "temperature = \"0.8\"".to_string(),
            "model_provider = \"custom\"".to_string(),
        ];
        apply_top_level_string_field(&mut lines, "temperature", "", &[], &["model_provider"]);
        assert_eq!(lines[0], "# temperature = \"0.2\"");
        assert_eq!(lines[1], "model_provider = \"custom\"");
        assert_eq!(lines.len(), 2);
    }

    #[test]
    fn test_apply_top_level_field_migrates_section_to_root() {
        let mut lines = vec![
            "model_provider = \"custom\"".to_string(),
            "[notice]".to_string(),
            "max_tokens = \"128\"".to_string(),
        ];
        apply_top_level_string_field(&mut lines, "max_tokens", "256", &[], &["model_provider"]);
        assert_eq!(lines[0], "max_tokens = \"256\"");
        assert_eq!(lines[1], "model_provider = \"custom\"");
        assert_eq!(lines[2], "[notice]");
        assert_eq!(lines.len(), 3);
    }
}
