import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_REASONING_SPEC,
  clearModelReasoningCache,
  fetchModelReasoningSpec,
  mapReasoningLevelsToOptions,
} from '../modelReasoning';
import { REASONING_EFFORT_OPTIONS } from '../../types/config';
import * as hybridStorage from '../hybridStorage';

describe('modelReasoning utility', () => {
  beforeEach(() => {
    clearModelReasoningCache();
    vi.restoreAllMocks();
  });

  describe('mapReasoningLevelsToOptions', () => {
    it('空列表或非法输入应回退为完整 REASONING_EFFORT_OPTIONS', () => {
      expect(mapReasoningLevelsToOptions([])).toEqual(REASONING_EFFORT_OPTIONS);
      expect(mapReasoningLevelsToOptions(null)).toEqual(REASONING_EFFORT_OPTIONS);
      expect(mapReasoningLevelsToOptions(undefined)).toEqual(REASONING_EFFORT_OPTIONS);
    });

    it('根据传入的 levels 数组正确映射为对应选项对象', () => {
      const options = mapReasoningLevelsToOptions(['low', 'high', 'max']);
      expect(options.map((o) => o.value)).toEqual(['low', 'high', 'max']);
      expect(options[0].label).toBe('low');
      expect(options[1].label).toBe('high');
      expect(options[2].label).toBe('max');
    });

    it('过滤无效档位并在全无效时回退为默认列表', () => {
      const options = mapReasoningLevelsToOptions(['invalid_effort']);
      expect(options).toEqual(REASONING_EFFORT_OPTIONS);
    });
  });

  describe('fetchModelReasoningSpec', () => {
    it('模型名为空时直接返回 DEFAULT_REASONING_SPEC 且不调用后端', async () => {
      const invokeSpy = vi.spyOn(hybridStorage, 'invokeCommand');
      const spec = await fetchModelReasoningSpec('');
      expect(spec).toEqual(DEFAULT_REASONING_SPEC);
      expect(invokeSpy).not.toHaveBeenCalled();

      const nullSpec = await fetchModelReasoningSpec(null);
      expect(nullSpec).toEqual(DEFAULT_REASONING_SPEC);
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it('正常调用后端 get_model_reasoning_spec 命令并缓存结果', async () => {
      const mockResult = {
        default_level: 'max',
        supported_levels: ['low', 'high', 'max'],
      };
      const invokeSpy = vi
        .spyOn(hybridStorage, 'invokeCommand')
        .mockResolvedValue(mockResult);

      const spec1 = await fetchModelReasoningSpec('glm-5.3');
      expect(invokeSpy).toHaveBeenCalledWith('get_model_reasoning_spec', {
        slug: 'glm-5.3',
      });
      expect(spec1).toEqual(mockResult);

      // 第二次调用命中内存缓存，不应再次触发 IPC
      const spec2 = await fetchModelReasoningSpec('GLM-5.3');
      expect(invokeSpy).toHaveBeenCalledTimes(1);
      expect(spec2).toEqual(mockResult);
    });

    it('后端抛出异常时捕获并优雅回退为 DEFAULT_REASONING_SPEC', async () => {
      vi.spyOn(hybridStorage, 'invokeCommand').mockRejectedValue(
        new Error('IPC Failure')
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const spec = await fetchModelReasoningSpec('error-model');
      expect(spec).toEqual(DEFAULT_REASONING_SPEC);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
