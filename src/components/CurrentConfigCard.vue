<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CodexConfig } from '../types/config';
import { LINGAI_URL, isLingAI } from '../utils/format';

const props = defineProps<{
  config: CodexConfig;
  isLoading: boolean;
  presetsCount?: number;
  activePresetName?: string;
}>();

const emit = defineEmits<{
  (e: 'save-config', data: { key: string; providerUrl: string }): void;
  (e: 'restore-default'): void;
  (e: 'save-as-preset', data: { key: string; providerUrl: string }): void;
  (e: 'open-presets'): void;
}>();

const apiKey = ref<string>('');
const providerUrl = ref<string>('');
const showKey = ref<boolean>(false);

// 同步外部配置
watch(
  () => props.config,
  (newVal) => {
    apiKey.value = newVal.key;
    providerUrl.value = isLingAI(newVal.provider_url) ? LINGAI_URL : newVal.provider_url;
  },
  { immediate: true, deep: true }
);

// 监听提供商输入框变化，自动映射特定地址
const handleProviderInput = () => {
  const trimmed = providerUrl.value.trim().replace(/\/+$/, '');
  if (trimmed.toLowerCase() === 'lingai') {
    providerUrl.value = LINGAI_URL;
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
          title="点击打开中转站预设配置库"
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
          <span>预设列表</span>
          <span v-if="presetsCount !== undefined" class="header-count-pill">{{ presetsCount }}</span>
        </button>

        <!-- 存为预设 -->
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
    </div>

    <!-- 表单主体 -->
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
          placeholder="例如：https://lingai.linglingdayo.top 或输入 'LingAI' 自动填充"
          required
          autocomplete="off"
          @input="handleProviderInput"
        />
      </div>

      <!-- 操作按钮行 -->
      <div class="actions">
        <!-- 1. 保存生效主按钮 -->
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

        <!-- 2. 选择预设按钮 -->
        <button
          type="button"
          class="btn btn-preset"
          title="选择或切换已保存的中转站配置"
          @click="emit('open-presets')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
          <span>选择预设 ({{ presetsCount ?? 0 }})</span>
        </button>

        <!-- 3. 恢复默认按钮 -->
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

      <!-- 底部提示信息 -->
      <div class="form-tip">
        <span>💡 点击「选择预设」可打开配置库一键切换，也可随时将当前输入「存为预设」</span>
      </div>
    </form>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.config-card {
  @include glass-card;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 12px;
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
    box-shadow: 0 2px 8px rgba($accent-blue, 0.2);
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
  gap: 14px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: $text-muted;
  }

  input[type='text'] {
    @include input-base;
    padding: 9px 12px;
  }
}

.password-wrapper {
  position: relative;
  width: 100%;

  input {
    @include input-base;
    padding: 9px 36px 9px 12px;
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
  margin-top: 4px;
}

.btn {
  @include button-base;
  padding: 9px 14px;
  white-space: nowrap;
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  box-shadow: 0 2px 10px rgba($accent-blue, 0.25);
  flex: 1.3;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba($accent-blue, 0.4);
  }
}

.btn-preset {
  background-color: rgba($accent-blue, 0.08);
  border: 1px solid rgba($accent-blue, 0.25);
  color: $accent-blue;
  flex: 1.1;

  &:hover {
    background-color: rgba($accent-blue, 0.16);
    border-color: rgba($accent-blue, 0.4);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 2px 10px rgba($accent-blue, 0.15);
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

.form-tip {
  display: flex;
  align-items: center;
  padding-top: 4px;

  span {
    font-size: 0.72rem;
    color: $text-dim;
    line-height: 1.4;
  }
}
</style>
