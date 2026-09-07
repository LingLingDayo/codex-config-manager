<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import CurrentConfigCard from './components/CurrentConfigCard.vue';
import PresetListModal from './components/PresetListModal.vue';
import PresetModal from './components/PresetModal.vue';
import ToastMessage from './components/ToastMessage.vue';

import { useCodexConfig } from './composables/useCodexConfig';
import { usePresets } from './composables/usePresets';
import { useToast } from './composables/useToast';
import type { PresetConfig, PresetFormData } from './types/config';

const { currentConfig, isLoading, loadConfig, saveConfig, restoreDefault } = useCodexConfig();
const { presets, loadPresets, saveOrUpdatePreset, deletePreset, isPresetActive } = usePresets();
const { showToast } = useToast();

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
  const success = await saveConfig(preset.key, preset.provider_url);
  if (success) {
    showToast(`已快捷切换至「${preset.name}」并生效！`);
  }
};

// 当前配置卡片点击“存为预设”
const handleSaveAsPreset = (data: { key: string; providerUrl: string }) => {
  if (!data.key.trim()) {
    showToast('请先在上方输入 API Key', 'error');
    return;
  }

  modalTitle.value = '新增中转站配置';
  modalInitialData.value = {
    name: data.providerUrl === 'LingAI' ? 'LingAI 常用配置' : (data.providerUrl ? '中转站配置' : ''),
    provider_url: data.providerUrl || '',
    key: data.key,
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
    provider_url: preset.provider_url,
    key: preset.key,
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
  await Promise.all([loadConfig(), loadPresets()]);
});
</script>

<template>
  <div class="app-container">
    <!-- 头部区域 -->
    <AppHeader :is-enabled="currentConfig.is_enabled" />

    <!-- 主体区域 -->
    <main class="app-main">
      <!-- 当前生效配置卡片 -->
      <CurrentConfigCard
        :config="currentConfig"
        :is-loading="isLoading"
        :presets-count="presets.length"
        :active-preset-name="activePreset?.name"
        @save-config="(data) => saveConfig(data.key, data.providerUrl)"
        @restore-default="restoreDefault"
        @save-as-preset="handleSaveAsPreset"
        @open-presets="isPresetListModalVisible = true"
      />
    </main>

    <!-- 底部 Toast 提示 -->
    <ToastMessage />

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
  width: 100%;
  height: 100%;
  padding: 20px 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 14px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  @include custom-scrollbar;
}
</style>
