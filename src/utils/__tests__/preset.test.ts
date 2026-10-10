import { describe, it, expect } from 'vitest';
import { isPresetActive, isPresetContentEqual, matchesPresetIdentity } from '../preset';
import type { CodexConfig, PresetConfig } from '../../types/config';

const samplePreset: PresetConfig = {
  id: 'p1',
  name: '测试站',
  provider_url: 'https://api.example.com/v1/',
  key: 'sk-secret-123',
  model: 'gpt-4o',
  model_reasoning_effort: 'medium',
  model_aliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
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

  describe('isPresetContentEqual', () => {
    it('所有配置项完全一致时应返回 true', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-secret-123',
          providerUrl: 'https://api.example.com/v1',
          model: 'gpt-4o',
          modelReasoningEffort: 'medium',
          modelAliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
        })
      ).toBe(true);
    });

    it('Key 不一致时应返回 false', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-other',
          providerUrl: 'https://api.example.com/v1',
          model: 'gpt-4o',
          modelReasoningEffort: 'medium',
          modelAliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
        })
      ).toBe(false);
    });

    it('Provider URL 规范化后不一致时应返回 false', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-secret-123',
          providerUrl: 'https://api.different.com/v1',
          model: 'gpt-4o',
          modelReasoningEffort: 'medium',
          modelAliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
        })
      ).toBe(false);
    });

    it('Model 不一致时应返回 false', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-secret-123',
          providerUrl: 'https://api.example.com/v1',
          model: 'o1-mini',
          modelReasoningEffort: 'medium',
          modelAliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
        })
      ).toBe(false);
    });

    it('推理强度不一致时应返回 false', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-secret-123',
          providerUrl: 'https://api.example.com/v1',
          model: 'gpt-4o',
          modelReasoningEffort: 'high',
          modelAliases: [{ slug: 'gpt-4o', display_name: 'GPT-4o' }],
        })
      ).toBe(false);
    });

    it('模型别名列表不一致时应返回 false', () => {
      expect(
        isPresetContentEqual(samplePreset, {
          key: 'sk-secret-123',
          providerUrl: 'https://api.example.com/v1',
          model: 'gpt-4o',
          modelReasoningEffort: 'medium',
          modelAliases: [{ slug: 'gpt-4o', display_name: '新别名' }],
        })
      ).toBe(false);
    });

    it('兼容旧版单个 display_name 并正确比对别名', () => {
      const legacyPreset: PresetConfig = {
        id: 'p2',
        name: '旧版预设',
        provider_url: 'https://api.example.com/v1',
        key: 'sk-secret-legacy',
        model: 'gpt-4',
        model_display_name: '旧版 4 号',
      };

      expect(
        isPresetContentEqual(legacyPreset, {
          key: 'sk-secret-legacy',
          providerUrl: 'https://api.example.com/v1',
          model: 'gpt-4',
          modelReasoningEffort: '',
          modelAliases: [{ slug: 'gpt-4', display_name: '旧版 4 号' }],
        })
      ).toBe(true);
    });
  });
});
