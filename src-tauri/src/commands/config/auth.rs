use std::fs;
use std::path::Path;

/// 将 API Key 与 auth_mode 写入 auth.json，若文件已存在则安全保留其余字段（如 tokens 等）
pub fn save_auth_key(auth_path: &Path, key: &str) -> Result<(), String> {
    let need_create_auth = if !auth_path.exists() {
        true
    } else {
        match fs::read_to_string(auth_path) {
            Ok(content) => content.trim().is_empty(),
            Err(_) => true,
        }
    };

    if need_create_auth {
        let auth_content = format!(
            "{{\n  \"OPENAI_API_KEY\": \"{}\",\n  \"auth_mode\": \"apikey\"\n}}",
            key
        );
        fs::write(auth_path, auth_content).map_err(|e| format!("写入 auth.json 失败: {}", e))?;
    } else if let Ok(content) = fs::read_to_string(auth_path) {
        if let Ok(mut json_val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = json_val.as_object_mut() {
                obj.insert(
                    "OPENAI_API_KEY".to_string(),
                    serde_json::Value::String(key.to_string()),
                );
                if !obj.contains_key("auth_mode") {
                    obj.insert(
                        "auth_mode".to_string(),
                        serde_json::Value::String("apikey".to_string()),
                    );
                }
                if let Ok(updated_content) = serde_json::to_string_pretty(&json_val) {
                    let _ = fs::write(auth_path, updated_content);
                }
            }
        } else {
            let auth_content = format!(
                "{{\n  \"OPENAI_API_KEY\": \"{}\",\n  \"auth_mode\": \"apikey\"\n}}",
                key
            );
            let _ = fs::write(auth_path, auth_content);
        }
    }

    Ok(())
}

/// 从 auth.json 中移除 OPENAI_API_KEY，并在仅有 apikey 模式且无额外 tokens 时移除 auth_mode
pub fn restore_auth_default(auth_path: &Path) -> Result<(), String> {
    if auth_path.exists() {
        if let Ok(content) = fs::read_to_string(auth_path) {
            if let Ok(mut json_val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = json_val.as_object_mut() {
                    obj.remove("OPENAI_API_KEY");
                    if obj.get("auth_mode").and_then(|v| v.as_str()) == Some("apikey")
                        && !obj.contains_key("tokens")
                    {
                        obj.remove("auth_mode");
                    }
                    if let Ok(updated_content) = serde_json::to_string_pretty(&json_val) {
                        let _ = fs::write(auth_path, updated_content);
                    }
                }
            } else {
                let _ = fs::write(auth_path, "{}");
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_and_restore_auth_key() {
        let temp_dir = std::env::temp_dir();
        let test_auth_path = temp_dir.join(format!(
            "test_auth_{}.json",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));

        // 1. 新建并写入
        let res = save_auth_key(&test_auth_path, "sk-test-12345");
        assert!(res.is_ok());
        let content = fs::read_to_string(&test_auth_path).unwrap();
        let val: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(val["OPENAI_API_KEY"], "sk-test-12345");
        assert_eq!(val["auth_mode"], "apikey");

        // 2. 更新保留其他字段
        {
            let mut val_mut = val.clone();
            val_mut
                .as_object_mut()
                .unwrap()
                .insert("custom_field".to_string(), serde_json::json!("preserved"));
            fs::write(
                &test_auth_path,
                serde_json::to_string_pretty(&val_mut).unwrap(),
            )
            .unwrap();
        }
        let res = save_auth_key(&test_auth_path, "sk-test-new");
        assert!(res.is_ok());
        let content = fs::read_to_string(&test_auth_path).unwrap();
        let val: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(val["OPENAI_API_KEY"], "sk-test-new");
        assert_eq!(val["custom_field"], "preserved");

        // 3. 恢复默认（清理 API Key）
        let res = restore_auth_default(&test_auth_path);
        assert!(res.is_ok());
        let content = fs::read_to_string(&test_auth_path).unwrap();
        let val: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert!(val.get("OPENAI_API_KEY").is_none());
        assert_eq!(val["custom_field"], "preserved");

        // 清理临时文件
        let _ = fs::remove_file(&test_auth_path);
    }
}
