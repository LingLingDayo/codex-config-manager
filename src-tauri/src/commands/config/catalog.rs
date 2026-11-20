use std::path::{Path, PathBuf};

use crate::models::ModelAlias;

use super::field_patcher::apply_top_level_string_field;
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

/// 解析模型目录中的全部 slug → display_name 映射，供多项别名列表回填
pub fn parse_model_aliases_from_catalog(catalog_content: &str) -> Vec<ModelAlias> {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(catalog_content) else {
        return Vec::new();
    };
    let Some(models) = v.get("models").and_then(|m| m.as_array()) else {
        return Vec::new();
    };

    let mut aliases = Vec::new();
    for entry in models {
        let Some(slug) = entry.get("slug").and_then(|s| s.as_str()).map(str::trim) else {
            continue;
        };
        if slug.is_empty() {
            continue;
        }
        let display_name = entry
            .get("display_name")
            .and_then(|s| s.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or(slug)
            .to_string();
        aliases.push(ModelAlias {
            slug: slug.to_string(),
            display_name,
        });
    }
    aliases
}

/// 规范化别名列表：去掉空 slug、别名为空时回退为 slug 本身，重复 slug 保留最后一次
pub fn normalize_model_aliases(aliases: &[ModelAlias]) -> Vec<ModelAlias> {
    let mut result: Vec<ModelAlias> = Vec::new();
    for alias in aliases {
        let slug = alias.slug.trim();
        if slug.is_empty() {
            continue;
        }
        let trimmed_dn = alias.display_name.trim();
        let display_name = if trimmed_dn.is_empty() {
            slug.to_string()
        } else {
            trimmed_dn.to_string()
        };
        if let Some(existing) = result.iter_mut().find(|item| item.slug == slug) {
            existing.display_name = display_name;
        } else {
            result.push(ModelAlias {
                slug: slug.to_string(),
                display_name,
            });
        }
    }
    result
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

/// 确保 lines 顶层存在生效的指向本工具专属文件（如 ccm-model-catalog.json）的 model_catalog_json 行：
/// 绝不复用第三方工具的目录文件；若存在旧的行，统一规范为本工具专属文件；
/// 仅有注释行则恢复启用为专属文件；完全缺失则在顶层规范位置插入。
pub fn apply_model_catalog_json_to_lines(lines: &mut Vec<String>, file_name: &str) {
    apply_top_level_string_field(
        lines,
        "model_catalog_json",
        file_name,
        &["model_reasoning_effort", "model"],
        &["model_provider"],
    );
}

/// 将 lines 中所有未注释的 model_catalog_json 行注释掉，彻底解除目录接管
pub fn comment_out_model_catalog_json_in_lines(lines: &mut Vec<String>) {
    for line in lines.iter_mut() {
        let trimmed = line.trim();
        if !trimmed.starts_with('#') && is_line_exact_key(line, "model_catalog_json") {
            let without_comment = trimmed.trim_start_matches('#').trim();
            *line = format!("# {}", without_comment);
        }
    }
}

/// 确保条目符合 Codex 校验要求：必须包含 base_instructions 或 model_messages.instructions_template
pub fn ensure_model_entry_validity(entry: &mut serde_json::Value) {
    if !entry.is_object() {
        return;
    }
    let has_base = entry
        .get("base_instructions")
        .and_then(|v| v.as_str())
        .is_some();
    let has_template = entry
        .get("model_messages")
        .and_then(|m| m.get("instructions_template"))
        .and_then(|v| v.as_str())
        .is_some();

    if !has_base && !has_template {
        entry["base_instructions"] = serde_json::Value::String(String::new());
        if entry.get("model_messages").is_none() || entry["model_messages"].is_null() {
            entry["model_messages"] = serde_json::json!({
                "approvals": null,
                "auto_review": null,
                "collaboration_modes": null,
                "instructions_template": "",
                "instructions_variables": null,
                "multi_agent": null,
                "permissions": null,
                "token_budget": null
            });
        }
    }
}

/// 单个模型所支持的思考强度配置规格
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModelReasoningSpec {
    pub default_level: &'static str,
    pub supported_levels: &'static [&'static str],
}

/// 系列级思考强度规则（归一化系列标识前缀匹配，同系列新增模型自动命中）
#[derive(Debug, Clone, Copy)]
pub struct SeriesReasoningRule {
    /// 归一化系列标识（如 "gpt-6.1"）
    pub series: &'static str,
    /// 显式匹配标识（为空时按系列名匹配；用于 deepseek-flash 等官方别名）
    pub patterns: &'static [&'static str],
    /// 该系列默认思考强度
    pub default_level: &'static str,
    /// 该系列支持的思考强度档位列表
    pub supported_levels: &'static [&'static str],
}

