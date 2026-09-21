import type { CodexConfig, PresetConfig } from '../types/config';
import { normalizeUrl } from './format';

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
