import { reactive, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { CodexConfig } from '../types/config';
import { normalizeUrl } from '../utils/format';
import { useToast } from './useToast';

export function useCodexConfig() {
  const { showToast } = useToast();

  const currentConfig = reactive<CodexConfig>({
    key: '',
    provider_url: '',
    is_enabled: false,
  });

  const isLoading = ref<boolean>(false);

  /**
   * 从后端加载当前生效配置
   */
  const loadConfig = async () => {
    isLoading.value = true;
    try {
      const config = await invoke<CodexConfig>('get_codex_config');
      currentConfig.key = config.key || '';
      currentConfig.provider_url = normalizeUrl(config.provider_url) || '';
      currentConfig.is_enabled = config.is_enabled;
    } catch (err) {
      console.error('加载配置失败:', err);
      showToast(`加载配置失败: ${err}`, 'error');
      currentConfig.is_enabled = false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存当前配置并生效
   */
  const saveConfig = async (key: string, providerUrl: string): Promise<boolean> => {
    const trimmedKey = key.trim();
    const trimmedUrl = providerUrl.trim();

    if (!trimmedKey || !trimmedUrl) {
      showToast('Key 和模型提供商不能为空', 'error');
      return false;
    }

    try {
      await invoke('save_codex_config', {
        key: trimmedKey,
        providerUrl: trimmedUrl,
      });

      currentConfig.key = trimmedKey;
      currentConfig.provider_url = normalizeUrl(trimmedUrl);
      currentConfig.is_enabled = true;
      showToast('配置保存并启用成功！');
      return true;
    } catch (err) {
      showToast(`保存失败: ${err}`, 'error');
      return false;
    }
  };

  /**
   * 恢复 Codex 官方默认配置
   */
  const restoreDefault = async (): Promise<boolean> => {
    try {
      await invoke('restore_codex_default');
      currentConfig.key = '';
      currentConfig.provider_url = '';
      currentConfig.is_enabled = false;
      showToast('已成功恢复默认（已移除 API 登录）');
      return true;
    } catch (err) {
      showToast(`恢复默认失败: ${err}`, 'error');
      return false;
    }
  };

  return {
    currentConfig,
    isLoading,
    loadConfig,
    saveConfig,
    restoreDefault,
  };
}
