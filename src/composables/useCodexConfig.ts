import { reactive, ref } from 'vue';
import type { CodexConfig, SaveConfigPayload } from '../types/config';
import { normalizeUrl } from '../utils/format';
import {
  invokeCommand,
  isTauriEnv,
  readLocalJson,
  removeLocalJson,
  writeLocalJson,
} from '../utils/hybridStorage';
import { useToast } from './useToast';

const CODEX_CONFIG_STORAGE_KEY = 'codex_current_config';

function createEmptyConfig(): CodexConfig {
  return {
    key: '',
    provider_url: '',
    is_enabled: false,
    model: '',
    model_reasoning_effort: '',
    model_display_name: '',
  };
}

const currentConfig = reactive<CodexConfig>(createEmptyConfig());
const isLoading = ref<boolean>(false);

function hydrateConfig(source: Partial<CodexConfig>) {
  currentConfig.key = source.key || '';
  currentConfig.provider_url = normalizeUrl(source.provider_url || '');
  currentConfig.is_enabled = source.is_enabled ?? false;
  currentConfig.model = source.model || '';
  currentConfig.model_reasoning_effort = source.model_reasoning_effort || '';
  currentConfig.model_display_name = source.model_display_name || '';
}

export function resetCodexConfigState() {
  hydrateConfig(createEmptyConfig());
  isLoading.value = false;
}

export function useCodexConfig() {
  const { showToast } = useToast();

  const loadConfig = async () => {
    isLoading.value = true;
    try {
      if (isTauriEnv()) {
        const config = await invokeCommand<CodexConfig>('get_codex_config');
        hydrateConfig(config);
      } else {
        const local = readLocalJson<CodexConfig>(CODEX_CONFIG_STORAGE_KEY);
        if (local) {
          hydrateConfig(local);
        }
      }
    } catch (err) {
      console.warn('从后端加载配置失败，使用本地兜底:', err);
      const local = readLocalJson<CodexConfig>(CODEX_CONFIG_STORAGE_KEY);
      if (local) {
        hydrateConfig(local);
      } else {
        currentConfig.is_enabled = false;
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存当前配置并生效
   * payload 中未提供的字段不会写入 config.toml，保持原值不变
   */
  const saveConfig = async (
    key: string,
    providerUrl: string,
    payload?: SaveConfigPayload,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    const trimmedKey = key.trim();
    const trimmedUrl = providerUrl.trim();

    if (!trimmedKey || !trimmedUrl) {
      showToast('Key 和模型提供商不能为空', 'error');
      return false;
    }

    const model = payload?.model;
    const modelReasoningEffort = payload?.modelReasoningEffort;
    const modelDisplayName = payload?.modelDisplayName;

    try {
      if (isTauriEnv()) {
        await invokeCommand('save_codex_config', {
          key: trimmedKey,
          providerUrl: trimmedUrl,
          model: model !== undefined ? model.trim() : undefined,
          modelReasoningEffort:
            modelReasoningEffort !== undefined ? modelReasoningEffort.trim() : undefined,
          modelDisplayName: modelDisplayName !== undefined ? modelDisplayName.trim() : undefined,
        });
      }

      currentConfig.key = trimmedKey;
      currentConfig.provider_url = normalizeUrl(trimmedUrl);
      currentConfig.is_enabled = true;
      if (model !== undefined) {
        currentConfig.model = model.trim();
      }
      if (modelReasoningEffort !== undefined) {
        currentConfig.model_reasoning_effort = modelReasoningEffort.trim();
      }
      if (modelDisplayName !== undefined) {
        currentConfig.model_display_name = modelDisplayName.trim();
      }

      writeLocalJson(CODEX_CONFIG_STORAGE_KEY, currentConfig);
      if (!options?.silent) {
        showToast('配置保存成功，请重启 Codex 以使用新配置');
      }
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
        await invokeCommand('save_codex_model', { model: trimmedModel });
      }

      currentConfig.model = trimmedModel;
      writeLocalJson(CODEX_CONFIG_STORAGE_KEY, currentConfig);

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
   * 保存指定思考强度配置
   */
  const saveReasoningEffort = async (effort: string): Promise<boolean> => {
    try {
      const trimmedEffort = effort.trim();
      if (isTauriEnv()) {
        await invokeCommand('save_codex_reasoning_effort', { reasoningEffort: trimmedEffort });
      }

      currentConfig.model_reasoning_effort = trimmedEffort;
      writeLocalJson(CODEX_CONFIG_STORAGE_KEY, currentConfig);

      if (trimmedEffort) {
        showToast(`已成功指定思考强度「${trimmedEffort}」`);
      } else {
        showToast('已清空思考强度，将使用模型默认强度');
      }
      return true;
    } catch (err) {
      showToast(`保存思考强度失败: ${err}`, 'error');
      return false;
    }
  };

  /**
   * 恢复 Codex 官方默认配置
   */
  const restoreDefault = async (): Promise<boolean> => {
    try {
      if (isTauriEnv()) {
        await invokeCommand('restore_codex_default');
      }
      hydrateConfig(createEmptyConfig());
      removeLocalJson(CODEX_CONFIG_STORAGE_KEY);
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
    saveReasoningEffort,
    restoreDefault,
  };
}
