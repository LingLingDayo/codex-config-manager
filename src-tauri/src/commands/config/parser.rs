use crate::models::CodexConfig;
use super::catalog::{parse_display_name_from_catalog, parse_model_aliases_from_catalog};
use super::toml_utils::{is_line_exact_key, parse_toml_string_value};

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

    let model_aliases = catalog_content
        .map(parse_model_aliases_from_catalog)
        .unwrap_or_default();

    // 别名依附于当前生效的模型 slug：从模型目录中查询其 display_name
    // 若未显式配置自定义 model，则尝试查询官方默认模型 gpt-5.6-sol 的定制别名
    let model_display_name = if !model.is_empty() {
        catalog_content
            .map(|c| parse_display_name_from_catalog(c, &model))
            .unwrap_or_default()
    } else {
        let raw = catalog_content
            .map(|c| parse_display_name_from_catalog(c, "gpt-5.6-sol"))
            .unwrap_or_default();
        if raw == "gpt-5.6-sol" {
            String::new()
        } else {
            raw
        }
    };

    CodexConfig {
        key,
        provider_url,
        is_enabled,
        model,
        model_reasoning_effort,
        model_display_name,
        model_aliases,
    }
}

/// 解析 lines 中当前生效（未注释）的 model 值，作为别名依附的 slug 兜底
pub fn parse_active_model_from_lines(lines: &[String]) -> String {
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

#[cfg(test)]
mod tests {
    use super::*;

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
        assert_eq!(config.model_aliases.len(), 2);
        assert_eq!(config.model_aliases[0].slug, "gpt-5.6-sol");
        assert_eq!(config.model_aliases[0].display_name, "5.6 Sol");
        assert_eq!(config.model_aliases[1].slug, "gpt-5.6-terra");
        assert_eq!(config.model_aliases[1].display_name, "5.6 Terra");
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
}
