export const LINGAI_URL = 'https://lingai.linglingdayo.top';

/**
 * 判断是否为 LingAI 标识或地址
 */
export function isLingAI(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().replace(/\/+$/, '').toLowerCase();
  return (
    trimmed === 'lingai' ||
    trimmed === 'https://lingai.linglingdayo.top' ||
    trimmed === 'https://lingai.linglingdayo.top/v1'
  );
}

/**
 * 标准化 URL，处理 LingAI 映射与去除末尾斜杠
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (isLingAI(trimmed)) {
    return LINGAI_URL;
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
