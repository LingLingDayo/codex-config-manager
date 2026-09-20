/// 解析单行 TOML 字符串或标量值，去除外层引号或尾随注释
pub fn parse_toml_string_value(raw_val: &str) -> String {
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
pub fn is_line_exact_key(line: &str, target_key: &str) -> bool {
    let trimmed = line.trim();
    let without_comment = trimmed.trim_start_matches('#').trim();
    if let Some((k, _)) = without_comment.split_once('=') {
        k.trim() == target_key
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
