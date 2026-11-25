import { computed, ref } from 'vue';
import type { ConfigFormPayload, PresetConfig, PresetFormData } from '../types/config';
import { cloneModelAliases, migrateLegacyDisplayName } from '../utils/modelAliases';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
  normalizePositiveInt,
} from '../utils/format';
import { matchesPresetIdentity } from '../utils/preset';
import { useCodexConfig } from './useCodexConfig';
import { useConfirm } from './useConfirm';
import { usePresets } from './usePresets';
import { useSettings } from './useSettings';
import { useToast } from './useToast';

export function useAppWorkflow() {
  const { currentConfig, isLoading, loadConfig, saveConfig, restoreDefault } = useCodexConfig();
  const { presets, loadPresets, saveOrUpdatePreset, deletePreset, isPresetActive, reorderPresets } =
    usePresets();
  const { settings, detectedPath, detectPath, isLaunching, launchApp, loadSettings } = useSettings();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const isSettingsModalVisible = ref<boolean>(false);
  const isPresetListModalVisible = ref<boolean>(false);
  const isModalVisible = ref<boolean>(false);
  const modalTitle = ref<string>('新增中转站配置');
  const modalInitialData = ref<PresetFormData | null>(null);

  const activePreset = computed(() => {
    return presets.value.find((p) => isPresetActive(p, currentConfig));
  });

  const toSavePayload = (data: ConfigFormPayload) => ({
    model: data.model,
    modelReasoningEffort: data.modelReasoningEffort,
    modelDisplayName: data.modelDisplayName,
    modelAliases: data.modelAliases,
    modelContextWindow: data.modelContextWindow,
    modelAutoCompactTokenLimit: data.modelAutoCompactTokenLimit,
  });

  const handleSaveCurrentConfig = (data: ConfigFormPayload) => {
    return saveConfig(data.key, data.providerUrl, toSavePayload(data));
  };

  const applyPreset = async (preset: PresetConfig, closeModal: boolean) => {
    if (!preset.key.trim()) {
      showToast(`「${preset.name}」尚未填写 Key，请先编辑填写`, 'warning');
      handleEditPreset(preset);
      return;
    }
    const success = await saveConfig(preset.key, preset.provider_url, {
      model: preset.model ?? '',
      modelReasoningEffort: preset.model_reasoning_effort ?? '',
      modelAliases: migrateLegacyDisplayName(
        preset.model_aliases,
        preset.model,
        preset.model_display_name
      ),
      modelContextWindow: normalizePositiveInt(preset.model_context_window),
      modelAutoCompactTokenLimit: normalizePositiveInt(preset.model_auto_compact_token_limit),
    });
    if (success) {
      if (closeModal) {
        isPresetListModalVisible.value = false;
      }
      showToast(`已快捷切换至「${preset.name}」并生效，请重新打开 Codex`);
    }
  };

  const handleSelectPreset = (preset: PresetConfig) => applyPreset(preset, false);

  const handleApplyPreset = (preset: PresetConfig) => applyPreset(preset, true);

  const handleRestoreDefault = async () => {
    const confirmed = await showConfirm({
      title: '恢复官方默认配置',
      message: '确定要恢复为 Codex 官方默认设置吗？',
      detail: '当前的自定义中转站地址和 API Key 将被清除，恢复后将变成使用账号登录。',
      type: 'warning',
      confirmText: '恢复默认',
      cancelText: '取消',
    });
    if (confirmed) {
      await restoreDefault();
    }
  };

  const handleLaunchApp = async (data?: ConfigFormPayload) => {
    if (isLaunching.value) return;

    const targetPath =
      settings.value.codex_path?.trim() || detectedPath.value || (await detectPath());

    if (!targetPath) {
      showToast('未检测到 Codex 安装路径，请前往设置中进行配置', 'warning');
      const confirmed = await showConfirm({
        title: '未检测到应用路径',
        message: '未检测到 Codex 安装路径，请前往设置中进行配置',
        detail: '未能自动检测到 ChatGPT / Codex 安装位置。是否前往系统设置配置应用路径？',
        type: 'warning',
        confirmText: '前往设置',
        cancelText: '取消',
      });
      if (confirmed) {
        isSettingsModalVisible.value = true;
      }
      return;
    }

    if (data) {
      const trimmedKey = data.key.trim();
      const trimmedUrl = data.providerUrl.trim();

      if (!trimmedKey && !trimmedUrl && !currentConfig.is_enabled) {
        await launchApp();
        return;
      }

      const saveSuccess = await saveConfig(data.key, data.providerUrl, toSavePayload(data), {
        silent: true,
      });
      if (!saveSuccess) {
        return;
      }
    }

    await launchApp();
  };

  const handleSaveAsPreset = async (data: ConfigFormPayload) => {
    if (!data.key.trim()) {
      showToast('请先在上方输入 API Key', 'error');
      return;
    }

    const matched = presets.value.find((p) =>
      matchesPresetIdentity(p, data.key, data.providerUrl)
    );

    if (matched) {
      await saveOrUpdatePreset({
        id: matched.id,
        name: matched.name,
        provider_url: isDefaultStation(matched.provider_url)
          ? DEFAULT_STATION_URL
          : matched.provider_url,
        key: data.key,
        model: data.model !== undefined ? data.model : matched.model,
        model_reasoning_effort:
          data.modelReasoningEffort !== undefined
            ? data.modelReasoningEffort
            : matched.model_reasoning_effort,
        model_aliases:
          data.modelAliases !== undefined
            ? cloneModelAliases(data.modelAliases)
            : migrateLegacyDisplayName(
                matched.model_aliases,
                matched.model,
                matched.model_display_name
              ),
        model_context_window:
          data.modelContextWindow !== undefined
            ? normalizePositiveInt(data.modelContextWindow)
            : normalizePositiveInt(matched.model_context_window),
        model_auto_compact_token_limit:
          data.modelAutoCompactTokenLimit !== undefined
            ? normalizePositiveInt(data.modelAutoCompactTokenLimit)
            : normalizePositiveInt(matched.model_auto_compact_token_limit),
      });
      return;
    }

    const isDefault = isDefaultStation(data.providerUrl);
    modalTitle.value = '新增中转站配置';
    modalInitialData.value = {
      name: isDefault
        ? `${DEFAULT_STATION_NAME} 常用配置`
        : data.providerUrl
          ? '中转站配置'
          : '',
      provider_url: isDefault ? DEFAULT_STATION_URL : data.providerUrl || '',
      key: data.key,
      model: data.model || '',
      model_reasoning_effort: data.modelReasoningEffort || '',
      model_aliases: cloneModelAliases(data.modelAliases),
      model_context_window: normalizePositiveInt(data.modelContextWindow),
      model_auto_compact_token_limit: normalizePositiveInt(data.modelAutoCompactTokenLimit),
    };
    isModalVisible.value = true;
  };

  const handleAddPreset = () => {
    modalTitle.value = '新增中转站配置';
    modalInitialData.value = null;
    isModalVisible.value = true;
  };

  const handleEditPreset = (preset: PresetConfig) => {
    modalTitle.value = '编辑中转站配置';
    modalInitialData.value = {
      id: preset.id,
      name: preset.name,
      provider_url: isDefaultStation(preset.provider_url)
        ? DEFAULT_STATION_URL
        : preset.provider_url,
      key: preset.key,
      model: preset.model || '',
      model_reasoning_effort: preset.model_reasoning_effort || '',
      model_aliases: migrateLegacyDisplayName(
        preset.model_aliases,
        preset.model,
        preset.model_display_name
      ),
      model_context_window: normalizePositiveInt(preset.model_context_window),
      model_auto_compact_token_limit: normalizePositiveInt(preset.model_auto_compact_token_limit),
    };
    isModalVisible.value = true;
  };

  const handleModalSave = async (formData: PresetFormData) => {
    const success = await saveOrUpdatePreset(formData);
    if (success) {
      isModalVisible.value = false;
    }
  };

  const handleReorderPresets = async (fromIndex: number, toIndex: number) => {
    return await reorderPresets(fromIndex, toIndex);
  };

  const bootstrap = async () => {
    await Promise.all([loadConfig(), loadPresets(), loadSettings()]);
  };

  return {
    currentConfig,
    isLoading,
    presets,
    isLaunching,
    activePreset,
    isSettingsModalVisible,
    isPresetListModalVisible,
    isModalVisible,
    modalTitle,
    modalInitialData,
    handleSaveCurrentConfig,
    handleSelectPreset,
    handleApplyPreset,
    handleRestoreDefault,
    handleLaunchApp,
    handleSaveAsPreset,
    handleAddPreset,
    handleEditPreset,
    handleModalSave,
    handleReorderPresets,
    deletePreset,
    bootstrap,
  };
}
