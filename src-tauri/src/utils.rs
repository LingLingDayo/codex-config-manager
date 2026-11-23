use std::path::{Path, PathBuf};

pub fn get_codex_dir() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法找到用户主目录".to_string())?;
    Ok(Path::new(&home).join(".codex"))
}

/// 根据编译模式返回配置文件名：dev 用 _dev 后缀，release 用正式文件名
pub fn config_file_names() -> (&'static str, &'static str) {
    if cfg!(debug_assertions) {
        ("config_dev.toml", "auth_dev.json")
    } else {
        ("config.toml", "auth.json")
    }
}

pub fn presets_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "presets_dev.json"
    } else {
        "presets.json"
    }
}

/// 本工具自管的模型目录文件名：仅在 config.toml 未配置 model_catalog_json 时创建使用
pub fn default_catalog_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "ccm-model-catalog_dev.json"
    } else {
        "ccm-model-catalog.json"
    }
}

pub fn settings_file_name() -> &'static str {
    if cfg!(debug_assertions) {
        "settings_dev.json"
    } else {
        "settings.json"
    }
}

pub fn get_default_station_name() -> String {
    std::env::var("VITE_DEFAULT_STATION_NAME")
        .ok()
        .or_else(|| option_env!("VITE_DEFAULT_STATION_NAME").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_DEFAULT_STATION_IDENTIFIER").ok())
        .or_else(|| option_env!("VITE_DEFAULT_STATION_IDENTIFIER").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_STATION_NAME").ok())
        .or_else(|| option_env!("VITE_STATION_NAME").map(|s| s.to_string()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "LingAI".to_string())
}

pub fn get_default_station_url() -> String {
    std::env::var("VITE_DEFAULT_STATION_URL")
        .ok()
        .or_else(|| option_env!("VITE_DEFAULT_STATION_URL").map(|s| s.to_string()))
        .or_else(|| std::env::var("VITE_STATION_URL").ok())
        .or_else(|| option_env!("VITE_STATION_URL").map(|s| s.to_string()))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "https://lingai.linglingdayo.top".to_string())
}

pub fn is_default_station(url: &str) -> bool {
    let trimmed = url.trim().trim_end_matches('/');
    let def_name = get_default_station_name();
    let def_url = get_default_station_url();
    let def_url_trimmed = def_url.trim_end_matches('/');

    trimmed.eq_ignore_ascii_case(&def_name)
        || trimmed.eq_ignore_ascii_case(def_url_trimmed)
        || trimmed.eq_ignore_ascii_case(&format!("{}/v1", def_url_trimmed))
        // 兼容原生 LingAI 默认识别
        || trimmed.eq_ignore_ascii_case("lingai")
        || trimmed.eq_ignore_ascii_case("https://lingai.linglingdayo.top")
        || trimmed.eq_ignore_ascii_case("https://lingai.linglingdayo.top/v1")
}

/// 判断末段是否为 API 版本段，例如 v1 / v4 / v1beta / v2-alpha
fn has_api_version_segment(url: &str) -> bool {
    let segment = url.rsplit('/').next().unwrap_or("");
    let bytes = segment.as_bytes();
    if bytes.is_empty() || (bytes[0] != b'v' && bytes[0] != b'V') {
        return false;
    }
    let rest = &segment[1..];
    if !matches!(rest.chars().next(), Some(c) if c.is_ascii_digit()) {
        return false;
    }
    rest.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// 剥离误粘入输入框的完整端点，回落到基准地址
fn strip_trailing_endpoint(url: &str) -> String {
    for endpoint in [
        "/chat/completions",
        "/models",
        "/responses",
        "/completions",
    ] {
        if let Some(base) = url.strip_suffix(endpoint) {
            return base.to_string();
        }
    }
    url.to_string()
}

/// 将用户输入的 Base URL 规范化为可直接写入 config.toml 的 base_url。
/// 与前端 format.ts 的 normalizeUrl 规则保持一致，修改时需同步两端。
pub fn normalize_provider_base_url(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return String::new();
    }

    // 默认站网关已兼容根路径，保持历史行为不变
    if is_default_station(trimmed) {
        return get_default_station_url();
    }

    let base = strip_trailing_endpoint(trimmed);
    if is_default_station(&base) {
        return get_default_station_url();
    }
    if has_api_version_segment(&base) {
        return base;
    }
    format!("{}/v1", base)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_default_station() {
        assert!(is_default_station("lingai"));
        assert!(is_default_station("LingAI"));
        assert!(is_default_station("https://lingai.linglingdayo.top"));
        assert!(is_default_station("https://lingai.linglingdayo.top/"));
        assert!(is_default_station("https://lingai.linglingdayo.top/v1"));
        assert!(is_default_station("https://lingai.linglingdayo.top/v1/"));
        assert!(!is_default_station("https://api.openai.com/v1"));
    }

    #[test]
    fn test_normalize_provider_base_url_appends_v1() {
        assert_eq!(normalize_provider_base_url(""), "");
        assert_eq!(normalize_provider_base_url("   "), "");
        assert_eq!(
            normalize_provider_base_url("https://api.fluxapi.vip"),
            "https://api.fluxapi.vip/v1"
        );
        assert_eq!(
            normalize_provider_base_url("  https://api.fluxapi.vip///  "),
            "https://api.fluxapi.vip/v1"
        );
    }

    #[test]
    fn test_normalize_provider_base_url_keeps_version_segment() {
        assert_eq!(
            normalize_provider_base_url("https://api.fluxapi.vip/v1"),
            "https://api.fluxapi.vip/v1"
        );
        assert_eq!(
            normalize_provider_base_url("https://open.bigmodel.cn/api/paas/v4"),
            "https://open.bigmodel.cn/api/paas/v4"
        );
        assert_eq!(
            normalize_provider_base_url("https://api.example.com/v1beta"),
            "https://api.example.com/v1beta"
        );
    }

    #[test]
    fn test_normalize_provider_base_url_strips_endpoint() {
        assert_eq!(
            normalize_provider_base_url("https://api.fluxapi.vip/v1/models"),
            "https://api.fluxapi.vip/v1"
        );
        assert_eq!(
            normalize_provider_base_url("https://api.fluxapi.vip/models"),
            "https://api.fluxapi.vip/v1"
        );
        assert_eq!(
            normalize_provider_base_url("https://api.fluxapi.vip/v1/chat/completions"),
            "https://api.fluxapi.vip/v1"
        );
    }

    #[test]
    fn test_normalize_provider_base_url_keeps_default_station() {
        assert_eq!(normalize_provider_base_url("lingai"), get_default_station_url());
        assert_eq!(
            normalize_provider_base_url("https://lingai.linglingdayo.top/v1"),
            get_default_station_url()
        );
        assert_eq!(
            normalize_provider_base_url("https://lingai.linglingdayo.top/v1/models"),
            get_default_station_url()
        );
    }

    #[test]
    fn test_normalize_provider_base_url_is_idempotent() {
        let once = normalize_provider_base_url("https://api.fluxapi.vip");
        assert_eq!(normalize_provider_base_url(&once), once);
    }

    #[test]
    fn test_file_names() {
        let (config, auth) = config_file_names();
        let preset = presets_file_name();
        let setting = settings_file_name();
        if cfg!(debug_assertions) {
            assert_eq!(config, "config_dev.toml");
            assert_eq!(auth, "auth_dev.json");
            assert_eq!(preset, "presets_dev.json");
            assert_eq!(setting, "settings_dev.json");
        } else {
            assert_eq!(config, "config.toml");
            assert_eq!(auth, "auth.json");
            assert_eq!(preset, "presets.json");
            assert_eq!(setting, "settings.json");
        }
    }
}
