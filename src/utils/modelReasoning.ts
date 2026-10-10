import { REASONING_EFFORT_OPTIONS } from '../types/config';

export interface ModelReasoningSpec {
  defaultLevel: string;
  supportedLevels: string[];
}

export const DEFAULT_REASONING_SPEC: ModelReasoningSpec = {
  defaultLevel: 'medium',
  supportedLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
};

/**
 * 根据模型 slug 解析其支持的思考强度配置规格
 */
export function resolveModelReasoningSpec(slug?: string | null): ModelReasoningSpec {
  if (!slug || !slug.trim()) {
    return DEFAULT_REASONING_SPEC;
  }

  const s = slug.toLowerCase();
  const name = (s.split('/').pop() || s).trim();
  const nameWithoutTag = name.split(':')[0] || name;
  const clean = nameWithoutTag.replace(/[_\s]+/g, '-');

  if (clean === 'gpt-5.6-sol' || clean.startsWith('gpt-5.6-sol-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    };
  }
  if (clean === 'gpt-5.6-terra' || clean.startsWith('gpt-5.6-terra-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'gpt-5.6-luna' || clean.startsWith('gpt-5.6-luna-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'gpt-6.1-sol' || clean.startsWith('gpt-6.1-sol-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'gpt-6-astra' || clean.startsWith('gpt-6-astra-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'gpt-6-sol' || clean.startsWith('gpt-6-sol-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'gpt-6-luna' || clean.startsWith('gpt-6-luna-')) {
    return {
      defaultLevel: 'medium',
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    };
  }
  if (clean === 'glm-5.3-flash' || clean.startsWith('glm-5.3-flash-')) {
    return {
      defaultLevel: 'max',
      supportedLevels: ['low', 'high', 'max'],
    };
  }
  if (clean === 'glm-5.3' || clean.startsWith('glm-5.3-')) {
    return {
      defaultLevel: 'max',
      supportedLevels: ['low', 'high', 'max'],
    };
  }
  if (clean === 'kimi-k3' || clean.startsWith('kimi-k3-')) {
    return {
      defaultLevel: 'max',
      supportedLevels: ['low', 'high', 'max'],
    };
  }
  if (clean === 'deepseek-v4.1-flash' || clean.startsWith('deepseek-v4.1-flash-')) {
    return {
      defaultLevel: 'high',
      supportedLevels: ['none', 'low', 'high', 'max'],
    };
  }
  if (clean === 'deepseek-v4-pro' || clean.startsWith('deepseek-v4-pro-')) {
    return {
      defaultLevel: 'high',
      supportedLevels: ['none', 'low', 'high', 'max'],
    };
  }
  if (clean === 'grok-4.6' || clean.startsWith('grok-4.6-')) {
    return {
      defaultLevel: 'high',
      supportedLevels: ['low', 'medium', 'high', 'xhigh'],
    };
  }
  if (clean === 'grok-4.7' || clean.startsWith('grok-4.7-')) {
    return {
      defaultLevel: 'high',
      supportedLevels: ['low', 'medium', 'high', 'xhigh'],
    };
  }

  return DEFAULT_REASONING_SPEC;
}

/**
 * 根据模型 slug 获取其可供前端下拉选择的思考强度选项列表
 * 如果未命中已知模型，返回完整选项列表
 */
export function getReasoningEffortOptions(slug?: string | null): typeof REASONING_EFFORT_OPTIONS {
  if (!slug || !slug.trim()) {
    return REASONING_EFFORT_OPTIONS;
  }

  const spec = resolveModelReasoningSpec(slug);
  if (spec === DEFAULT_REASONING_SPEC) {
    return REASONING_EFFORT_OPTIONS;
  }

  const optionMap = new Map(REASONING_EFFORT_OPTIONS.map((opt) => [opt.value, opt]));
  return spec.supportedLevels
    .map((level) => optionMap.get(level))
    .filter((opt): opt is (typeof REASONING_EFFORT_OPTIONS)[number] => Boolean(opt));
}
