import type { CodexConfig, ModelAlias, PresetConfig } from '../types/config';
import { normalizeUrl } from './format';
import {
  migrateLegacyDisplayName,
  modelAliasesEqual,
  normalizeModelAliases,
} from './modelAliases';

export interface PresetComparisonTarget {
  key: string;
  providerUrl: string;
  model?: string;
  modelReasoningEffort?: string;
  modelAliases?: ModelAlias[];
}

export function matchesPresetIdentity(
  preset: PresetConfig,
  key: string,
  providerUrl: string
): boolean {
  const trimmedKey = key.trim();
  const trimmedPresetKey = preset.key.trim();
  if (!trimmedKey || !trimmedPresetKey) return false;
  return (
    trimmedPresetKey === trimmedKey &&
    normalizeUrl(preset.provider_url) === normalizeUrl(providerUrl)
  );
}

export function isPresetActive(preset: PresetConfig, currentConfig: CodexConfig): boolean {
  if (!currentConfig.is_enabled) return false;
  return matchesPresetIdentity(preset, currentConfig.key, currentConfig.provider_url);
}

/**
 * 判断当前配置与已保存预设项的完整配置内容是否一致
 * 比较维度包含：Key、Provider URL、Model、Reasoning Effort、Model Aliases
 */
export function isPresetContentEqual(
  preset: PresetConfig,
  target: PresetComparisonTarget
): boolean {
  if (preset.key.trim() !== target.key.trim()) {
    return false;
  }
  if (normalizeUrl(preset.provider_url) !== normalizeUrl(target.providerUrl)) {
    return false;
  }
  if ((preset.model || '').trim() !== (target.model || '').trim()) {
    return false;
  }
  if (
    (preset.model_reasoning_effort || '').trim() !==
    (target.modelReasoningEffort || '').trim()
  ) {
    return false;
  }

  const targetAliases = normalizeModelAliases(target.modelAliases);
  const presetAliases = migrateLegacyDisplayName(
    preset.model_aliases,
    preset.model,
    preset.model_display_name
  );

  return modelAliasesEqual(targetAliases, presetAliases);
}
