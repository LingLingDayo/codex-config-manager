import { normalizeUrl } from './format';

/**
 * 依据中转站基准地址计算 models 查询端点
 */
export function buildModelsUrl(providerUrl: string): string {
  if (!providerUrl) return '';
  let url = providerUrl.trim().replace(/\/+$/, '');
  if (!url) return '';

  // 转换别名或默认地址
  url = normalizeUrl(url);

  // 如果已经以 /models 结尾
  if (url.endsWith('/models')) {
    return url;
  }

  // 若以版本号模式结尾（例如 /v1, /v4）
  if (/\/(v\d+([a-zA-Z0-9_-]*)?)$/i.test(url)) {
    return `${url}/models`;
  }

  // 默认补齐 /v1/models
  return `${url}/v1/models`;
}

/**
 * 解析兼容 OpenAI 格式或多格式的响应 JSON 并提取模型 ID 列表
 */
export function parseModelList(json: any): string[] {
  if (!json) return [];

  let list: any[] = [];
  if (Array.isArray(json)) {
    list = json;
  } else if (Array.isArray(json?.data)) {
    list = json.data;
  } else if (Array.isArray(json?.models)) {
    list = json.models;
  }

  const result: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      result.push(item.trim());
    } else if (item && typeof item === 'object') {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (id) {
        result.push(id);
      } else if (name) {
        result.push(name);
      }
    }
  }

  // 去重并按字母升序排列
  return Array.from(new Set(result)).sort((a, b) => a.localeCompare(b));
}

/**
 * 请求中转站获取当前 Key 支持的可用模型列表
 */
export async function fetchProviderModels(
  providerUrl: string,
  apiKey: string,
  timeoutMs = 10000
): Promise<string[]> {
  const trimmedUrl = providerUrl?.trim() || '';
  const trimmedKey = apiKey?.trim() || '';

  if (!trimmedKey && !trimmedUrl) {
    throw new Error('请先配置 API Key 和中转站地址');
  }
  if (!trimmedKey) {
    throw new Error('请先配置 API Key');
  }
  if (!trimmedUrl) {
    throw new Error('请先配置中转站地址');
  }

  const endpoint = buildModelsUrl(trimmedUrl);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.message?.includes('timeout')) {
      throw new Error('请求中转站超时，请检查网络或中转站地址');
    }
    throw new Error(`连接中转站失败: ${err?.message || '网络异常'}`);
  }

  // 针对某些特殊中转站降级重试：如果 /v1/models 404，尝试 /models
  if (response.status === 404 && endpoint.endsWith('/v1/models')) {
    const baseWithoutV1 = endpoint.replace(/\/v1\/models$/, '');
    try {
      const fallbackResp = await fetch(`${baseWithoutV1}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(Math.min(timeoutMs, 5000)),
      });
      if (fallbackResp.ok) {
        response = fallbackResp;
      }
    } catch {
      // 忽略 fallback 错误，让下方的错误处理统一处理
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('API Key 无效或未授权');
    }
    if (response.status === 404) {
      throw new Error('中转站未找到模型接口 (/v1/models)');
    }

    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || errJson?.message || '';
    } catch {
      // 忽略 JSON 解析失败
    }

    throw new Error(
      errorDetail
        ? `获取模型失败: ${errorDetail}`
        : `中转站响应异常 (HTTP ${response.status})`
    );
  }

  const json = await response.json();
  const models = parseModelList(json);

  if (models.length === 0 && json?.error?.message) {
    throw new Error(json.error.message);
  }

  return models;
}
