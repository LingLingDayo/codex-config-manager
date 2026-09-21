<script setup lang="ts">
import { onMounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import CurrentConfigCard from './components/CurrentConfigCard.vue';
import PresetListModal from './components/PresetListModal.vue';
import PresetModal from './components/PresetModal.vue';
import ToastMessage from './components/ToastMessage.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import SettingsModal from './components/settings/SettingsModal.vue';

import { useAppWorkflow } from './composables/useAppWorkflow';
import { APP_VERSION } from './constants/version';

const {
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
} = useAppWorkflow();

onMounted(bootstrap);
</script>

<template>
  <div class="app-container">
    <!-- 头部区域 -->
    <AppHeader
      :is-enabled="currentConfig.is_enabled"
      @open-settings="isSettingsModalVisible = true"
    />

    <!-- 主体区域 -->
    <main class="app-main">
      <!-- 当前生效配置卡片 -->
      <CurrentConfigCard
        :config="currentConfig"
        :presets="presets"
        :is-loading="isLoading"
        :is-launching="isLaunching"
        :presets-count="presets.length"
        :active-preset-name="activePreset?.name"
        @save-config="handleSaveCurrentConfig"
        @restore-default="handleRestoreDefault"
        @save-as-preset="handleSaveAsPreset"
        @open-presets="isPresetListModalVisible = true"
        @launch-app="handleLaunchApp"
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
  bottom: 2px;
  font-size: 9px;
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
