import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { CodexConfig, PresetConfig, PresetFormData } from '../types/config';
import { normalizeUrl } from '../utils/format';
import { useToast } from './useToast';

const PRESETS_STORAGE_KEY = 'codex_presets';

export const DEFAULT_PRESETS: PresetConfig[] = [
  {
    id: 'preset_lingai_default',
    name: 'LingAI (推荐)',
    provider_url: 'LingAI',
    key: '',
    updated_at: Date.now(),
  },
];

export function usePresets() {
  const { showToast } = useToast();
  const presets = ref<PresetConfig[]>([]);
  const isPresetsLoading = ref<boolean>(false);

  /**
   * 从后端/本地存储加载预设
   */
  const loadPresets = async () => {
    isPresetsLoading.value = true;
    try {
      // 优先从 Rust 后端读取
      const backendPresets = await invoke<PresetConfig[]>('get_presets');
      if (backendPresets && Array.isArray(backendPresets) && backendPresets.length > 0) {
        presets.value = backendPresets;
      } else if (backendPresets && Array.isArray(backendPresets)) {
        presets.value = backendPresets;
      } else {
        // 降级从 localStorage 读取
        const localData = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (localData) {
          presets.value = JSON.parse(localData);
          // 同步回后端
          await invoke('save_presets', { presets: presets.value }).catch(() => {});
        } else {
          presets.value = DEFAULT_PRESETS;
          await persistPresets(DEFAULT_PRESETS);
        }
      }
    } catch (e) {
      console.warn('从后端读取预设失败，尝试从本地缓存读取', e);
      const localData = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (localData) {
        try {
          presets.value = JSON.parse(localData);
        } catch {
          presets.value = DEFAULT_PRESETS;
        }
      } else {
        presets.value = DEFAULT_PRESETS;
      }
    } finally {
      isPresetsLoading.value = false;
    }
  };

  /**
   * 持久化保存预设列表
   */
  const persistPresets = async (newList: PresetConfig[]) => {
    presets.value = newList;
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newList));
    try {
      await invoke('save_presets', { presets: newList });
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
      // 编辑已有预设
      const index = currentList.findIndex((p) => p.id === data.id);
      if (index !== -1) {
        currentList[index] = {
          ...currentList[index],
          name,
          provider_url: providerUrl,
          key,
          updated_at: Date.now(),
        };
        showToast(`配置「${name}」已更新！`);
      }
    } else {
      // 新增预设
      const newPreset: PresetConfig = {
        id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name,
        provider_url: providerUrl,
        key,
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
    const confirmed = window.confirm(`确定要删除配置预设「${preset.name}」吗？`);
    if (!confirmed) return false;

    const newList = presets.value.filter((p) => p.id !== preset.id);
    await persistPresets(newList);
    showToast(`已删除预设「${preset.name}」`);
    return true;
  };

  /**
   * 检查预设是否当前生效中
   */
  const isPresetActive = (preset: PresetConfig, currentConfig: CodexConfig): boolean => {
    if (!currentConfig.is_enabled) return false;
    if (!currentConfig.key || !preset.key) return false;
    return (
      preset.key.trim() === currentConfig.key.trim() &&
      normalizeUrl(preset.provider_url) === normalizeUrl(currentConfig.provider_url)
    );
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