/// 单模型覆盖规则（继承所属系列配置，仅覆盖差异项；优先于系列规则）
#[derive(Debug, Clone, Copy)]
pub struct ModelReasoningOverride {
    /// 所属系列（对应 SeriesReasoningRule.series）
    pub series: &'static str,
    /// 归一化模型标识（如 "gpt-6-astra"）
    pub model: &'static str,
    /// 显式匹配标识（为空时按模型名匹配）
    pub patterns: &'static [&'static str],
    /// 覆盖默认思考强度（None 继承系列）
    pub default_level: Option<&'static str>,
    /// 覆盖支持的思考强度档位列表（None 继承系列）
    pub supported_levels: Option<&'static [&'static str]>,
}

/// 默认兜底思考强度规格（未在已知数据中的模型沿用完整列表）
pub const DEFAULT_REASONING_SPEC: ModelReasoningSpec = ModelReasoningSpec {
    default_level: "medium",
    supported_levels: &["low", "medium", "high", "xhigh", "max", "ultra"],
};

/// 第一层：系列思考强度规则表（系列基线不含 ultra，由单模型覆盖按需声明）
pub const SERIES_REASONING_RULES: &[SeriesReasoningRule] = &[
    // OpenAI GPT 系列
    SeriesReasoningRule {
        series: "gpt-5.6",
        patterns: &[],
        default_level: "medium",
        supported_levels: &["none", "low", "medium", "high", "xhigh", "max"],
    },
    SeriesReasoningRule {
        series: "gpt-6",
        patterns: &[],
        default_level: "medium",
        supported_levels: &["none", "low", "medium", "high", "xhigh", "max"],
    },
    SeriesReasoningRule {
        series: "gpt-6.1",
        patterns: &[],
        default_level: "medium",
        supported_levels: &["low", "medium", "high", "xhigh", "max"],
    },
    SeriesReasoningRule {
        series: "gpt-6.2",
        patterns: &[],
        default_level: "medium",
        supported_levels: &["low", "medium", "high", "xhigh", "max"],
    },
    // 智谱 GLM-5.3 系列（默认 max，强制思考）
    SeriesReasoningRule {
        series: "glm-5.3",
        patterns: &[],
        default_level: "max",
        supported_levels: &["low", "high", "max"],
    },
    // 月之暗面 Kimi K3（默认 max，强制思考）
    SeriesReasoningRule {
        series: "kimi-k3",
        patterns: &[],
        default_level: "max",
        supported_levels: &["low", "high", "max"],
    },
    // DeepSeek 系列（默认 high，可关闭思考；deepseek-flash 为 V4.1 官方别名）
    SeriesReasoningRule {
        series: "deepseek-v4",
        patterns: &[],
        default_level: "high",
        supported_levels: &["none", "low", "high", "max"],
    },
    SeriesReasoningRule {
        series: "deepseek-v4.1",
        patterns: &["deepseek-v4.1", "deepseek-flash"],
        default_level: "high",
        supported_levels: &["none", "low", "high", "max"],
    },
    // xAI Grok 系列（默认 high，不可关闭思考）
    SeriesReasoningRule {
        series: "grok-4.6",
        patterns: &[],
        default_level: "high",
        supported_levels: &["low", "medium", "high", "xhigh"],
    },
    SeriesReasoningRule {
        series: "grok-4.7",
        patterns: &[],
        default_level: "high",
        supported_levels: &["low", "medium", "high", "xhigh"],
    },
];

