use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct CodexConfig {
    pub key: String,
    pub provider_url: String,
    pub is_enabled: bool,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub model_reasoning_effort: String,
    #[serde(default)]
    pub model_display_name: String,
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
    pub model_reasoning_effort: String,
    #[serde(default)]
    pub model_display_name: String,
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
    #[serde(default = "default_true")]
    pub launch_kill_previous: bool,
    #[serde(default = "default_true")]
    pub show_provider_presets: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            codex_path: String::new(),
            launch_kill_previous: true,
            show_provider_presets: true,
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
