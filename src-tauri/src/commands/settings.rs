use std::fs;
use std::path::{Path, PathBuf};

use crate::models::{AppSettings, LaunchResult};
use crate::utils::{get_codex_dir, settings_file_name};

#[tauri::command]
pub fn get_app_settings() -> Result<AppSettings, String> {
    let codex_dir = get_codex_dir()?;
    let settings_path = codex_dir.join(settings_file_name());

    if !settings_path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("读取设置文件失败: {}", e))?;

    if content.trim().is_empty() {
        return Ok(AppSettings::default());
    }

    let settings: AppSettings = serde_json::from_str(&content)
        .map_err(|e| format!("解析设置文件失败: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub fn save_app_settings(settings: AppSettings) -> Result<(), String> {
    let codex_dir = get_codex_dir()?;
    if !codex_dir.exists() {
        fs::create_dir_all(&codex_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    let settings_path = codex_dir.join(settings_file_name());

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("写入设置文件失败: {}", e))?;

    Ok(())
}

/// 自动检测系统中的 ChatGPT / Codex 安装或调起路径
#[tauri::command]
pub fn detect_codex_path() -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        // 1. 检查环境变量中的常见安装路径
        let mut candidates = Vec::new();
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            candidates.push(PathBuf::from(&local_app_data).join("Programs").join("ChatGPT").join("ChatGPT.exe"));
            candidates.push(PathBuf::from(&local_app_data).join("ChatGPT").join("ChatGPT.exe"));
            candidates.push(PathBuf::from(&local_app_data).join("Programs").join("Codex").join("Codex.exe"));
        }
        if let Ok(prog_files) = std::env::var("ProgramFiles") {
            candidates.push(PathBuf::from(&prog_files).join("ChatGPT").join("ChatGPT.exe"));
            candidates.push(PathBuf::from(&prog_files).join("Codex").join("Codex.exe"));
        }
        if let Ok(prog_files_x86) = std::env::var("ProgramFiles(x86)") {
            candidates.push(PathBuf::from(&prog_files_x86).join("ChatGPT").join("ChatGPT.exe"));
            candidates.push(PathBuf::from(&prog_files_x86).join("Codex").join("Codex.exe"));
        }

        for path in candidates {
            if path.exists() {
                return Ok(Some(path.to_string_lossy().to_string()));
            }
        }

        // 2. 检查 WindowsApps / Packages 目录下的 UWP/MSIX 应用包 (如 OpenAI.Codex_2p2nqsd0c76g0)
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let packages_dir = Path::new(&local_app_data).join("Packages");
            if packages_dir.exists() {
                if let Ok(entries) = fs::read_dir(&packages_dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with("OpenAI.Codex_") || name.starts_with("OpenAI.ChatGPT_") {
                            return Ok(Some(format!("shell:AppsFolder\\{}!App", name)));
                        }
                    }
                }
            }
        }

        Ok(None)
    }

    #[cfg(target_os = "macos")]
    {
        let candidates = [
            "/Applications/ChatGPT.app",
            "/Applications/Codex.app",
        ];
        for path in candidates {
            if Path::new(path).exists() {
                return Ok(Some(path.to_string()));
            }
        }
        Ok(None)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        Ok(None)
    }
}

/// 打开系统原生文件对话框选择可执行程序
#[tauri::command]
pub fn pick_codex_path() -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
            Add-Type -AssemblyName System.Windows.Forms
            $dialog = New-Object System.Windows.Forms.OpenFileDialog
            $dialog.Filter = '可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*'
            $dialog.Title = '选择 ChatGPT / Codex 安装路径'
            $dialog.RestoreDirectory = $true
            if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                Write-Output $dialog.FileName
            }
        "#;

        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Sta", "-Command", script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("调起文件选择器失败: {}", e))?;

        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if selected.is_empty() {
            Ok(None)
        } else {
            Ok(Some(selected))
        }
    }

    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

