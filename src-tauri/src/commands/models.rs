use std::time::Duration;

use serde::Serialize;

const MIN_TIMEOUT_MS: u64 = 1_000;
const MAX_TIMEOUT_MS: u64 = 30_000;
const DEFAULT_TIMEOUT_MS: u64 = 10_000;

const MODEL_FETCH_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// 模型列表请求的传输结果，保留原始响应体交由前端统一解析
#[derive(Serialize)]
pub struct ModelFetchResponse {
    pub status: u16,
    pub body: String,
}

fn resolve_timeout(timeout_ms: Option<u64>) -> Duration {
    Duration::from_millis(
        timeout_ms
            .unwrap_or(DEFAULT_TIMEOUT_MS)
            .clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
    )
}

/// 由 Rust 原生 HTTP 客户端发起 GET，绕开 WebView 的同源策略与 CORS 预检限制。
/// URL 拼接、404 降级、模型解析与缓存仍由前端负责，本命令仅承担传输职责。
#[tauri::command]
pub async fn fetch_provider_models(
    endpoint: String,
    api_key: String,
    timeout_ms: Option<u64>,
) -> Result<ModelFetchResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(resolve_timeout(timeout_ms))
        .build()
        .map_err(|_| "获取模型列表失败: 无法创建 HTTP 客户端，请重试".to_string())?;

    let response = client
        .get(endpoint.trim())
        .header(reqwest::header::USER_AGENT, MODEL_FETCH_USER_AGENT)
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", api_key.trim()),
        )
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|e| {
            // 底层错误仅留在日志，界面只呈现可读的分类提示
            eprintln!("[fetch_provider_models] 请求失败: {e:?}");
            if e.is_timeout() {
                "获取模型列表超时，请检查网络或地址".to_string()
            } else if e.is_builder() {
                "获取模型列表失败: 地址格式不正确，请检查 Base URL".to_string()
            } else if e.is_connect() {
                "获取模型列表失败: 无法连接到地址，请检查网络或地址是否正确".to_string()
            } else {
                "获取模型列表失败: 网络请求异常，请检查网络或地址后重试".to_string()
            }
        })?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|_| "获取模型列表失败: 读取响应内容失败，请检查网络后重试".to_string())?;

    Ok(ModelFetchResponse { status, body })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_timeout_clamps_to_safe_range() {
        assert_eq!(resolve_timeout(None), Duration::from_millis(10_000));
        assert_eq!(resolve_timeout(Some(5_000)), Duration::from_millis(5_000));
        assert_eq!(resolve_timeout(Some(500)), Duration::from_millis(1_000));
        assert_eq!(resolve_timeout(Some(999_999)), Duration::from_millis(30_000));
    }
}
