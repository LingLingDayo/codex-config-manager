import { ref } from 'vue';
import type { CodexConfig, PresetConfig, PresetFormData } from '../types/config';
import {
  normalizeUrl,
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
} from '../utils/format';
import { invokeCommand, readLocalJson, writeLocalJson } from '../utils/hybridStorage';
import { useToast } from './useToast';
import { useConfirm } from './useConfirm';

const PRESETS_STORAGE_KEY = 'codex_presets';

export const DEFAULT_PRESETS: PresetConfig[] = [
  {
    id: 'preset_default_station',
    name: `${DEFAULT_STATION_NAME} (推荐)`,
    provider_url: DEFAULT_STATION_URL,
    key: '',
    model: '',
    model_reasoning_effort: '',
    model_display_name: '',
    updated_at: Date.now(),
  },
];

const presets = ref<PresetConfig[]>([]);
const isPresetsLoading = ref<boolean>(false);

export function resetPresetsState() {
  presets.value = [];
  isPresetsLoading.value = false;
}

export function isPresetActive(preset: PresetConfig, currentConfig: CodexConfig): boolean {
  if (!currentConfig.is_enabled) return false;
  if (!currentConfig.key || !preset.key) return false;
  return (
    preset.key.trim() === currentConfig.key.trim() &&
    normalizeUrl(preset.provider_url) === normalizeUrl(currentConfig.provider_url)
  );
}

export function usePresets() {
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const normalizePresetList = (list: PresetConfig[]): PresetConfig[] => {
    return list.map((p) => {
      if (isDefaultStation(p.provider_url) && p.provider_url !== DEFAULT_STATION_URL) {
        return { ...p, provider_url: DEFAULT_STATION_URL };
      }
      return p;
    });
  };

  /**
   * 从后端/本地存储加载预设
   */
  const loadPresets = async () => {
    isPresetsLoading.value = true;
    try {
      const backendPresets = await invokeCommand<PresetConfig[]>('get_presets');
      if (Array.isArray(backendPresets)) {
        presets.value = normalizePresetList(backendPresets);
      } else {
        const localData = readLocalJson<PresetConfig[]>(PRESETS_STORAGE_KEY);
        if (localData) {
          presets.value = normalizePresetList(localData);
          await invokeCommand('save_presets', { presets: presets.value }).catch(() => {});
        } else {
          presets.value = DEFAULT_PRESETS;
          await persistPresets(DEFAULT_PRESETS);
        }
      }
    } catch (e) {
      console.warn('从后端读取预设失败，尝试从本地缓存读取', e);
      const localData = readLocalJson<PresetConfig[]>(PRESETS_STORAGE_KEY);
      presets.value = localData ? normalizePresetList(localData) : DEFAULT_PRESETS;
    } finally {
      isPresetsLoading.value = false;
    }
  };

  /**
   * 持久化保存预设列表
   */
  const persistPresets = async (newList: PresetConfig[]) => {
    presets.value = newList;
    writeLocalJson(PRESETS_STORAGE_KEY, newList);
    try {
      await invokeCommand('save_presets', { presets: newList });
    } catch (e) {
      console.error('保存预设到后端失败:', e);
    }
  };

  /**
   * 保存或更新预设
   */
  const saveOrUpdatePreset = async (data: PresetFormData): Promise<boolean> => {
    const name = data.name.trim();
    const providerUrl = data.provider_url.trim();
    const key = data.key.trim();

    if (!name || !providerUrl || !key) {
      showToast('请填写完整的配置信息', 'error');
      return false;
    }

    const currentList = [...presets.value];
    if (data.id) {
      const index = currentList.findIndex((p) => p.id === data.id);
      if (index !== -1) {
        currentList[index] = {
          ...currentList[index],
          name,
          provider_url: providerUrl,
          key,
          model: data.model !== undefined ? data.model.trim() : currentList[index].model,
          model_reasoning_effort:
            data.model_reasoning_effort !== undefined
              ? data.model_reasoning_effort.trim()
              : currentList[index].model_reasoning_effort,
          model_display_name:
            data.model_display_name !== undefined
              ? data.model_display_name.trim()
              : currentList[index].model_display_name,
          updated_at: Date.now(),
        };
        showToast(`配置「${name}」已更新！`);
      }
    } else {
      const newPreset: PresetConfig = {
        id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name,
        provider_url: providerUrl,
        key,
        model: data.model ? data.model.trim() : '',
        model_reasoning_effort: data.model_reasoning_effort ? data.model_reasoning_effort.trim() : '',
        model_display_name: data.model_display_name ? data.model_display_name.trim() : '',
        updated_at: Date.now(),
      };
      currentList.unshift(newPreset);
      showToast(`已添加新配置「${name}」！`);
    }

    await persistPresets(currentList);
    return true;
  };

  /**
   * 删除预设
   */
  const deletePreset = async (preset: PresetConfig): Promise<boolean> => {
    const confirmed = await showConfirm({
      title: '删除配置预设',
      message: `确定要删除配置预设「${preset.name}」吗？`,
      detail: '删除后此预设配置将无法找回，请谨慎操作。',
      type: 'danger',
      confirmText: '确认删除',
      cancelText: '取消',
    });
    if (!confirmed) return false;

    const newList = presets.value.filter((p) => p.id !== preset.id);
    await persistPresets(newList);
    showToast(`已删除预设「${preset.name}」`);
    return true;
  };

  return {
    presets,
    isPresetsLoading,
    loadPresets,
    saveOrUpdatePreset,
    deletePreset,
    isPresetActive,
  };
}
