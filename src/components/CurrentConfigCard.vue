<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CodexConfig } from '../types/config';

const props = defineProps<{
  config: CodexConfig;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'save-config', data: { key: string; providerUrl: string }): void;
  (e: 'restore-default'): void;
  (e: 'save-as-preset', data: { key: string; providerUrl: string }): void;
}>();

const apiKey = ref<string>('');
const providerUrl = ref<string>('LingAI');
const showKey = ref<boolean>(false);

// 同步外部配置
watch(
  () => props.config,
  (newVal) => {
    apiKey.value = newVal.key;
    providerUrl.value = newVal.provider_url;
  },
  { immediate: true, deep: true }
);

// 监听提供商输入框变化，自动映射特定地址
const handleProviderInput = () => {
  const trimmed = providerUrl.value.trim().replace(/\/+$/, '');
  if (
    trimmed === 'https://lingai.linglingdayo.top' ||
    trimmed === 'https://lingai.linglingdayo.top/v1'
  ) {
    providerUrl.value = 'LingAI';
  }
};

const handleSave = () => {
  emit('save-config', {
    key: apiKey.value,
    providerUrl: providerUrl.value,
  });
};

const handleRestore = () => {
  emit('restore-default');
};

const handleSaveAsPreset = () => {
  emit('save-as-preset', {
    key: apiKey.value,
    providerUrl: providerUrl.value,
  });
};
</script>

<template>
  <section class="card config-card">
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
      </div>
      <button
        type="button"
        class="btn-text-action"
        title="将当前填写的配置存为新预设"
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
        <span>存为预设</span>
      </button>
    </div>

    <form class="config-form" @submit.prevent="handleSave">
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

      <div class="input-group">
        <label for="provider-url">模型提供商 (Base URL)</label>
        <input
          id="provider-url"
          v-model="providerUrl"
          type="text"
          placeholder="自定义 Base URL，输入 'LingAI' 自动映射"
          required
          autocomplete="off"
          @input="handleProviderInput"
        />
      </div>

      <div class="actions">
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
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>{{ isLoading ? '保存中...' : '保存并生效' }}</span>
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          title="恢复 Codex 官方默认设置"
          :disabled="isLoading"
          @click="handleRestore"
        >
          恢复默认
        </button>
      </div>
    </form>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.config-card {
  @include glass-card;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
    font-size: 0.92rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.2px;
  }
}

.btn-text-action {
  background: transparent;
  border: none;
  color: $accent-blue;
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    background: rgba($accent-blue, 0.1);
    color: #fff;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  }
}

.password-wrapper {
  position: relative;
  width: 100%;

  input {
    @include input-base;
    padding-right: 36px;
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
  gap: 10px;
  margin-top: 4px;
}

.btn {
  @include button-base;
  padding: 8px 14px;
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  box-shadow: 0 2px 10px rgba($accent-blue, 0.25);
  flex: 1;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba($accent-blue, 0.4);
  }
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: $border-color;
  color: $text-muted;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: $text-main;
    background-color: rgba(255, 255, 255, 0.08);
  }
}
</style>
