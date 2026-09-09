use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct CodexConfig {
    pub key: String,
    pub provider_url: String,
    pub is_enabled: bool,
    #[serde(default)]
    pub model: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct PresetConfig {
    pub id: String,
    pub name: String,
    pub key: String,
    pub provider_url: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub updated_at: Option<u64>,
}

fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct AppSettings {
    #[serde(default)]
    pub codex_path: String,
    #[serde(default)]
    pub custom_model: String,
    #[serde(default = "default_true")]
    pub launch_kill_previous: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            codex_path: String::new(),
            custom_model: String::new(),
            launch_kill_previous: true,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct LaunchResult {
    pub success: bool,
    pub killed_previous: bool,
    pub message: String,
    pub target: String,
}
