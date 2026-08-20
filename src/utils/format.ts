/**
 * 标准化 URL，处理 LingAI 映射与去除末尾斜杠
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (
    trimmed === 'https://lingai.linglingdayo.top' ||
    trimmed === 'https://lingai.linglingdayo.top/v1' ||
    trimmed.toLowerCase() === 'lingai'
  ) {
    return 'LingAI';
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
