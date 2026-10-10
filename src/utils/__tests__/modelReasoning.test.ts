import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REASONING_SPEC,
  getReasoningEffortOptions,
  resolveModelReasoningSpec,
} from '../modelReasoning';
import { REASONING_EFFORT_OPTIONS } from '../../types/config';

describe('modelReasoning utility', () => {
  describe('resolveModelReasoningSpec', () => {
    it('空值或未匹配模型应返回默认兜底配置', () => {
      expect(resolveModelReasoningSpec('')).toEqual(DEFAULT_REASONING_SPEC);
      expect(resolveModelReasoningSpec(null)).toEqual(DEFAULT_REASONING_SPEC);
      expect(resolveModelReasoningSpec('unknown-model')).toEqual(DEFAULT_REASONING_SPEC);
      expect(resolveModelReasoningSpec('claude-3-7-sonnet')).toEqual(DEFAULT_REASONING_SPEC);
    });

    it('正确解析 OpenAI GPT-5.6 系列模型', () => {
      // GPT-5.6 Sol (支持 ultra)
      const sol = resolveModelReasoningSpec('gpt-5.6-sol');
      expect(sol.defaultLevel).toBe('medium');
      expect(sol.supportedLevels).toEqual([
        'none',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
        'ultra',
      ]);

      // 大小写与空格兼容
      const solCase = resolveModelReasoningSpec('GPT-5.6 Sol');
      expect(solCase.defaultLevel).toBe('medium');
      expect(solCase.supportedLevels).toEqual(sol.supportedLevels);

      // GPT-5.6 Terra (无 ultra)
      const terra = resolveModelReasoningSpec('gpt-5.6-terra');
      expect(terra.defaultLevel).toBe('medium');
      expect(terra.supportedLevels).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);

      // GPT-5.6 Luna (无 ultra)
      const luna = resolveModelReasoningSpec('gpt-5.6_luna');
      expect(luna.defaultLevel).toBe('medium');
      expect(luna.supportedLevels).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    });

    it('正确解析 OpenAI GPT-6 与 GPT-6.1 系列模型', () => {
      // GPT-6 Astra (不可关闭思考，无 none)
      const astra = resolveModelReasoningSpec('gpt-6-astra');
      expect(astra.defaultLevel).toBe('medium');
      expect(astra.supportedLevels).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);

      // GPT-6 Sol
      const sol = resolveModelReasoningSpec('gpt-6-sol');
      expect(sol.defaultLevel).toBe('medium');
      expect(sol.supportedLevels).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);

      // GPT-6 Luna
      const luna = resolveModelReasoningSpec('gpt-6-luna');
      expect(luna.defaultLevel).toBe('medium');
      expect(luna.supportedLevels).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);

      // GPT-6.1 Sol (不可关闭思考)
      const sol61 = resolveModelReasoningSpec('gpt-6.1-sol');
      expect(sol61.defaultLevel).toBe('medium');
      expect(sol61.supportedLevels).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    });

    it('正确解析智谱 GLM-5.3 系列与月之暗面 Kimi K3 模型', () => {
      // GLM-5.3 (默认 max，强制思考)
      const glm = resolveModelReasoningSpec('glm-5.3');
      expect(glm.defaultLevel).toBe('max');
      expect(glm.supportedLevels).toEqual(['low', 'high', 'max']);

      // GLM-5.3-FLASH
      const glmFlash = resolveModelReasoningSpec('GLM-5.3-FLASH');
      expect(glmFlash.defaultLevel).toBe('max');
      expect(glmFlash.supportedLevels).toEqual(['low', 'high', 'max']);

      // Kimi K3 (默认 max，强制思考)
      const kimi = resolveModelReasoningSpec('kimi-k3');
      expect(kimi.defaultLevel).toBe('max');
      expect(kimi.supportedLevels).toEqual(['low', 'high', 'max']);
    });

    it('正确解析 DeepSeek 与 xAI Grok 模型', () => {
      // DeepSeek-V4-Pro (默认 high，可关闭思考)
      const dsPro = resolveModelReasoningSpec('deepseek-v4-pro');
      expect(dsPro.defaultLevel).toBe('high');
      expect(dsPro.supportedLevels).toEqual(['none', 'low', 'high', 'max']);

      // DeepSeek-V4.1-Flash
      const dsFlash = resolveModelReasoningSpec('deepseek-v4.1-flash');
      expect(dsFlash.defaultLevel).toBe('high');
      expect(dsFlash.supportedLevels).toEqual(['none', 'low', 'high', 'max']);

      // Grok-4.6 (默认 high，不可关闭思考)
      const grok46 = resolveModelReasoningSpec('grok-4.6');
      expect(grok46.defaultLevel).toBe('high');
      expect(grok46.supportedLevels).toEqual(['low', 'medium', 'high', 'xhigh']);

      // Grok-4.7 (默认 high，不可关闭思考)
      const grok47 = resolveModelReasoningSpec('grok-4.7');
      expect(grok47.defaultLevel).toBe('high');
      expect(grok47.supportedLevels).toEqual(['low', 'medium', 'high', 'xhigh']);
    });

    it('支持带 provider 前缀或 tag 后缀的模型格式', () => {
      const prefixed = resolveModelReasoningSpec('openai/gpt-5.6-sol:latest');
      expect(prefixed.defaultLevel).toBe('medium');
      expect(prefixed.supportedLevels).toContain('ultra');
    });
  });

  describe('getReasoningEffortOptions', () => {
    it('未指定或未知模型时返回完整选项列表', () => {
      expect(getReasoningEffortOptions('')).toEqual(REASONING_EFFORT_OPTIONS);
      expect(getReasoningEffortOptions('unknown-model')).toEqual(REASONING_EFFORT_OPTIONS);
    });

    it('已知模型过滤出对应的选项对象', () => {
      const glmOptions = getReasoningEffortOptions('glm-5.3');
      expect(glmOptions.map((o) => o.value)).toEqual(['low', 'high', 'max']);

      const dsOptions = getReasoningEffortOptions('deepseek-v4-pro');
      expect(dsOptions.map((o) => o.value)).toEqual(['none', 'low', 'high', 'max']);

      const solOptions = getReasoningEffortOptions('gpt-5.6-sol');
      expect(solOptions.map((o) => o.value)).toEqual([
        'none',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
        'ultra',
      ]);
    });
  });
});
