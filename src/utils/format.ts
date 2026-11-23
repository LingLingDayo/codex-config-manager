// 环境变量可配置的默认中转站标识与地址，若未配置则回退至 LingAI
export const DEFAULT_STATION_NAME: string =
  (import.meta.env.VITE_DEFAULT_STATION_NAME as string)?.trim() ||
  (import.meta.env.VITE_DEFAULT_STATION_IDENTIFIER as string)?.trim() ||
  (import.meta.env.VITE_STATION_NAME as string)?.trim() ||
  'LingAI';

export const DEFAULT_STATION_URL: string =
  (import.meta.env.VITE_DEFAULT_STATION_URL as string)?.trim() ||
  (import.meta.env.VITE_STATION_URL as string)?.trim() ||
  'https://lingai.linglingdayo.top';

// 向下兼容别名
export const LINGAI_URL = DEFAULT_STATION_URL;

/**
 * 判断是否为默认可识别的中转站标识或地址
 */
export function isDefaultStation(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().replace(/\/+$/, '').toLowerCase();
  const defName = DEFAULT_STATION_NAME.toLowerCase();
  const defUrl = DEFAULT_STATION_URL.replace(/\/+$/, '').toLowerCase();

  return (
    trimmed === defName ||
    trimmed === defUrl ||
    trimmed === `${defUrl}/v1` ||
    // 兼容原生 LingAI 默认识别
    trimmed === 'lingai' ||
    trimmed === 'https://lingai.linglingdayo.top' ||
    trimmed === 'https://lingai.linglingdayo.top/v1'
  );
}

// 兼容旧调用名
export const isLingAI = isDefaultStation;

// 常见 API 版本段：/v1、/v4、/v1beta、/v2-alpha
const API_VERSION_SEGMENT = /\/(v\d+[a-zA-Z0-9_-]*)$/i;
// 用户可能从文档直接复制完整端点，写入 base_url 前需回落到基准地址
const TRAILING_ENDPOINT = /\/(models|responses|chat\/completions|completions)$/i;

/**
 * 将输入的 Base URL 规范化为可直接写入 config.toml 的 base_url。
 * 与 Rust 侧 normalize_provider_base_url 规则保持一致，修改时需同步两端。
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  let trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  // 默认站网关已兼容根路径，保持历史行为不变
  if (isDefaultStation(trimmed)) {
    return DEFAULT_STATION_URL;
  }

  trimmed = trimmed.replace(TRAILING_ENDPOINT, '');
  if (isDefaultStation(trimmed)) {
    return DEFAULT_STATION_URL;
  }
  if (API_VERSION_SEGMENT.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/v1`;
}

/**
 * 将输入框中的默认中转站别名即时映射为标准地址
 */
export function applyStationAlias(input: string): string {
  if (!input) return input;
  const trimmed = input.trim().replace(/\/+$/, '');
  if (isDefaultStation(trimmed)) {
    return DEFAULT_STATION_URL;
  }
  return input;
}

/**
 * 密钥脱敏显示 (例如: sk-12••••••34ab)
 */
export function maskKey(key: string): string {
  if (!key) return '未设置 Key';
  if (key.length <= 8) return '••••••••';
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}••••${end}`;
}

/**
 * 格式化时间戳为本地日期字符串
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString();
}
