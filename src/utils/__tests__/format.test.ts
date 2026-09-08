import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
  isLingAI,
  normalizeUrl,
  maskKey,
  formatDate,
} from '../format';

describe('format utils', () => {
  describe('isDefaultStation', () => {
    it('当输入为空或 undefined 时应返回 false', () => {
      expect(isDefaultStation()).toBe(false);
      expect(isDefaultStation('')).toBe(false);
      expect(isDefaultStation('   ')).toBe(false);
    });

    it('应识别默认站点标识名称（大小写不敏感且支持首尾空格）', () => {
      expect(isDefaultStation(DEFAULT_STATION_NAME)).toBe(true);
      expect(isDefaultStation(DEFAULT_STATION_NAME.toLowerCase())).toBe(true);
      expect(isDefaultStation(`  ${DEFAULT_STATION_NAME.toUpperCase()}  `)).toBe(true);
      expect(isDefaultStation('lingai')).toBe(true);
    });

    it('应识别默认站点地址及其带 /v1 后缀或尾随斜杠的形式', () => {
      expect(isDefaultStation(DEFAULT_STATION_URL)).toBe(true);
      expect(isDefaultStation(`${DEFAULT_STATION_URL}/`)).toBe(true);
      expect(isDefaultStation(`${DEFAULT_STATION_URL}/v1`)).toBe(true);
      expect(isDefaultStation(`${DEFAULT_STATION_URL}/v1/`)).toBe(true);
    });

    it('对于非默认中转站应返回 false', () => {
      expect(isDefaultStation('https://api.openai.com')).toBe(false);
      expect(isDefaultStation('https://api.openai.com/v1')).toBe(false);
      expect(isDefaultStation('https://custom-proxy.example.com')).toBe(false);
    });

    it('isLingAI 应为 isDefaultStation 的兼容别名', () => {
      expect(isLingAI).toBe(isDefaultStation);
    });
  });

  describe('normalizeUrl', () => {
    it('当输入为空时返回空字符串', () => {
      expect(normalizeUrl('')).toBe('');
    });

    it('若为默认中转站相关地址，应归一化为标准的 DEFAULT_STATION_URL', () => {
      expect(normalizeUrl('lingai')).toBe(DEFAULT_STATION_URL);
      expect(normalizeUrl(`${DEFAULT_STATION_URL}/v1`)).toBe(DEFAULT_STATION_URL);
      expect(normalizeUrl(`${DEFAULT_STATION_URL}///`)).toBe(DEFAULT_STATION_URL);
    });

    it('若为第三方地址，应仅去除尾随斜杠并保留原始主机与路径', () => {
      expect(normalizeUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1');
      expect(normalizeUrl('https://api.deepseek.com///')).toBe('https://api.deepseek.com');
      expect(normalizeUrl('  https://api.anthropic.com  ')).toBe('https://api.anthropic.com');
    });
  });

  describe('maskKey', () => {
    it('空值或未提供时显示 "未设置 Key"', () => {
      expect(maskKey('')).toBe('未设置 Key');
    });

    it('长度小于等于 8 时应返回全掩码', () => {
      expect(maskKey('12345678')).toBe('••••••••');
      expect(maskKey('abc')).toBe('••••••••');
    });

    it('长度大于 8 时保留前 4 位和后 4 位，中间展示掩码', () => {
      expect(maskKey('sk-1234567890abcdef')).toBe('sk-1••••cdef');
      expect(maskKey('sk-ant-api03-123456789-extra')).toBe('sk-a••••xtra');
    });
  });

  describe('formatDate', () => {
    it('时间戳未提供或为 0 时返回空字符串', () => {
      expect(formatDate()).toBe('');
      expect(formatDate(0)).toBe('');
    });

    it('提供有效时间戳时格式化为日期字符串', () => {
      const ts = new Date('2026-01-15T12:00:00Z').getTime();
      expect(formatDate(ts)).toBe(new Date(ts).toLocaleDateString());
    });
  });
});
