use std::fs;
use std::path::Path;

fn main() {
    let env_paths = [Path::new("../.env"), Path::new(".env")];
    for path in &env_paths {
        if path.exists() {
            println!("cargo:rerun-if-changed={}", path.display());
            if let Ok(content) = fs::read_to_string(path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with('#') || trimmed.is_empty() {
                        continue;
                    }
                    if let Some((k, v)) = trimmed.split_once('=') {
                        let key = k.trim();
                        let val = v.trim().trim_matches('"').trim_matches('\'');
                        if key == "VITE_DEFAULT_STATION_NAME"
                            || key == "VITE_DEFAULT_STATION_URL"
                            || key == "VITE_DEFAULT_STATION_IDENTIFIER"
                            || key == "VITE_STATION_NAME"
                            || key == "VITE_STATION_URL"
                        {
                            println!("cargo:rustc-env={}={}", key, val);
                        }
                    }
                }
            }
        }
    }

    tauri_build::build();
}
