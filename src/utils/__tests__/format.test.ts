import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  applyStationAlias,
  isDefaultStation,
  isLingAI,
  normalizeUrl,
  maskKey,
  formatDate,
  normalizePositiveInt,
  parseContextLimitInput,
  formatOptionalPositiveInt,
  calcDefaultAutoCompactTokenLimit,
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

    it('第三方地址缺少版本段时应自动补齐 /v1，确保写入 config.toml 后可正常请求', () => {
      expect(normalizeUrl('https://api.fluxapi.vip')).toBe('https://api.fluxapi.vip/v1');
      expect(normalizeUrl('https://api.deepseek.com///')).toBe('https://api.deepseek.com/v1');
      expect(normalizeUrl('  https://api.anthropic.com  ')).toBe('https://api.anthropic.com/v1');
    });

    it('已带版本段的地址应保持原样，避免重复拼接 /v1', () => {
      expect(normalizeUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1');
      expect(normalizeUrl('https://api.fluxapi.vip/v1')).toBe('https://api.fluxapi.vip/v1');
      expect(normalizeUrl('https://open.bigmodel.cn/api/paas/v4')).toBe(
        'https://open.bigmodel.cn/api/paas/v4'
      );
      expect(normalizeUrl('https://api.example.com/v1beta')).toBe(
        'https://api.example.com/v1beta'
      );
    });

    it('从文档复制的完整端点应回落到基准地址', () => {
      expect(normalizeUrl('https://api.fluxapi.vip/v1/models')).toBe(
        'https://api.fluxapi.vip/v1'
      );
      expect(normalizeUrl('https://api.fluxapi.vip/models')).toBe('https://api.fluxapi.vip/v1');
      expect(normalizeUrl('https://api.fluxapi.vip/v1/chat/completions')).toBe(
        'https://api.fluxapi.vip/v1'
      );
    });

    it('规范化结果应幂等', () => {
      const once = normalizeUrl('https://api.fluxapi.vip');
      expect(normalizeUrl(once)).toBe(once);
      expect(normalizeUrl(DEFAULT_STATION_URL)).toBe(DEFAULT_STATION_URL);
    });
  });

  describe('applyStationAlias', () => {
    it('应将默认同义标识即时映射为标准地址', () => {
      expect(applyStationAlias('lingai')).toBe(DEFAULT_STATION_URL);
      expect(applyStationAlias(DEFAULT_STATION_NAME)).toBe(DEFAULT_STATION_URL);
      expect(applyStationAlias(`${DEFAULT_STATION_URL}/v1`)).toBe(DEFAULT_STATION_URL);
    });

    it('第三方地址应原样返回', () => {
      expect(applyStationAlias('https://api.openai.com/v1')).toBe('https://api.openai.com/v1');
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

  describe('context limit helpers', () => {
    it('normalizePositiveInt 仅接受大于 0 的安全整数或纯数字字符串', () => {
      expect(normalizePositiveInt(272000)).toBe(272000);
      expect(normalizePositiveInt(' 244800 ')).toBe(244800);
      expect(normalizePositiveInt(0)).toBeNull();
      expect(normalizePositiveInt('0')).toBeNull();
      expect(normalizePositiveInt(-100)).toBeNull();
      expect(normalizePositiveInt('12.5')).toBeNull();
      expect(normalizePositiveInt('abc')).toBeNull();
      expect(normalizePositiveInt(null)).toBeNull();
      expect(normalizePositiveInt(undefined)).toBeNull();
    });

    it('parseContextLimitInput 区分留空、合法正整数与非法输入', () => {
      expect(parseContextLimitInput('')).toEqual({ valid: true, value: null });
      expect(parseContextLimitInput('   ')).toEqual({ valid: true, value: null });
      expect(parseContextLimitInput('272000')).toEqual({ valid: true, value: 272000 });
      expect(parseContextLimitInput('0')).toEqual({ valid: false, value: null });
      expect(parseContextLimitInput('abc')).toEqual({ valid: false, value: null });
    });

    it('formatOptionalPositiveInt 正确格式化展示字符串', () => {
      expect(formatOptionalPositiveInt(272000)).toBe('272000');
      expect(formatOptionalPositiveInt(0)).toBe('');
      expect(formatOptionalPositiveInt(null)).toBe('');
      expect(formatOptionalPositiveInt(undefined)).toBe('');
    });

    it('calcDefaultAutoCompactTokenLimit 计算 0.9 倍阈值且至少为 1', () => {
      expect(calcDefaultAutoCompactTokenLimit(272000)).toBe(244800);
      expect(calcDefaultAutoCompactTokenLimit(500000)).toBe(450000);
      expect(calcDefaultAutoCompactTokenLimit(1000000)).toBe(900000);
      expect(calcDefaultAutoCompactTokenLimit(1)).toBe(1);
    });
  });
});
