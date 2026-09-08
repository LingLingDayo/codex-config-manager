use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct CodexConfig {
    pub key: String,
    pub provider_url: String,
    pub is_enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct PresetConfig {
    pub id: String,
    pub name: String,
    pub key: String,
    pub provider_url: String,
    #[serde(default)]
    pub updated_at: Option<u64>,
}
