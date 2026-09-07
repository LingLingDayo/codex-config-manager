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

/**
 * 标准化 URL，处理默认中转站映射与去除末尾斜杠
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (isDefaultStation(trimmed)) {
    return DEFAULT_STATION_URL;
  }
  return trimmed;
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
