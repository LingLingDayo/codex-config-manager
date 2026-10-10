import { REASONING_EFFORT_OPTIONS } from '../types/config';

export interface ModelReasoningSpec {
  defaultLevel: string;
  supportedLevels: string[];
}

/**
 * 模型匹配规则定义（声明式表驱动）
 */
export interface ModelReasoningRule {
  /** 匹配的模型标识模式列表（如 ['gpt-5.6-sol']） */
  patterns: readonly string[];
  /** 该规则适用的默认思考强度 */
  defaultLevel: string;
  /** 该规则支持的思考强度档位列表 */
  supportedLevels: readonly string[];
}

export const DEFAULT_REASONING_SPEC: ModelReasoningSpec = {
  defaultLevel: 'medium',
  supportedLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
};

/**
 * 已知模型思考强度规则表（按特定性优先排序）
 */
export const KNOWN_MODEL_RULES: readonly ModelReasoningRule[] = [
  // GPT-5.6 Sol (支持 ultra 模式)
  {
    patterns: ['gpt-5.6-sol'],
    defaultLevel: 'medium',
    supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  },
  // GPT-5.6 / GPT-6 支持 none 到 max（无 ultra）
  {
    patterns: ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-6-sol', 'gpt-6-luna'],
    defaultLevel: 'medium',
    supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
  },
  // GPT-6 Astra / GPT-6.1 Sol（不可关闭思考，无 ultra）
  {
    patterns: ['gpt-6.1-sol', 'gpt-6-astra'],
    defaultLevel: 'medium',
    supportedLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
  },
  // 智谱 GLM-5.3 系列与月之暗面 Kimi K3（默认 max，强制思考）
  {
    patterns: ['glm-5.3-flash', 'glm-5.3', 'kimi-k3'],
    defaultLevel: 'max',
    supportedLevels: ['low', 'high', 'max'],
  },
  // DeepSeek 系列（默认 high，可关闭思考）
  {
    patterns: ['deepseek-v4.1-flash', 'deepseek-v4-pro'],
    defaultLevel: 'high',
    supportedLevels: ['none', 'low', 'high', 'max'],
  },
  // xAI Grok 系列（默认 high，不可关闭思考）
  {
    patterns: ['grok-4.6', 'grok-4.7'],
    defaultLevel: 'high',
    supportedLevels: ['low', 'medium', 'high', 'xhigh'],
  },
];

/**
 * 规范化模型 slug（去除大小写、命名空间与 tag）
 */
export function normalizeModelSlug(raw?: string | null): string {
  if (!raw || !raw.trim()) return '';
  const s = raw.toLowerCase().trim();
  const name = (s.split('/').pop() || s).trim();
  const nameWithoutTag = name.split(':')[0] || name;
  return nameWithoutTag.replace(/[_\s]+/g, '-');
}

/**
 * 根据模型 slug 解析其支持的思考强度配置规格（表驱动匹配）
 */
export function resolveModelReasoningSpec(slug?: string | null): ModelReasoningSpec {
  const clean = normalizeModelSlug(slug);
  if (!clean) {
    return DEFAULT_REASONING_SPEC;
  }

  for (const rule of KNOWN_MODEL_RULES) {
    const isMatched = rule.patterns.some(
      (pattern) => clean === pattern || clean.startsWith(`${pattern}-`)
    );
    if (isMatched) {
      return {
        defaultLevel: rule.defaultLevel,
        supportedLevels: [...rule.supportedLevels],
      };
    }
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
