<script setup lang="ts">
import { ref, watch } from 'vue';
import SettingsDrawer from './SettingsDrawer.vue';
import type { CodexConfig } from '../types/config';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
} from '../utils/format';

const props = defineProps<{
  config: CodexConfig;
  isLoading: boolean;
  presetsCount?: number;
  activePresetName?: string;
}>();

const emit = defineEmits<{
  (e: 'save-config', data: { key: string; providerUrl: string; model?: string }): void;
  (e: 'restore-default'): void;
  (e: 'save-as-preset', data: { key: string; providerUrl: string; model?: string }): void;
  (e: 'open-presets'): void;
}>();

const apiKey = ref<string>('');
const providerUrl = ref<string>('');
const customModel = ref<string>('');
const showKey = ref<boolean>(false);
const isDrawerOpen = ref<boolean>(false);

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
  customModel.value = '';
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
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="card-icon"
        >
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <h2>当前生效配置</h2>

        <!-- 当前匹配的预设名称徽章 -->
        <span
          v-if="activePresetName"
          class="active-preset-tag"
          :title="`当前匹配预设: ${activePresetName}`"
        >
          <span class="active-preset-dot"></span>
          {{ activePresetName }}
        </span>
      </div>

      <!-- 头部右侧操作组 -->
      <div class="header-actions">
        <!-- 头部预设按钮 -->
        <button
          type="button"
          class="btn-header-preset"
          title="点击打开中转站配置列表"
          @click="emit('open-presets')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
          <span>配置列表</span>
        </button>

        <!-- 保存配置 -->
        <button
          type="button"
          class="btn-text-action"
          title="将当前填写的配置保存到配置列表"
          @click="handleSaveAsPreset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            />
          </svg>
          <span>保存配置</span>
        </button>
      </div>
    </div>

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

      <!-- 操作按钮行 -->
      <div class="actions">
        <!-- 1. 使用配置主按钮 -->
        <button type="submit" class="btn btn-primary" :disabled="isLoading">
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
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span>{{ isLoading ? '保存中...' : '使用配置' }}</span>
        </button>

        <!-- 2. 恢复默认按钮 -->
        <button
          type="button"
          class="btn btn-secondary"
          title="恢复 Codex 官方默认设置"
          :disabled="isLoading"
          @click="handleRestore"
        >
          恢复默认
        </button>

        <!-- 3. 更多设置按钮 (放到 恢复默认 的边上) -->
        <button
          type="button"
          class="btn btn-secondary btn-more"
          title="更多设置（自定义模型等）"
          :disabled="isLoading"
          @click="isDrawerOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="4" x2="20" y1="21" y2="21" />
            <line x1="4" x2="20" y1="3" y2="3" />
            <line x1="12" x2="20" y1="12" y2="12" />
            <line x1="4" x2="8" y1="12" y2="12" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="14" cy="3" r="2" />
            <circle cx="16" cy="21" r="2" />
          </svg>
          <span>更多设置</span>
        </button>
      </div>


    </form>

    <!-- 底部向上弹出 80% 高度更多设置抽屉 -->
    <SettingsDrawer
      :visible="isDrawerOpen"
      v-model="customModel"
      @close="isDrawerOpen = false"
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .card-icon {
    color: $accent-blue;
    flex-shrink: 0;
  }

  h2 {
    font-size: 0.94rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.2px;
  }
}

.active-preset-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.28);
  color: $accent-blue;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .active-preset-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: $accent-blue;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-header-preset {
  background: rgba($accent-blue, 0.1);
  border: 1px solid rgba($accent-blue, 0.25);
  color: $accent-blue;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba($accent-blue, 0.2);
    border-color: $accent-blue;
    color: #fff;
  }

  .header-count-pill {
    background: rgba($accent-blue, 0.25);
    color: #fff;
    font-size: 0.66rem;
    padding: 0 5px;
    border-radius: 8px;
    min-width: 15px;
    text-align: center;
  }
}

.btn-text-action {
  background: transparent;
  border: 1px solid transparent;
  color: $text-muted;
  font-size: 0.74rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-main;
    border-color: $border-color;
  }
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

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.btn {
  @include button-base;
  padding: 8px 12px;
  white-space: nowrap;
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  box-shadow: 0 2px 10px rgba($accent-blue, 0.25);
  flex: 2;

  &:hover {
    filter: brightness(1.08);
  }
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: $border-color;
  color: $text-muted;
  flex: 0.8;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: $text-main;
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.btn-more {
  flex: 0.85;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  svg {
    color: $accent-blue;
    transition: transform 0.25s ease;
  }

  &:hover svg {
    transform: rotate(30deg);
  }
}


</style>
