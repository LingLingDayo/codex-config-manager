import { normalizeUrl } from './format';
import { invokeCommand, isTauriEnv } from './hybridStorage';

const MODEL_FETCH_CACHE_TTL_MS = 60_000;
let modelFetchCache: { key: string; url: string; models: string[]; expireAt: number } | null =
  null;

interface ModelFetchTransport {
  status: number;
  body: string;
}

interface ModelFetchResponse {
  ok: boolean;
  status: number;
  body: string;
}

export function clearModelFetchCache() {
  modelFetchCache = null;
}

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

function normalizeTransportError(err: any): Error {
  const raw = (err?.message || String(err) || '').trim();
  if (raw.startsWith('获取模型列表')) {
    return new Error(raw);
  }
  if (/timeout|超时/i.test(raw)) {
    return new Error('获取模型列表超时，请检查网络或地址');
  }
  return new Error(`获取模型列表失败: ${raw || '网络异常'}`);
}

/**
 * 优先经 Rust 原生 HTTP 传输层发起 GET，避免 WebView 的 CORS 预检拦截；
 * 纯浏览器预览（无 Tauri 运行时）时降级为原生 fetch。
 */
async function requestModels(
  endpoint: string,
  apiKey: string,
  timeoutMs: number
): Promise<ModelFetchResponse> {
  if (isTauriEnv()) {
    const result = await invokeCommand<ModelFetchTransport>('fetch_provider_models', {
      endpoint,
      apiKey,
      timeoutMs,
    });
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      body: result.body ?? '',
    };
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}

function parseJsonBody(body: string): any {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
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
    throw new Error('请先配置 API Key 和地址');
  }
  if (!trimmedKey) {
    throw new Error('请先配置 API Key');
  }
  if (!trimmedUrl) {
    throw new Error('请先配置地址');
  }

  if (
    modelFetchCache &&
    modelFetchCache.key === trimmedKey &&
    modelFetchCache.url === trimmedUrl &&
    modelFetchCache.expireAt > Date.now()
  ) {
    return [...modelFetchCache.models];
  }

  const endpoint = buildModelsUrl(trimmedUrl);
  let response: ModelFetchResponse;

  try {
    response = await requestModels(endpoint, trimmedKey, timeoutMs);
  } catch (err: any) {
    throw normalizeTransportError(err);
  }

  // 针对某些特殊接口降级重试：如果 /v1/models 404，尝试 /models
  if (response.status === 404 && endpoint.endsWith('/v1/models')) {
    const baseWithoutV1 = endpoint.replace(/\/v1\/models$/, '');
    try {
      const fallback = await requestModels(
        `${baseWithoutV1}/models`,
        trimmedKey,
        Math.min(timeoutMs, 5000)
      );
      if (fallback.ok) {
        response = fallback;
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
      throw new Error('未找到模型接口 (/v1/models)');
    }

    const errJson = parseJsonBody(response.body);
    const errorDetail = errJson?.error?.message || errJson?.message || '';

    throw new Error(
      errorDetail
        ? `获取模型列表失败: ${errorDetail}`
        : `获取模型列表失败 (HTTP ${response.status})`
    );
  }

  const json = parseJsonBody(response.body);
  if (json === null) {
    throw new Error('获取模型列表失败: 响应不是有效的 JSON');
  }

  const models = parseModelList(json);

  if (models.length === 0 && json?.error?.message) {
    throw new Error(json.error.message);
  }

  modelFetchCache = {
    key: trimmedKey,
    url: trimmedUrl,
    models,
    expireAt: Date.now() + MODEL_FETCH_CACHE_TTL_MS,
  };

  return models;
}