/// 第二层：单模型覆盖表
/// ultra 为 Codex 客户端专属档位，客户端仅按目录条目的 supported_reasoning_levels 展示；
/// 参照 cockpit 社区目录规格（第三方维护，非官方），仅部分型号（sol/astra）声明 ultra，故在此按模型单独覆盖。
pub const MODEL_REASONING_OVERRIDES: &[ModelReasoningOverride] = &[
    ModelReasoningOverride {
        series: "gpt-5.6",
        model: "gpt-5.6-sol",
        patterns: &[],
        default_level: None,
        supported_levels: Some(&["none", "low", "medium", "high", "xhigh", "max", "ultra"]),
    },
    ModelReasoningOverride {
        series: "gpt-6",
        model: "gpt-6-sol",
        patterns: &[],
        default_level: None,
        supported_levels: Some(&["none", "low", "medium", "high", "xhigh", "max", "ultra"]),
    },
    ModelReasoningOverride {
        series: "gpt-6",
        model: "gpt-6-astra",
        patterns: &[],
        default_level: None,
        supported_levels: Some(&["low", "medium", "high", "xhigh", "max", "ultra"]),
    },
    ModelReasoningOverride {
        series: "gpt-6.1",
        model: "gpt-6.1-sol",
        patterns: &[],
        default_level: None,
        supported_levels: Some(&["low", "medium", "high", "xhigh", "max", "ultra"]),
    },
];

/// 规范化模型 slug（去除大小写、前缀命名空间与 tag）
pub fn normalize_model_slug(raw: &str) -> String {
    let s = raw.to_ascii_lowercase();
    let name = s.split('/').last().unwrap_or(&s).trim();
    let name = name.split(':').next().unwrap_or(name);
    name.replace(['_', ' '], "-")
}

/// 获取思考强度档位对应的标准英文描述
pub fn reasoning_level_description(effort: &str) -> &'static str {
    match effort {
        "none" => "Disables reasoning",
        "minimal" => "Minimal reasoning depth",
        "low" => "Fast responses with lighter reasoning",
        "medium" => "Balances speed and reasoning depth for everyday tasks",
        "high" => "Greater reasoning depth for complex problems",
        "xhigh" => "Extra high reasoning depth for complex problems",
        "max" => "Maximum reasoning depth for the hardest problems",
        "ultra" => "Maximum reasoning with automatic task delegation",
        _ => "",
    }
}

/// 归一化标识的精确或带边界前缀匹配（如 gpt-6.1 命中 gpt-6.1-sol，但不命中 gpt-6.10）
fn matches_pattern(clean: &str, pattern: &str) -> bool {
    clean == pattern || clean.starts_with(&format!("{}-", pattern))
}

/// 显式 patterns 优先；未提供时按系列名/模型名匹配
fn matches_rule(clean: &str, target: &str, patterns: &[&str]) -> bool {
    if patterns.is_empty() {
        return matches_pattern(clean, target);
    }
    patterns.iter().any(|p| matches_pattern(clean, p))
}

/// 特异性取标识与显式 patterns 中最长者，保证更具体的规则优先
fn rule_specificity(target: &str, patterns: &[&str]) -> usize {
    patterns
        .iter()
        .map(|p| p.len())
        .chain(std::iter::once(target.len()))
        .max()
        .unwrap_or(0)
}

/// 根据模型 slug 解析其支持的思考强度列表与默认值
/// 匹配优先级：单模型覆盖 > 系列规则；同层内特异性高者优先
pub fn resolve_model_reasoning_spec(slug: &str) -> ModelReasoningSpec {
    let clean = normalize_model_slug(slug);
    if clean.is_empty() {
        return DEFAULT_REASONING_SPEC;
    }

    let mut best_override: Option<&ModelReasoningOverride> = None;
    let mut best_score = 0;
    for rule in MODEL_REASONING_OVERRIDES {
        if matches_rule(&clean, rule.model, rule.patterns) {
            let score = rule_specificity(rule.model, rule.patterns);
            if best_override.is_none() || score > best_score {
                best_override = Some(rule);
                best_score = score;
            }
        }
    }
    if let Some(override_rule) = best_override {
        if let Some(series) = SERIES_REASONING_RULES
            .iter()
            .find(|r| r.series == override_rule.series)
        {
            let supported_levels = override_rule
                .supported_levels
                .unwrap_or(series.supported_levels);
            let default_level = override_rule.default_level.unwrap_or(series.default_level);
            let default_level = if supported_levels.contains(&default_level) {
                default_level
            } else {
                supported_levels[0]
            };
            return ModelReasoningSpec {
                default_level,
                supported_levels,
            };
        }
    }

    let mut best_series: Option<&SeriesReasoningRule> = None;
    let mut best_score = 0;
    for rule in SERIES_REASONING_RULES {
        if matches_rule(&clean, rule.series, rule.patterns) {
            let score = rule_specificity(rule.series, rule.patterns);
            if best_series.is_none() || score > best_score {
                best_series = Some(rule);
                best_score = score;
            }
        }
    }
    if let Some(series) = best_series {
        return ModelReasoningSpec {
            default_level: series.default_level,
            supported_levels: series.supported_levels,
        };
    }

    DEFAULT_REASONING_SPEC
}

