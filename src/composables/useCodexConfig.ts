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
    model: '',
  });

  const isLoading = ref<boolean>(false);

  const isTauriEnv = () => typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
  const CODEX_CONFIG_STORAGE_KEY = 'codex_current_config';

  /**
   * 从后端加载当前生效配置
   */
  const loadConfig = async () => {
    isLoading.value = true;
    try {
      if (isTauriEnv()) {
        const config = await invoke<CodexConfig>('get_codex_config');
        currentConfig.key = config.key || '';
        currentConfig.provider_url = normalizeUrl(config.provider_url) || '';
        currentConfig.is_enabled = config.is_enabled;
        currentConfig.model = config.model || '';
      } else {
        // 纯浏览器预览模式
        const local = localStorage.getItem(CODEX_CONFIG_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          currentConfig.key = parsed.key || '';
          currentConfig.provider_url = normalizeUrl(parsed.provider_url) || '';
          currentConfig.is_enabled = parsed.is_enabled ?? false;
          currentConfig.model = parsed.model || '';
        }
      }
    } catch (err) {
      console.warn('从后端加载配置失败，使用本地兜底:', err);
      const local = localStorage.getItem(CODEX_CONFIG_STORAGE_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          currentConfig.key = parsed.key || '';
          currentConfig.provider_url = normalizeUrl(parsed.provider_url) || '';
          currentConfig.is_enabled = parsed.is_enabled ?? false;
          currentConfig.model = parsed.model || '';
        } catch {
          currentConfig.is_enabled = false;
        }
      } else {
        currentConfig.is_enabled = false;
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存当前配置并生效
   */
  const saveConfig = async (
    key: string,
    providerUrl: string,
    model?: string
  ): Promise<boolean> => {
    const trimmedKey = key.trim();
    const trimmedUrl = providerUrl.trim();

    if (!trimmedKey || !trimmedUrl) {
      showToast('Key 和模型提供商不能为空', 'error');
      return false;
    }

    try {
      if (isTauriEnv()) {
        await invoke('save_codex_config', {
          key: trimmedKey,
          providerUrl: trimmedUrl,
          model: model !== undefined ? model.trim() : undefined,
        });
      }

      currentConfig.key = trimmedKey;
      currentConfig.provider_url = normalizeUrl(trimmedUrl);
      currentConfig.is_enabled = true;
      if (model !== undefined) {
        currentConfig.model = model.trim();
      }

      localStorage.setItem(CODEX_CONFIG_STORAGE_KEY, JSON.stringify(currentConfig));
      showToast('配置保存成功，请重启 Codex 以使用新配置');
      return true;
    } catch (err) {
      showToast(`保存失败: ${err}`, 'error');
      return false;
    }
  };

  /**
   * 保存指定自定义模型配置
   */
  const saveModel = async (modelName: string): Promise<boolean> => {
    try {
      const trimmedModel = modelName.trim();
      if (isTauriEnv()) {
        await invoke('save_codex_model', { model: trimmedModel });
      }

      currentConfig.model = trimmedModel;
      localStorage.setItem(CODEX_CONFIG_STORAGE_KEY, JSON.stringify(currentConfig));

      if (trimmedModel) {
        showToast(`已成功指定自定义模型「${trimmedModel}」`);
      } else {
        showToast('已清空自定义模型，将使用官方默认模型');
      }
      return true;
    } catch (err) {
      showToast(`保存模型设置失败: ${err}`, 'error');
      return false;
    }
  };

  /**
   * 恢复 Codex 官方默认配置
   */
  const restoreDefault = async (): Promise<boolean> => {
    try {
      if (isTauriEnv()) {
        await invoke('restore_codex_default');
      }
      currentConfig.key = '';
      currentConfig.provider_url = '';
      currentConfig.is_enabled = false;
      currentConfig.model = '';
      localStorage.removeItem(CODEX_CONFIG_STORAGE_KEY);
      showToast('已成功恢复默认（已移除 API 登录与自定义模型）');
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
    saveModel,
    restoreDefault,
  };
}
