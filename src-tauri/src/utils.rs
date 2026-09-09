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
