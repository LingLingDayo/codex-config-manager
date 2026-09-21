import { describe, it, expect } from 'vitest';
import { isPresetActive, matchesPresetIdentity } from '../preset';
import type { CodexConfig, PresetConfig } from '../../types/config';

const samplePreset: PresetConfig = {
  id: 'p1',
  name: '测试站',
  provider_url: 'https://api.example.com/v1/',
  key: 'sk-secret-123',
};

describe('preset utils', () => {
  describe('matchesPresetIdentity', () => {
    it('Key 与归一化 URL 均匹配时应返回 true', () => {
      expect(
        matchesPresetIdentity(samplePreset, 'sk-secret-123', 'https://api.example.com/v1')
      ).toBe(true);
    });

    it('Key 为空或不匹配时应返回 false', () => {
      expect(matchesPresetIdentity(samplePreset, '', 'https://api.example.com/v1')).toBe(false);
      expect(matchesPresetIdentity(samplePreset, 'sk-other', 'https://api.example.com/v1')).toBe(
        false
      );
    });
  });

  describe('isPresetActive', () => {
    it('当前配置未启用时返回 false', () => {
      const config: CodexConfig = {
        key: 'sk-secret-123',
        provider_url: 'https://api.example.com/v1',
        is_enabled: false,
      };
      expect(isPresetActive(samplePreset, config)).toBe(false);
    });

    it('启用且身份匹配时返回 true', () => {
      const config: CodexConfig = {
        key: 'sk-secret-123',
        provider_url: 'https://api.example.com/v1',
        is_enabled: true,
      };
      expect(isPresetActive(samplePreset, config)).toBe(true);
    });
  });
});
