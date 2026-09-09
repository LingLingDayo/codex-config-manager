<script setup lang="ts">
import { ref, watch } from 'vue';
import ConfigCardHeader from './config/ConfigCardHeader.vue';
import ConfigCardActions from './config/ConfigCardActions.vue';
import ConfigDrawer from './ConfigDrawer.vue';
import type { CodexConfig } from '../types/config';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
} from '../utils/format';

const props = withDefaults(
  defineProps<{
    config: CodexConfig;
    isLoading: boolean;
    isLaunching?: boolean;
    presetsCount?: number;
    activePresetName?: string;
  }>(),
  {
    isLaunching: false,
    presetsCount: 0,
  }
);

const emit = defineEmits<{
  (e: 'save-config', data: { key: string; providerUrl: string; model?: string }): void;
  (e: 'restore-default'): void;
  (e: 'save-as-preset', data: { key: string; providerUrl: string; model?: string }): void;
  (e: 'open-presets'): void;
  (e: 'launch-app'): void;
}>();

const apiKey = ref<string>('');
const providerUrl = ref<string>('');
const customModel = ref<string>('');
const showKey = ref<boolean>(false);
const isConfigDrawerOpen = ref<boolean>(false);

const openConfigDrawer = () => {
  isConfigDrawerOpen.value = true;
};

const closeConfigDrawer = () => {
  isConfigDrawerOpen.value = false;
};

// 同步外部配置
watch(
  () => props.config,
  (newVal) => {
    apiKey.value = newVal.key;
    providerUrl.value = isDefaultStation(newVal.provider_url)
      ? DEFAULT_STATION_URL
      : newVal.provider_url;
    customModel.value = newVal.model || '';
  },
  { immediate: true, deep: true }
);

// 监听提供商输入框变化，自动映射特定地址
const handleProviderInput = () => {
  const trimmed = providerUrl.value.trim().replace(/\/+$/, '');
  if (
    trimmed.toLowerCase() === DEFAULT_STATION_NAME.toLowerCase() ||
    trimmed.toLowerCase() === 'lingai'
  ) {
    providerUrl.value = DEFAULT_STATION_URL;
  }
};

const handleSave = () => {
  emit('save-config', {
    key: apiKey.value,
    providerUrl: providerUrl.value,
    model: customModel.value,
  });
};

const handleRestore = () => {
  emit('restore-default');
};

const handleSaveAsPreset = () => {
  emit('save-as-preset', {
    key: apiKey.value,
    providerUrl: providerUrl.value,
    model: customModel.value,
  });
};
</script>

<template>
  <section class="card config-card">
    <!-- 卡片头部：标题、预设徽章、列表入口与保存预设入口 -->
    <ConfigCardHeader
      :active-preset-name="activePresetName"
      @open-presets="emit('open-presets')"
      @save-as-preset="handleSaveAsPreset"
    />

    <!-- 表单主体 -->
    <form class="config-form" @submit.prevent="handleSave">
      <div class="input-group">
        <label for="provider-url">模型提供商 (Base URL)</label>
        <input
          id="provider-url"
          v-model="providerUrl"
          type="text"
          :placeholder="`例如：${DEFAULT_STATION_URL} 或输入 '${DEFAULT_STATION_NAME}' 自动填充`"
          required
          autocomplete="off"
          @input="handleProviderInput"
        />
      </div>

      <div class="input-group">
        <div class="input-label-row">
          <label for="api-key">API Key</label>
        </div>
        <div class="password-wrapper">
          <input
            id="api-key"
            v-model="apiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="请输入您的 Bearer Token / Key"
            required
            autocomplete="off"
          />
          <button
            type="button"
            class="icon-button"
            :class="{ active: showKey }"
            title="显示/隐藏 Key"
            @click="showKey = !showKey"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 操作按钮栏 -->
      <ConfigCardActions
        :is-loading="isLoading"
        :is-launching="isLaunching"
        @launch="emit('launch-app')"
        @open-drawer="openConfigDrawer"
        @restore="handleRestore"
      />
    </form>

    <!-- 底部向上弹出 80% 高度更多配置抽屉 -->
    <ConfigDrawer
      :visible="isConfigDrawerOpen"
      v-model="customModel"
      @close="closeConfigDrawer"
    />
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.config-card {
  @include glass-card;
  padding: 14px 18px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  justify-content: space-between;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.78rem;
    font-weight: 600;
    color: $text-muted;
  }

  input[type='text'] {
    @include input-base;
    padding: 8px 12px;
  }
}

.password-wrapper {
  position: relative;
  width: 100%;

  input {
    @include input-base;
    padding: 8px 36px 8px 12px;
  }
}

.icon-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    color: $text-main;
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    color: $accent-blue;
  }
}
</style>
