import { computed, ref } from 'vue';
import type { ConfigFormPayload, PresetConfig, PresetFormData } from '../types/config';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
  normalizeUrl,
} from '../utils/format';
import { useCodexConfig } from './useCodexConfig';
import { useConfirm } from './useConfirm';
import { usePresets } from './usePresets';
import { useSettings } from './useSettings';
import { useToast } from './useToast';

export function useAppWorkflow() {
  const { currentConfig, isLoading, loadConfig, saveConfig, restoreDefault } = useCodexConfig();
  const { presets, loadPresets, saveOrUpdatePreset, deletePreset, isPresetActive } = usePresets();
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
  });

  const handleSaveCurrentConfig = (data: ConfigFormPayload) => {
    return saveConfig(data.key, data.providerUrl, toSavePayload(data));
  };

  const handleApplyPreset = async (preset: PresetConfig) => {
    if (!preset.key.trim()) {
      showToast(`「${preset.name}」尚未填写 Key，请先编辑填写`, 'warning');
      handleEditPreset(preset);
      return;
    }
    const success = await saveConfig(preset.key, preset.provider_url, {
      model: preset.model ?? '',
      modelReasoningEffort: preset.model_reasoning_effort ?? '',
      modelDisplayName: preset.model_display_name ?? '',
    });
    if (success) {
      showToast(`已快捷切换至「${preset.name}」并生效，请重新打开 Codex`);
    }
  };

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

  const handleSaveAsPreset = (data: ConfigFormPayload) => {
    if (!data.key.trim()) {
      showToast('请先在上方输入 API Key', 'error');
      return;
    }

    const trimmedKey = data.key.trim();
    const normalizedInputUrl = normalizeUrl(data.providerUrl);

    const matched = presets.value.find(
      (p) => p.key.trim() === trimmedKey && normalizeUrl(p.provider_url) === normalizedInputUrl
    );

    if (matched) {
      modalTitle.value = '编辑配置';
      modalInitialData.value = {
        id: matched.id,
        name: matched.name,
        provider_url: isDefaultStation(matched.provider_url)
          ? DEFAULT_STATION_URL
          : matched.provider_url,
        key: matched.key,
        model: data.model !== undefined ? data.model : matched.model,
        model_reasoning_effort:
          data.modelReasoningEffort !== undefined
            ? data.modelReasoningEffort
            : matched.model_reasoning_effort,
        model_display_name:
          data.modelDisplayName !== undefined ? data.modelDisplayName : matched.model_display_name,
      };
    } else {
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
        model_display_name: data.modelDisplayName || '',
      };
    }
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
      model_display_name: preset.model_display_name || '',
    };
    isModalVisible.value = true;
  };

  const handleModalSave = async (formData: PresetFormData) => {
    const success = await saveOrUpdatePreset(formData);
    if (success) {
      isModalVisible.value = false;
    }
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
    handleApplyPreset,
    handleRestoreDefault,
    handleLaunchApp,
    handleSaveAsPreset,
    handleAddPreset,
    handleEditPreset,
    handleModalSave,
    deletePreset,
    bootstrap,
  };
}