/// 将规则表解析的思考强度规格写入条目（目录思考字段的单一事实来源）
fn apply_reasoning_spec_to_entry(entry: &mut serde_json::Value, slug: &str) {
    let spec = resolve_model_reasoning_spec(slug);
    entry["default_reasoning_level"] = serde_json::json!(spec.default_level);
    entry["supported_reasoning_levels"] = serde_json::Value::Array(
        spec.supported_levels
            .iter()
            .map(|&effort| {
                serde_json::json!({
                    "effort": effort,
                    "description": reasoning_level_description(effort),
                })
            })
            .collect(),
    );
}

/// 为指定 slug 创建一个结构完整且符合 Codex ModelInfo 规范的模型条目
pub fn create_model_entry(slug: &str, display_name: &str) -> serde_json::Value {
    let mut entry = serde_json::json!({
        "slug": slug,
        "display_name": display_name,
        "description": display_name,
        "default_reasoning_summary": "auto",
        "default_service_tier": null,
        "default_verbosity": "low",
        "experimental_supported_tools": [],
        "hidden": false,
        "input_modalities": ["text", "image"],
        "base_instructions": "",
        "model_messages": {
            "approvals": null,
            "auto_review": null,
            "collaboration_modes": null,
            "instructions_template": "",
            "instructions_variables": null,
            "multi_agent": null,
            "permissions": null,
            "token_budget": null
        },
        "instructions": null,
        "instructions_variables": null,
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
    });
    apply_reasoning_spec_to_entry(&mut entry, slug);
    entry
}

/// 在专属模型目录 JSON 中为指定 slug 写入/更新/清除显示别名（display_name）
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
        // 清除别名：在专属自管文件中直接移除该模型条目
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

        models.remove(idx);
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
        let mut updated = entry.clone();
        ensure_model_entry_validity(&mut updated);
        apply_reasoning_spec_to_entry(&mut updated, slug);
        updated["display_name"] = serde_json::Value::String(trimmed_dn.to_string());
        updated["description"] = serde_json::Value::String(trimmed_dn.to_string());
        if updated == *entry {
            return Ok(None);
        }
        *entry = updated;
    } else {
        let new_entry = create_model_entry(slug, trimmed_dn);
        models.push(new_entry);
    }

    serde_json::to_string_pretty(&v)
        .map(Some)
        .map_err(|e| format!("序列化模型目录失败: {}", e))
}

