use std::fs;

use crate::models::CodexConfig;
use crate::utils::{
    config_file_names, default_catalog_file_name, get_codex_dir, get_default_station_url,
    is_default_station,
};

pub mod auth;
pub mod catalog;
pub mod parser;
pub mod patcher;
pub mod toml_utils;

// 公开重导出以保持与现有调用及测试的 100% 向后兼容性
pub use catalog::{
    apply_display_name_to_catalog, apply_model_catalog_json_to_lines,
    parse_active_catalog_file_from_lines, parse_display_name_from_catalog, resolve_catalog_path,
};
pub use parser::parse_codex_config_from_content;
pub use patcher::{apply_model_reasoning_effort_to_lines, apply_model_to_lines};

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
        let catalog_file = catalog::parse_active_catalog_file_from_lines(&lines)?;
        let catalog_path = catalog::resolve_catalog_path(&codex_dir, &catalog_file);
        if catalog_path.exists() {
            fs::read_to_string(&catalog_path).ok()
        } else {
            None
        }
    });

    Ok(parser::parse_codex_config_from_content(
        config_content.as_deref(),
        auth_content.as_deref(),
        catalog_content.as_deref(),
    ))
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

    patcher::apply_model_to_lines(&mut lines, &model);

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    Ok(())
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

    patcher::apply_model_reasoning_effort_to_lines(&mut lines, &reasoning_effort);

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    Ok(())
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
        patcher::apply_model_to_lines(&mut lines, m);
    }

    if let Some(ref e) = model_reasoning_effort {
        patcher::apply_model_reasoning_effort_to_lines(&mut lines, e);
    }

    // 处理模型别名：依附于当前生效的模型 slug，写入 model_catalog_json 指向的目录文件
    if let Some(ref dn) = model_display_name {
        let slug = match &model {
            Some(m) if !m.trim().is_empty() => m.trim().to_string(),
            _ => parser::parse_active_model_from_lines(&lines),
        };
        if !slug.is_empty() {
            let trimmed_dn = dn.trim();
            // 确定目录文件：优先沿用 config.toml 中已生效的 model_catalog_json；
            // 写入别名且无生效配置时，恢复注释行或插入本工具自管的默认目录文件名
            let catalog_file = catalog::parse_active_catalog_file_from_lines(&lines).or_else(|| {
                if trimmed_dn.is_empty() {
                    None
                } else {
                    catalog::apply_model_catalog_json_to_lines(&mut lines, default_catalog_file_name());
                    catalog::parse_active_catalog_file_from_lines(&lines)
                }
            });
            if let Some(file) = catalog_file {
                let catalog_path = catalog::resolve_catalog_path(&codex_dir, &file);
                let existing = if catalog_path.exists() {
                    Some(
                        fs::read_to_string(&catalog_path)
                            .map_err(|e| format!("读取模型目录文件失败: {}", e))?,
                    )
                } else {
                    None
                };
                if let Some(new_content) =
                    catalog::apply_display_name_to_catalog(existing.as_deref(), &slug, trimmed_dn)?
                {
                    fs::write(&catalog_path, new_content)
                        .map_err(|e| format!("写入模型目录文件失败: {}", e))?;
                }
            }
        }
    }

    // 规范化 model_provider 行并安全合并/创建 [model_providers.custom] 节
    patcher::apply_custom_provider_to_lines(&mut lines, &key, &real_url);

    // 写回 config.toml
    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 2. 写入 auth.json
    auth::save_auth_key(&auth_path, &key)?;

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

    // 1. 修改 config.toml，注释掉所有 model_provider、model 及 model_reasoning_effort 行
    let config_content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取 config.toml 失败: {}", e))?;

    let mut lines: Vec<String> = config_content.lines().map(|s| s.to_string()).collect();

    patcher::comment_out_custom_provider_to_lines(&mut lines);

    let new_content = lines.join("\r\n");
    fs::write(&config_path, new_content).map_err(|e| format!("写入 config.toml 失败: {}", e))?;

    // 2. 清理 auth.json 中的 OPENAI_API_KEY，保留有效 JSON 结构及其他凭证
    auth::restore_auth_default(&auth_path)?;

    Ok(())
}