/// 检查 ChatGPT / Codex 进程是否正在运行
fn is_codex_running() -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = std::process::Command::new("cmd")
            .args(["/C", "tasklist /FI \"IMAGENAME eq ChatGPT.exe\" /NH"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            if text.contains("chatgpt.exe") {
                return true;
            }
        }

        let output_codex = std::process::Command::new("cmd")
            .args(["/C", "tasklist /FI \"IMAGENAME eq Codex.exe\" /NH"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output_codex {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            if text.contains("codex.exe") {
                return true;
            }
        }

        false
    }

    #[cfg(not(windows))]
    {
        let output = std::process::Command::new("sh")
            .args(["-c", "pgrep -i chatgpt || pgrep -i codex"])
            .output();
        if let Ok(out) = output {
            !out.stdout.is_empty()
        } else {
            false
        }
    }
}

/// 强制终止 ChatGPT / Codex 进程
fn kill_codex_processes() {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/IM", "ChatGPT.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/IM", "Codex.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }

    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-f", "ChatGPT"])
            .output();
        let _ = std::process::Command::new("pkill")
            .args(["-f", "Codex"])
            .output();
    }
}

/// 启动已解析的目标应用
fn spawn_target(target: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;

        if target.starts_with("shell:AppsFolder\\") {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", target])
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| format!("启动应用失败: {}", e))?;
        } else {
            std::process::Command::new(target)
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| format!("启动应用失败: {}", e))?;
        }
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(target)
            .spawn()
            .map_err(|e| format!("启动应用失败: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        std::process::Command::new(target)
            .spawn()
            .map_err(|e| format!("启动应用失败: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
pub fn launch_codex_app() -> Result<LaunchResult, String> {
    let settings = get_app_settings().unwrap_or_default();

    // 1. 检查是否存在运行中的实例
    let was_running = is_codex_running();
    let mut killed_previous = false;

    if was_running && settings.launch_kill_previous {
        kill_codex_processes();
        // 等待操作系统回收进程与端口句柄
        std::thread::sleep(std::time::Duration::from_millis(600));
        killed_previous = true;
    }

    // 2. 解析启动目标
    let target = if !settings.codex_path.trim().is_empty() {
        let configured = settings.codex_path.trim();
        if !configured.starts_with("shell:AppsFolder\\") && !Path::new(configured).exists() {
            return Err(format!("配置的应用路径不存在: {}", configured));
        }
        configured.to_string()
    } else {
        match detect_codex_path()? {
            Some(detected) => detected,
            None => {
                return Err("未能自动识别到 ChatGPT / Codex 的安装位置，请在设置中手动选择应用路径。".to_string());
            }
        }
    };

    // 3. 执行拉起
    spawn_target(&target)?;

    let message = if killed_previous {
        "已结束正在运行的实例，并成功重新启动 ChatGPT".to_string()
    } else {
        "已成功启动 ChatGPT".to_string()
    };

    Ok(LaunchResult {
        success: true,
        killed_previous,
        message,
        target,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_settings_default() {
        let settings = AppSettings::default();
        assert_eq!(settings.codex_path, "");
        assert_eq!(settings.custom_model, "");
        assert!(settings.launch_kill_previous);
    }

    #[test]
    fn test_app_settings_serialization() {
        let json = r#"{"codex_path":"C:\\test.exe","custom_model":"gpt-4o","launch_kill_previous":false}"#;
        let parsed: AppSettings = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.codex_path, "C:\\test.exe");
        assert_eq!(parsed.custom_model, "gpt-4o");
        assert!(!parsed.launch_kill_previous);

        let default_json = r#"{}"#;
        let parsed_default: AppSettings = serde_json::from_str(default_json).unwrap();
        assert_eq!(parsed_default.codex_path, "");
        assert!(parsed_default.launch_kill_previous);
    }

    #[test]
    fn test_launch_result_serialization() {
        let res = LaunchResult {
            success: true,
            killed_previous: true,
            message: "成功".to_string(),
            target: "ChatGPT.exe".to_string(),
        };
        let serialized = serde_json::to_string(&res).unwrap();
        assert!(serialized.contains("\"killed_previous\":true"));
    }
}
