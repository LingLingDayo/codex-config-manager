use std::time::Duration;

use serde::Serialize;

const MIN_TIMEOUT_MS: u64 = 1_000;
const MAX_TIMEOUT_MS: u64 = 30_000;
const DEFAULT_TIMEOUT_MS: u64 = 10_000;

/// 模型列表请求的传输结果，保留原始响应体交由前端统一解析
#[derive(Serialize)]
pub struct ModelFetchResponse {
    pub status: u16,
    pub body: String,
}

/// 由 Rust 原生 HTTP 客户端发起 GET，绕开 WebView 的同源策略与 CORS 预检限制。
/// URL 拼接、404 降级、模型解析与缓存仍由前端负责，本命令仅承担传输职责。
#[tauri::command]
pub async fn fetch_provider_models(
    endpoint: String,
    api_key: String,
    timeout_ms: Option<u64>,
) -> Result<ModelFetchResponse, String> {
    let timeout = Duration::from_millis(
        timeout_ms
            .unwrap_or(DEFAULT_TIMEOUT_MS)
            .clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
    );

    let client = reqwest::Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|e| format!("获取模型列表失败: 无法创建 HTTP 客户端 ({})", e))?;

    let response = client
        .get(endpoint.trim())
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", api_key.trim()),
        )
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "获取模型列表超时，请检查网络或地址".to_string()
            } else if e.is_connect() {
                "获取模型列表失败: 无法连接到地址，请检查网络或地址是否正确".to_string()
            } else {
                format!("获取模型列表失败: {}", e)
            }
        })?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(ModelFetchResponse { status, body })
}
