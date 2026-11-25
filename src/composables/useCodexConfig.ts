import { reactive, ref } from 'vue';
import type { CodexConfig, SaveConfigPayload } from '../types/config';
import { normalizePositiveInt, normalizeUrl } from '../utils/format';
import { cloneModelAliases, migrateLegacyDisplayName, normalizeModelAliases } from '../utils/modelAliases';
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
    model_aliases: [],
    model_context_window: null,
    model_auto_compact_token_limit: null,
  };
}

const currentConfig = reactive<CodexConfig>(createEmptyConfig());
const isLoading = ref<boolean>(false);

function hydrateConfig(source: Partial<CodexConfig> | null | undefined) {
  if (!source) return;
  currentConfig.key = source.key || '';
  currentConfig.provider_url = normalizeUrl(source.provider_url || '');
  currentConfig.is_enabled = source.is_enabled ?? false;
  currentConfig.model = source.model || '';
  currentConfig.model_reasoning_effort = source.model_reasoning_effort || '';
  currentConfig.model_aliases = migrateLegacyDisplayName(
    source.model_aliases,
    source.model,
    source.model_display_name
  );
  const activeAlias = currentConfig.model_aliases.find(
    (item) => item.slug === (currentConfig.model || '').trim()
  );
  currentConfig.model_display_name = activeAlias?.display_name || source.model_display_name || '';
  currentConfig.model_context_window = normalizePositiveInt(source.model_context_window);
  currentConfig.model_auto_compact_token_limit = normalizePositiveInt(
    source.model_auto_compact_token_limit
  );
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

    // 统一规范化为可写入 config.toml 的 base_url，保存与启动 Codex 共用同一份值
    const normalizedUrl = normalizeUrl(trimmedUrl);

    const model = payload?.model;
    const modelReasoningEffort = payload?.modelReasoningEffort;
    const modelDisplayName = payload?.modelDisplayName;
    const modelAliases =
      payload?.modelAliases !== undefined ? normalizeModelAliases(payload.modelAliases) : undefined;
    const modelContextWindow = payload?.modelContextWindow;
    const modelAutoCompactTokenLimit = payload?.modelAutoCompactTokenLimit;

    if (
      modelContextWindow !== undefined &&
      modelContextWindow !== null &&
      normalizePositiveInt(modelContextWindow) === null
    ) {
      showToast('上下文窗口必须为大于 0 的整数', 'error');
      return false;
    }
    if (
      modelAutoCompactTokenLimit !== undefined &&
      modelAutoCompactTokenLimit !== null &&
      normalizePositiveInt(modelAutoCompactTokenLimit) === null
    ) {
      showToast('自动压缩阈值必须为大于 0 的整数', 'error');
      return false;
    }

    const normalizedContextWindow =
      modelContextWindow !== undefined ? normalizePositiveInt(modelContextWindow) : undefined;
    const normalizedAutoCompactLimit =
      modelAutoCompactTokenLimit !== undefined
        ? normalizePositiveInt(modelAutoCompactTokenLimit)
        : undefined;

    if (
      normalizedContextWindow !== undefined &&
      normalizedContextWindow !== null &&
      normalizedAutoCompactLimit !== undefined &&
      normalizedAutoCompactLimit !== null &&
      normalizedAutoCompactLimit > normalizedContextWindow
    ) {
      showToast('自动压缩阈值不能超过上下文窗口', 'error');
      return false;
    }

    try {
      if (isTauriEnv()) {
        await invokeCommand('save_codex_config', {
          key: trimmedKey,
          providerUrl: normalizedUrl,
          model: model !== undefined ? model.trim() : undefined,
          modelReasoningEffort:
            modelReasoningEffort !== undefined ? modelReasoningEffort.trim() : undefined,
          modelDisplayName: modelDisplayName !== undefined ? modelDisplayName.trim() : undefined,
          modelAliases,
          modelContextWindow:
            normalizedContextWindow !== undefined
              ? normalizedContextWindow === null
                ? ''
                : String(normalizedContextWindow)
              : undefined,
          modelAutoCompactTokenLimit:
            normalizedAutoCompactLimit !== undefined
              ? normalizedAutoCompactLimit === null
                ? ''
                : String(normalizedAutoCompactLimit)
              : undefined,
        });
      }

      currentConfig.key = trimmedKey;
      currentConfig.provider_url = normalizedUrl;
      currentConfig.is_enabled = true;
      if (model !== undefined) {
        currentConfig.model = model.trim();
      }
      if (modelReasoningEffort !== undefined) {
        currentConfig.model_reasoning_effort = modelReasoningEffort.trim();
      }
      if (modelAliases !== undefined) {
        currentConfig.model_aliases = cloneModelAliases(modelAliases);
        const activeSlug = (currentConfig.model || '').trim();
        currentConfig.model_display_name =
          modelAliases.find((item) => item.slug === activeSlug)?.display_name || '';
      } else if (modelDisplayName !== undefined) {
        currentConfig.model_display_name = modelDisplayName.trim();
      }
      if (normalizedContextWindow !== undefined) {
        currentConfig.model_context_window = normalizedContextWindow;
      }
      if (normalizedAutoCompactLimit !== undefined) {
        currentConfig.model_auto_compact_token_limit = normalizedAutoCompactLimit;
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
