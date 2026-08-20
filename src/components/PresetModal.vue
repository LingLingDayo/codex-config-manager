<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { PresetFormData } from '../types/config';

const props = defineProps<{
  visible: boolean;
  title: string;
  initialData: PresetFormData | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: PresetFormData): void;
}>();

const formName = ref<string>('');
const formUrl = ref<string>('');
const formKey = ref<string>('');
const showKey = ref<boolean>(false);
const nameInputRef = ref<HTMLInputElement | null>(null);

const presetChips = [
  { label: 'LingAI', url: 'LingAI' },
  { label: 'OpenAI 官方', url: 'https://api.openai.com/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { label: 'Moonshot', url: 'https://api.moonshot.cn/v1' },
];

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.initialData) {
        formName.value = props.initialData.name;
        formUrl.value = props.initialData.provider_url;
        formKey.value = props.initialData.key;
      } else {
        formName.value = '';
        formUrl.value = '';
        formKey.value = '';
      }
      showKey.value = false;
      setTimeout(() => {
        nameInputRef.value?.focus();
      }, 100);
    }
  }
);

const handleChipClick = (url: string) => {
  formUrl.value = url;
};

const handleUrlInput = () => {
  const trimmed = formUrl.value.trim().replace(/\/+$/, '');
  if (
    trimmed.toLowerCase() === 'lingai' ||
    trimmed === 'https://lingai.linglingdayo.top' ||
    trimmed === 'https://lingai.linglingdayo.top/v1'
  ) {
    formUrl.value = 'LingAI';
  }
};

const handleClose = () => {
  emit('close');
};

const handleSubmit = () => {
  emit('save', {
    id: props.initialData?.id,
    name: formName.value,
    provider_url: formUrl.value,
    key: formKey.value,
  });
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.visible) {
    handleClose();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button type="button" class="modal-close-btn" title="关闭" @click="handleClose">
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
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form class="modal-form" @submit.prevent="handleSubmit">
        <div class="input-group">
          <label for="modal-preset-name">
            配置别名 / 命名 <span class="required">*</span>
          </label>
          <input
            id="modal-preset-name"
            ref="nameInputRef"
            v-model="formName"
            type="text"
            placeholder="例如：LingAI 主力站、个人备用、公司服务等"
            required
            autocomplete="off"
          />
        </div>

        <div class="input-group">
          <div class="input-label-row">
            <label for="modal-preset-url">
              模型提供商 (Base URL) <span class="required">*</span>
            </label>
          </div>
          <!-- 快捷芯片 -->
          <div class="preset-chips">
            <span
              v-for="chip in presetChips"
              :key="chip.label"
              class="chip"
              :class="{ active: formUrl === chip.url }"
              @click="handleChipClick(chip.url)"
            >
              {{ chip.label }}
            </span>
          </div>
          <input
            id="modal-preset-url"
            v-model="formUrl"
            type="text"
            placeholder="例如：LingAI 或 https://api.openai.com/v1"
            required
            autocomplete="off"
            @input="handleUrlInput"
          />
        </div>

        <div class="input-group">
          <div class="input-label-row">
            <label for="modal-preset-key">
              API Key / Token <span class="required">*</span>
            </label>
          </div>
          <div class="password-wrapper">
            <input
              id="modal-preset-key"
              v-model="formKey"
              :type="showKey ? 'text' : 'password'"
              placeholder="请输入中转站 API Key (如 sk-...)"
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

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
          <button type="submit" class="btn btn-primary">
            <span>保存配置</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;
@use '../styles/animations' as *;

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
  animation: fadeIn 0.2s ease forwards;
}

.modal-dialog {
  width: 100%;
  max-width: 420px;
  background: $bg-tertiary;
  border: 1px solid $border-card;
  border-radius: $border-radius-xl;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  animation: scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding-bottom: 10px;

  h3 {
    font-size: 0.98rem;
    font-weight: 700;
    color: $text-main;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.modal-close-btn {
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
    background: rgba(255, 255, 255, 0.1);
    color: $text-main;
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

  .required {
    color: $danger;
    font-weight: bold;
  }

  input[type='text'] {
    @include input-base;
  }
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}

.chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: $border-radius-sm;
  font-size: 0.72rem;
  color: $text-muted;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.active {
    background: rgba($accent-blue, 0.15);
    border-color: $accent-blue;
    color: $accent-blue;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.btn {
  @include button-base;
  padding: 8px 16px;
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  box-shadow: 0 2px 10px rgba($accent-blue, 0.25);

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
