import type { ModelReasoningSpec } from '../types/config';
import { REASONING_EFFORT_OPTIONS } from '../types/config';
import { invokeCommand } from './hybridStorage';

export const DEFAULT_REASONING_SPEC: ModelReasoningSpec = {
  default_level: 'medium',
  supported_levels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
};

/** 内存缓存以减少重复 IPC 请求 */
const reasoningSpecCache = new Map<string, ModelReasoningSpec>();

/** 清理缓存（供测试或重新拉取使用） */
export function clearModelReasoningCache(): void {
  reasoningSpecCache.clear();
}

/**
 * 将后端返回的 levels 字符串列表映射为前端下拉框 SelectOption 对象
 */
export function mapReasoningLevelsToOptions(
  levels?: string[] | null
): typeof REASONING_EFFORT_OPTIONS {
  if (!Array.isArray(levels) || levels.length === 0) {
    return REASONING_EFFORT_OPTIONS;
  }
  const optionMap = new Map(REASONING_EFFORT_OPTIONS.map((opt) => [opt.value, opt]));
  const matched = levels
    .map((level) => optionMap.get(level))
    .filter((opt): opt is (typeof REASONING_EFFORT_OPTIONS)[number] => Boolean(opt));

  return matched.length > 0 ? matched : REASONING_EFFORT_OPTIONS;
}

/**
 * 从后端（单一事实来源）查询指定模型的思考强度规格
 * 支持内存缓存与异常降级
 */
export async function fetchModelReasoningSpec(
  slug?: string | null
): Promise<ModelReasoningSpec> {
  const normalizedKey = (slug || '').trim().toLowerCase();
  if (!normalizedKey) {
    return DEFAULT_REASONING_SPEC;
  }

  if (reasoningSpecCache.has(normalizedKey)) {
    return reasoningSpecCache.get(normalizedKey)!;
  }

  try {
    const spec = await invokeCommand<ModelReasoningSpec>('get_model_reasoning_spec', {
      slug: normalizedKey,
    });
    if (spec && Array.isArray(spec.supported_levels) && spec.supported_levels.length > 0) {
      reasoningSpecCache.set(normalizedKey, spec);
      return spec;
    }
    return DEFAULT_REASONING_SPEC;
  } catch (error) {
    console.warn(`[ModelReasoning] 查询模型 ${slug} 思考强度规格失败，使用默认规格:`, error);
    return DEFAULT_REASONING_SPEC;
  }
}

