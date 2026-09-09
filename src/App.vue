<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import CurrentConfigCard from './components/CurrentConfigCard.vue';
import PresetListModal from './components/PresetListModal.vue';
import PresetModal from './components/PresetModal.vue';
import ToastMessage from './components/ToastMessage.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import SettingsModal from './components/settings/SettingsModal.vue';

import { useCodexConfig } from './composables/useCodexConfig';
import { usePresets } from './composables/usePresets';
import { useSettings } from './composables/useSettings';
import { useToast } from './composables/useToast';
import { useConfirm } from './composables/useConfirm';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
} from './utils/format';
import { APP_VERSION } from './constants/version';
import type { PresetConfig, PresetFormData } from './types/config';

const {
  currentConfig,
  isLoading,
  loadConfig,
  saveConfig,
  restoreDefault,
} = useCodexConfig();
const { presets, loadPresets, saveOrUpdatePreset, deletePreset, isPresetActive } = usePresets();
const { isLaunching, launchApp, loadSettings } = useSettings();
const { showToast } = useToast();
const { showConfirm } = useConfirm();

// 全屏系统设置弹窗状态
const isSettingsModalVisible = ref<boolean>(false);

// 预设配置管理弹窗状态
const isPresetListModalVisible = ref<boolean>(false);

// 新增 / 编辑预设表单弹窗状态
const isModalVisible = ref<boolean>(false);
const modalTitle = ref<string>('新增中转站配置');
const modalInitialData = ref<PresetFormData | null>(null);

// 计算当前匹配的生效预设
const activePreset = computed(() => {
  return presets.value.find((p) => isPresetActive(p, currentConfig));
});

// 快捷使用预设
const handleApplyPreset = async (preset: PresetConfig) => {
  if (!preset.key.trim()) {
    showToast(`「${preset.name}」尚未填写 Key，请先编辑填写`, 'warning');
    handleEditPreset(preset);
    return;
  }
  const success = await saveConfig(preset.key, preset.provider_url, preset.model);
  if (success) {
    showToast(`已快捷切换至「${preset.name}」并生效，请重新打开 Codex`);
  }
};

// 恢复官方默认配置二次确认
const handleRestoreDefault = async () => {
  const confirmed = await showConfirm({
    title: '恢复官方默认配置',
    message: '确定要恢复为 Codex 官方默认设置吗？',
    detail: '当前的自定义中转站地址和 API Key 将被重置为官方默认设置。',
    type: 'warning',
    confirmText: '恢复默认',
    cancelText: '取消',
  });
  if (confirmed) {
    await restoreDefault();
  }
};

// 当前配置卡片点击“保存配置”
const handleSaveAsPreset = (data: { key: string; providerUrl: string; model?: string }) => {
  if (!data.key.trim()) {
    showToast('请先在上方输入 API Key', 'error');
    return;
  }

  const isDefault = isDefaultStation(data.providerUrl);
  modalTitle.value = '新增中转站配置';
  modalInitialData.value = {
    name: isDefault ? `${DEFAULT_STATION_NAME} 常用配置` : (data.providerUrl ? '中转站配置' : ''),
    provider_url: isDefault ? DEFAULT_STATION_URL : (data.providerUrl || ''),
    key: data.key,
    model: data.model || '',
  };
  isModalVisible.value = true;
};

// 打开新增预设弹窗
const handleAddPreset = () => {
  modalTitle.value = '新增中转站配置';
  modalInitialData.value = null;
  isModalVisible.value = true;
};

// 打开编辑预设弹窗
const handleEditPreset = (preset: PresetConfig) => {
  modalTitle.value = '编辑中转站配置';
  modalInitialData.value = {
    id: preset.id,
    name: preset.name,
    provider_url: isDefaultStation(preset.provider_url) ? DEFAULT_STATION_URL : preset.provider_url,
    key: preset.key,
    model: preset.model || '',
  };
  isModalVisible.value = true;
};

// 提交预设模态框保存
const handleModalSave = async (formData: PresetFormData) => {
  const success = await saveOrUpdatePreset(formData);
  if (success) {
    isModalVisible.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadConfig(), loadPresets(), loadSettings()]);
});
</script>

<template>
  <div class="app-container">
    <!-- 头部区域 -->
    <AppHeader
      :is-enabled="currentConfig.is_enabled"
      :is-launching="isLaunching"
      @launch-app="launchApp"
      @open-settings="isSettingsModalVisible = true"
    />

    <!-- 主体区域 -->
    <main class="app-main">
      <!-- 当前生效配置卡片 -->
      <CurrentConfigCard
        :config="currentConfig"
        :is-loading="isLoading"
        :presets-count="presets.length"
        :active-preset-name="activePreset?.name"
        @save-config="(data) => saveConfig(data.key, data.providerUrl, data.model)"
        @restore-default="handleRestoreDefault"
        @save-as-preset="handleSaveAsPreset"
        @open-presets="isPresetListModalVisible = true"
        @open-settings="isSettingsModalVisible = true"
      />
    </main>

    <!-- 右下角版本号展示 -->
    <span class="app-version" :title="`当前版本: ${APP_VERSION}`">{{ APP_VERSION }}</span>

    <!-- 顶部 Toast 提示 -->
    <ToastMessage />

    <!-- 通用操作确认弹窗 -->
    <ConfirmModal />

    <!-- 全屏系统设置弹窗 -->
    <SettingsModal
      :visible="isSettingsModalVisible"
      :custom-model="currentConfig.model"
      @update:custom-model="(m) => currentConfig.model = m"
      @close="isSettingsModalVisible = false"
    />

    <!-- 中转站预设配置列表轻量弹窗 -->
    <PresetListModal
      :visible="isPresetListModalVisible"
      :presets="presets"
      :current-config="currentConfig"
      @close="isPresetListModalVisible = false"
      @add-preset="handleAddPreset"
      @edit-preset="handleEditPreset"
      @delete-preset="deletePreset"
      @apply-preset="handleApplyPreset"
    />

    <!-- 新增 / 编辑预设表单模态框 -->
    <PresetModal
      :visible="isModalVisible"
      :title="modalTitle"
      :initial-data="modalInitialData"
      @close="isModalVisible = false"
      @save="handleModalSave"
    />
  </div>
</template>

<style lang="scss" scoped>
@use './styles/variables' as *;
@use './styles/mixins' as *;

.app-container {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 14px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.app-version {
  position: fixed;
  right: 14px;
  bottom: 3px;
  font-size: 10px;
  line-height: 1;
  font-family: $font-family-mono;
  color: rgba(255, 255, 255, 0.22);
  user-select: none;
  cursor: default;
  letter-spacing: 0.4px;
  z-index: 10;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