/// 将多项模型别名整体同步到专属模型目录 JSON。
/// 以传入列表为唯一事实来源：保留已有条目的扩展字段，缺失的条目按 Codex ModelInfo 骨架新建，
/// 列表中不再出现的 slug 会从自管目录中移除。
pub fn apply_model_aliases_to_catalog(
    catalog_content: Option<&str>,
    aliases: &[ModelAlias],
) -> Result<Option<String>, String> {
    let normalized = normalize_model_aliases(aliases);

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

    let existing_models = v["models"].as_array().cloned().unwrap_or_default();
    if normalized.is_empty() {
        if existing_models.is_empty() {
            return Ok(None);
        }
        v["models"] = serde_json::json!([]);
        return serde_json::to_string_pretty(&v)
            .map(Some)
            .map_err(|e| format!("序列化模型目录失败: {}", e));
    }

    let mut by_slug: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    for entry in existing_models {
        if let Some(slug) = entry
            .get("slug")
            .and_then(|s| s.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            by_slug.insert(slug.to_string(), entry);
        }
    }

    let mut new_models: Vec<serde_json::Value> = Vec::with_capacity(normalized.len());
    for alias in &normalized {
        if let Some(mut entry) = by_slug.remove(&alias.slug) {
            if !entry.is_object() {
                return Err("模型目录条目结构异常，已拒绝覆盖".to_string());
            }
            ensure_model_entry_validity(&mut entry);
            apply_reasoning_spec_to_entry(&mut entry, &alias.slug);
            entry["display_name"] = serde_json::Value::String(alias.display_name.clone());
            entry["description"] = serde_json::Value::String(alias.display_name.clone());
            new_models.push(entry);
        } else {
            new_models.push(create_model_entry(&alias.slug, &alias.display_name));
        }
    }

    v["models"] = serde_json::Value::Array(new_models);

    if let Some(original) = catalog_content {
        if let Ok(old_v) = serde_json::from_str::<serde_json::Value>(original) {
            if old_v == v {
                return Ok(None);
            }
        }
    }

    serde_json::to_string_pretty(&v)
        .map(Some)
        .map_err(|e| format!("序列化模型目录失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ModelAlias;

    #[test]
    fn test_parse_display_name_from_catalog_edge_cases() {
        let catalog =
            r#"{ "models": [ { "slug": "a" }, { "slug": "b", "display_name": "B 别名" } ] }"#;
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
    fn test_apply_model_catalog_json_overwrites_existing_active_line() {
        // 关键测试：若已存在第三方行，必须强制覆盖指向本工具专属文件，绝不复用第三方文件
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_catalog_json = \"cockpit-model-catalog.json\"".to_string(),
        ];
        apply_model_catalog_json_to_lines(&mut lines, "ccm-model-catalog.json");
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[1], "model_catalog_json = \"ccm-model-catalog.json\"");
    }

    #[test]
    fn test_apply_model_catalog_json_restores_commented_line() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "# model_catalog_json = \"old.json\"".to_string(),
            "# model_catalog_json = \"dup.json\"".to_string(),
        ];
        apply_model_catalog_json_to_lines(&mut lines, "ccm-model-catalog.json");
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[1], "model_catalog_json = \"ccm-model-catalog.json\"");
    }

    #[test]
    fn test_comment_out_model_catalog_json_in_lines() {
        let mut lines = vec![
            "model = \"gpt-5.6-sol\"".to_string(),
            "model_catalog_json = \"ccm-model-catalog.json\"".to_string(),
        ];
        comment_out_model_catalog_json_in_lines(&mut lines);
        assert_eq!(
            lines[1],
            "# model_catalog_json = \"ccm-model-catalog.json\""
        );
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
    fn test_apply_display_name_to_catalog_updates_existing_and_preserves_others() {
        let catalog = r#"{
  "models": [
    { "slug": "gpt-5.6-sol", "display_name": "Old Name", "context_window": 272000 },
    { "slug": "gpt-5.6-terra", "display_name": "5.6 Terra" }
  ]
}"#;
        let result =
            apply_display_name_to_catalog(Some(catalog), "gpt-5.6-sol", "5.6 Sol").unwrap();
        let content = result.expect("应产生更新");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0]["display_name"], "5.6 Sol");
        assert_eq!(models[0]["context_window"], 272000);
        assert_eq!(models[1]["display_name"], "5.6 Terra");

        let no_change =
            apply_display_name_to_catalog(Some(&content), "gpt-5.6-sol", "5.6 Sol").unwrap();
        assert!(no_change.is_none());
    }

    #[test]
    fn test_apply_display_name_to_catalog_clear_alias() {
        let catalog = r#"{ "models": [ { "slug": "glm-5.3", "display_name": "GLM" } ] }"#;
        let result = apply_display_name_to_catalog(Some(catalog), "glm-5.3", "").unwrap();
        let content = result.expect("应产生清除变更");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(v["models"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_apply_display_name_to_catalog_rejects_invalid_structure() {
        assert!(apply_display_name_to_catalog(Some("not json"), "a", "A").is_err());
        assert!(apply_display_name_to_catalog(Some(r#"{ "models": {} }"#), "a", "A").is_err());
        assert!(apply_display_name_to_catalog(Some(r#"["a"]"#), "a", "A").is_err());
    }

    fn alias(slug: &str, display_name: &str) -> ModelAlias {
        ModelAlias {
            slug: slug.to_string(),
            display_name: display_name.to_string(),
        }
    }

    #[test]
    fn test_parse_model_aliases_from_catalog() {
        let catalog = r#"{
  "models": [
    { "slug": "gpt-5.6-sol", "display_name": "5.6 Sol" },
    { "slug": "glm-5.3" },
    { "slug": "  " },
    { "display_name": "orphan" }
  ]
}"#;
        let aliases = parse_model_aliases_from_catalog(catalog);
        assert_eq!(aliases.len(), 2);
        assert_eq!(aliases[0].slug, "gpt-5.6-sol");
        assert_eq!(aliases[0].display_name, "5.6 Sol");
        assert_eq!(aliases[1].slug, "glm-5.3");
        assert_eq!(aliases[1].display_name, "glm-5.3");
        assert!(parse_model_aliases_from_catalog("not json").is_empty());
    }

    #[test]
    fn test_normalize_model_aliases_trims_and_deduplicates() {
        let aliases = vec![
            alias(" gpt-5.6-sol ", ""),
            alias("", "ignored"),
            alias("glm-5.3", "GLM"),
            alias("gpt-5.6-sol", "5.6 Sol"),
        ];
        let normalized = normalize_model_aliases(&aliases);
        assert_eq!(normalized.len(), 2);
        assert_eq!(normalized[0].slug, "gpt-5.6-sol");
        assert_eq!(normalized[0].display_name, "5.6 Sol");
        assert_eq!(normalized[1].slug, "glm-5.3");
        assert_eq!(normalized[1].display_name, "GLM");
    }

    #[test]
    fn test_apply_model_aliases_to_catalog_creates_complete_entries() {
        let aliases = vec![alias("glm-5.3", "GLM 5.3"), alias("gpt-5.6-sol", "")];
        let result = apply_model_aliases_to_catalog(None, &aliases).unwrap();
        let content = result.expect("应生成新目录内容");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0]["slug"], "glm-5.3");
        assert_eq!(models[0]["display_name"], "GLM 5.3");
        assert_eq!(models[0]["shell_type"], "shell_command");
        assert_eq!(models[0]["visibility"], "list");
        assert_eq!(models[0]["base_instructions"], "");
        assert!(models[0].get("model_messages").is_some());
        assert_eq!(models[1]["slug"], "gpt-5.6-sol");
        assert_eq!(models[1]["display_name"], "gpt-5.6-sol");
        assert_eq!(models[1]["priority"], 10);
        assert_eq!(models[1]["base_instructions"], "");
        assert!(models[1].get("model_messages").is_some());
    }

    #[test]
    fn test_apply_model_aliases_to_catalog_updates_preserves_and_removes() {
        let catalog = r#"{
  "models": [
    { "slug": "gpt-5.6-sol", "display_name": "Old Name", "context_window": 272000 },
    { "slug": "obsolete", "display_name": "Gone" }
  ]
}"#;
        let aliases = vec![
            alias("gpt-5.6-sol", "5.6 Sol"),
            alias("glm-5.3", "GLM 5.3"),
        ];
        let result = apply_model_aliases_to_catalog(Some(catalog), &aliases).unwrap();
        let content = result.expect("应产生更新");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let models = v["models"].as_array().unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0]["slug"], "gpt-5.6-sol");
        assert_eq!(models[0]["display_name"], "5.6 Sol");
        assert_eq!(models[0]["context_window"], 272000);
        assert_eq!(models[0]["base_instructions"], "");
        assert!(models[0].get("model_messages").is_some());
        assert_eq!(models[1]["slug"], "glm-5.3");
        assert_eq!(models[1]["display_name"], "GLM 5.3");
        assert_eq!(models[1]["visibility"], "list");
        assert_eq!(models[1]["base_instructions"], "");

        let no_change = apply_model_aliases_to_catalog(Some(&content), &aliases).unwrap();
        assert!(no_change.is_none());
    }

    #[test]
    fn test_apply_model_aliases_to_catalog_clears_all() {
        let catalog = r#"{ "models": [ { "slug": "glm-5.3", "display_name": "GLM" } ] }"#;
        let result = apply_model_aliases_to_catalog(Some(catalog), &[]).unwrap();
        let content = result.expect("应清空 models");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(v["models"].as_array().unwrap().len(), 0);

        assert!(apply_model_aliases_to_catalog(None, &[]).unwrap().is_none());
    }

    #[test]
    fn test_apply_model_aliases_to_catalog_rejects_invalid_structure() {
        assert!(apply_model_aliases_to_catalog(Some("not json"), &[alias("a", "A")]).is_err());
        assert!(
            apply_model_aliases_to_catalog(Some(r#"{ "models": {} }"#), &[alias("a", "A")])
                .is_err()
        );
    }

    #[test]
    fn test_ensure_model_entry_validity_repairs_missing_fields() {
        let mut entry = serde_json::json!({
            "slug": "custom-model",
            "display_name": "Custom Model"
        });
        ensure_model_entry_validity(&mut entry);
        assert_eq!(entry["base_instructions"], "");
        assert_eq!(
            entry["model_messages"]["instructions_template"],
            ""
        );

        // 已有完整 base_instructions 的条目不应被覆盖
        let mut complete_entry = serde_json::json!({
            "slug": "rich-model",
            "base_instructions": "Existing system instructions"
        });
        ensure_model_entry_validity(&mut complete_entry);
        assert_eq!(
            complete_entry["base_instructions"],
            "Existing system instructions"
        );
    }

    #[test]
    fn test_resolve_model_reasoning_spec_all_models() {
        // GPT-5.6 Sol（单模型覆盖声明 ultra）
        let spec = resolve_model_reasoning_spec("gpt-5.6-sol");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // GPT-5.6 Terra / Luna（系列基线，无 ultra）
        let spec = resolve_model_reasoning_spec("GPT-5.6 Terra");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max"]
        );

        let spec = resolve_model_reasoning_spec("gpt-5.6_luna");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max"]
        );

        // GPT-6 Astra（覆盖：不可关闭思考，含 ultra）
        let spec = resolve_model_reasoning_spec("gpt-6-astra");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // GPT-6 Sol（单模型覆盖声明 ultra）
        let spec = resolve_model_reasoning_spec("gpt-6-sol");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // GPT-6 Luna（系列基线，无 ultra）
        let spec = resolve_model_reasoning_spec("gpt-6-luna");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max"]
        );

        // GPT-6.1 Sol（单模型覆盖声明 ultra）
        let spec = resolve_model_reasoning_spec("gpt-6.1-sol");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // GPT-6.2 系列（同系列新增模型自动命中系列规则）
        let spec = resolve_model_reasoning_spec("gpt-6.2-sol");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max"]
        );

        let spec = resolve_model_reasoning_spec("gpt-6.2-luna-2026-11");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max"]
        );

        // Zhipu GLM-5.3 & GLM-5.3-FLASH
        let spec = resolve_model_reasoning_spec("glm-5.3");
        assert_eq!(spec.default_level, "max");
        assert_eq!(spec.supported_levels, &["low", "high", "max"]);

        let spec = resolve_model_reasoning_spec("GLM-5.3-FLASH");
        assert_eq!(spec.default_level, "max");
        assert_eq!(spec.supported_levels, &["low", "high", "max"]);

        // Moonshot Kimi K3
        let spec = resolve_model_reasoning_spec("kimi-k3");
        assert_eq!(spec.default_level, "max");
        assert_eq!(spec.supported_levels, &["low", "high", "max"]);

        // DeepSeek DeepSeek-V4-Pro & DeepSeek-V4.1-Flash & deepseek-flash
        let spec = resolve_model_reasoning_spec("deepseek-v4-pro");
        assert_eq!(spec.default_level, "high");
        assert_eq!(spec.supported_levels, &["none", "low", "high", "max"]);

        let spec = resolve_model_reasoning_spec("deepseek-v4.1-flash");
        assert_eq!(spec.default_level, "high");
        assert_eq!(spec.supported_levels, &["none", "low", "high", "max"]);

        let spec = resolve_model_reasoning_spec("deepseek-flash");
        assert_eq!(spec.default_level, "high");
        assert_eq!(spec.supported_levels, &["none", "low", "high", "max"]);

        let spec = resolve_model_reasoning_spec("DeepSeek-Flash");
        assert_eq!(spec.default_level, "high");
        assert_eq!(spec.supported_levels, &["none", "low", "high", "max"]);

        // xAI Grok-4.6 & Grok-4.7
        let spec = resolve_model_reasoning_spec("grok-4.6");
        assert_eq!(spec.default_level, "high");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh"]
        );

        let spec = resolve_model_reasoning_spec("grok-4.7");
        assert_eq!(spec.default_level, "high");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh"]
        );

        // 未知模型兜底（完整列表）
        let spec = resolve_model_reasoning_spec("claude-3-7-sonnet");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // 前缀与特殊格式（如 openai/gpt-5.6-sol:latest）
        let spec = resolve_model_reasoning_spec("openai/gpt-5.6-sol:latest");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max", "ultra"]
        );
    }

    #[test]
    fn test_resolve_model_reasoning_spec_override_precedence() {
        // 后缀变体命中单模型覆盖（ultra 随覆盖继承）
        let spec = resolve_model_reasoning_spec("gpt-6-sol-2026-11");
        assert_eq!(spec.default_level, "medium");
        assert_eq!(
            spec.supported_levels,
            &["none", "low", "medium", "high", "xhigh", "max", "ultra"]
        );

        // 系列前缀带边界：gpt-6 不越界命中 gpt-6.1 / gpt-6.2
        let spec = resolve_model_reasoning_spec("gpt-6.1-luna");
        assert_eq!(
            spec.supported_levels,
            &["low", "medium", "high", "xhigh", "max"]
        );

        // 显式 patterns 别名命中 V4.1 系列而非 V4
        let spec = resolve_model_reasoning_spec("deepseek-flash");
        assert_eq!(spec.default_level, "high");
        assert_eq!(spec.supported_levels, &["none", "low", "high", "max"]);
    }

    #[test]
    fn test_apply_model_aliases_to_catalog_refreshes_reasoning_fields() {
        // 旧目录条目缺失/过时思考字段时，同步应按规则表刷新（恢复 ultra），并保留扩展字段
        let catalog = r#"{
  "models": [
    {
      "slug": "gpt-6-sol",
      "display_name": "Sol",
      "context_window": 272000,
      "supported_reasoning_levels": [ { "effort": "low", "description": "" } ]
    }
  ]
}"#;
        let result =
            apply_model_aliases_to_catalog(Some(catalog), &[alias("gpt-6-sol", "Sol")]).unwrap();
        let content = result.expect("应刷新思考强度字段");
        let v: serde_json::Value = serde_json::from_str(&content).unwrap();
        let entry = &v["models"][0];
        let efforts: Vec<&str> = entry["supported_reasoning_levels"]
            .as_array()
            .unwrap()
            .iter()
            .map(|e| e["effort"].as_str().unwrap())
            .collect();
        assert!(efforts.contains(&"ultra"));
        assert_eq!(entry["default_reasoning_level"], "medium");
        assert_eq!(entry["context_window"], 272000);

        let no_change =
            apply_model_aliases_to_catalog(Some(&content), &[alias("gpt-6-sol", "Sol")]).unwrap();
        assert!(no_change.is_none());
    }

    #[test]
    fn test_create_model_entry_custom_reasoning_levels() {
        let entry = create_model_entry("glm-5.3", "智谱 GLM 5.3");
        assert_eq!(entry["default_reasoning_level"], "max");
        let levels = entry["supported_reasoning_levels"].as_array().unwrap();
        assert_eq!(levels.len(), 3);
        assert_eq!(levels[0]["effort"], "low");
        assert_eq!(levels[1]["effort"], "high");
        assert_eq!(levels[2]["effort"], "max");

        let entry = create_model_entry("deepseek-v4-pro", "DeepSeek V4 Pro");
        assert_eq!(entry["default_reasoning_level"], "high");
        let levels = entry["supported_reasoning_levels"].as_array().unwrap();
        assert_eq!(levels.len(), 4);
        assert_eq!(levels[0]["effort"], "none");
        assert_eq!(levels[0]["description"], "Disables reasoning");
        assert_eq!(levels[1]["effort"], "low");
        assert_eq!(levels[2]["effort"], "high");
        assert_eq!(levels[3]["effort"], "max");
    }
}
