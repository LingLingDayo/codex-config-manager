<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { PresetFormData } from '../types/config';
import { REASONING_EFFORT_OPTIONS } from '../types/config';
import { useSettings } from '../composables/useSettings';
import SettingSelect from './settings/SettingSelect.vue';
import {
  DEFAULT_STATION_NAME,
  DEFAULT_STATION_URL,
  isDefaultStation,
} from '../utils/format';

const props = defineProps<{
  visible: boolean;
  title: string;
  initialData: PresetFormData | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: PresetFormData): void;
}>();

const { settings } = useSettings();

const formName = ref<string>('');
const formUrl = ref<string>('');
const formKey = ref<string>('');
const formModel = ref<string>('');
const formReasoningEffort = ref<string>('');
const formDisplayName = ref<string>('');
const isMoreExpanded = ref<boolean>(false);
const showKey = ref<boolean>(false);
const nameInputRef = ref<HTMLInputElement | null>(null);

const presetChips = [
  { label: DEFAULT_STATION_NAME, url: DEFAULT_STATION_URL },
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { label: 'Moonshot', url: 'https://api.moonshot.cn/v1' },
  { label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4' },
];

const isChipActive = (chipUrl: string) => {
  if (chipUrl === DEFAULT_STATION_URL) {
    return isDefaultStation(formUrl.value);
  }
  return formUrl.value === chipUrl;
};

const hasConfiguredMore = computed(() => {
  return Boolean(
    formModel.value.trim() ||
      formReasoningEffort.value.trim() ||
      formDisplayName.value.trim()
  );
});

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.initialData) {
        formName.value = props.initialData.name;
        formUrl.value = isDefaultStation(props.initialData.provider_url)
          ? DEFAULT_STATION_URL
          : props.initialData.provider_url;
        formKey.value = props.initialData.key;
        formModel.value = props.initialData.model || '';
        formReasoningEffort.value = props.initialData.model_reasoning_effort || '';
        formDisplayName.value = props.initialData.model_display_name || '';
      } else {
        formName.value = '';
        formUrl.value = '';
        formKey.value = '';
        formModel.value = '';
        formReasoningEffort.value = '';
        formDisplayName.value = '';
      }
      showKey.value = false;
      isMoreExpanded.value = false;
      setTimeout(() => {
        nameInputRef.value?.focus();
      }, 100);
    }
  },
  { immediate: true }
);

const handleChipClick = (url: string) => {
  formUrl.value = url;
};

const handleUrlInput = () => {
  const trimmed = formUrl.value.trim().replace(/\/+$/, '');
  if (
    trimmed.toLowerCase() === DEFAULT_STATION_NAME.toLowerCase() ||
    trimmed.toLowerCase() === 'lingai'
  ) {
    formUrl.value = DEFAULT_STATION_URL;
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
    model: formModel.value.trim(),
    model_reasoning_effort: formReasoningEffort.value.trim(),
    model_display_name: formDisplayName.value.trim(),
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
            :placeholder="`例如：${DEFAULT_STATION_NAME} 主力站、个人备用、公司服务等`"
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
          <!-- 快捷标签 -->
          <div v-if="settings.show_provider_presets !== false" class="preset-chips">
            <span
              v-for="chip in presetChips"
              :key="chip.label"
              class="chip"
              :class="{ active: isChipActive(chip.url) }"
              @click="handleChipClick(chip.url)"
            >
              {{ chip.label }}
            </span>
          </div>
          <input
            id="modal-preset-url"
            v-model="formUrl"
            type="text"
            :placeholder="`例如：${DEFAULT_STATION_URL} 或输入 '${DEFAULT_STATION_NAME}' 自动识别`"
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

        <!-- 更多配置折叠触发条 -->
        <div class="more-config-divider">
          <button
            type="button"
            class="more-config-toggle"
            :class="{ active: isMoreExpanded }"
            @click="isMoreExpanded = !isMoreExpanded"
          >
            <div class="toggle-content">
              <svg
                class="chevron-icon"
                :class="{ rotated: isMoreExpanded }"
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span class="toggle-label">更多配置</span>
              <span class="toggle-hint">(可选)</span>
            </div>
            <span v-if="hasConfiguredMore" class="configured-badge">已配置</span>
          </button>
        </div>

        <!-- 更多配置展开内容 -->
        <Transition name="expand">
          <div v-if="isMoreExpanded" class="more-config-fields">
            <div class="fields-row">
              <!-- 自定义模型 -->
              <div class="input-group flex-1">
                <label
                  for="modal-preset-model"
                  title="对应 config.toml 中的 model 字段。用于指定兼容 OpenAI 格式的目标模型，留空则使用默认模型。"
                >
                  自定义模型 (Model)
                </label>
                <input
                  id="modal-preset-model"
                  v-model="formModel"
                  type="text"
                  placeholder="例如: gpt-5.6-sol"
                  autocomplete="off"
                />
              </div>

              <!-- 思考强度 -->
              <div class="input-group flex-1">
                <label
                  for="modal-preset-reasoning"
                  title="对应 config.toml 中的 model_reasoning_effort 字段。用于配置深度思考推理强度。"
                >
                  思考强度 (Reasoning Effort)
                </label>
                <SettingSelect
                  id="modal-preset-reasoning"
                  :model-value="formReasoningEffort"
                  :options="REASONING_EFFORT_OPTIONS"
                  placeholder="例如: low / medium"
                  :allow-custom="true"
                  @update:model-value="formReasoningEffort = $event"
                />
              </div>
            </div>

            <!-- 模型别名 -->
            <div class="input-group">
              <label
                for="modal-preset-display-name"
                title="为当前自定义模型设置显示别名，Codex 的模型选择器中将直接展示该名称。留空恢复默认。"
              >
                模型别名 (Display Name)
              </label>
              <input
                id="modal-preset-display-name"
                v-model="formDisplayName"
                type="text"
                placeholder="例如: 5.6 Sol (在 Codex 界面中显示的别名)"
                autocomplete="off"
              />
            </div>
          </div>
        </Transition>

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
  z-index: 1100;
  padding: 12px;
  animation: fadeIn 0.2s ease forwards;
}

.modal-dialog {
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 20px);
  background: $bg-tertiary;
  border: 1px solid $border-card;
  border-radius: $border-radius-xl;
  padding: 14px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  animation: scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  overflow-y: auto;
  @include custom-scrollbar;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding-bottom: 8px;

  h3 {
    font-size: 0.94rem;
    font-weight: 700;
    color: $text-main;
    background: $accent-gradient;
    background-clip: text;
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
  gap: 9px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.76rem;
    font-weight: 600;
    color: $text-muted;
  }

  .required {
    color: $danger;
    font-weight: bold;
  }

  input[type='text'] {
    @include input-base;
    font-size: 0.82rem;
  }
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.5;
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
    font-size: 0.82rem;
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

.more-config-divider {
  display: flex;
  align-items: center;
  margin: 1px 0;
}

.more-config-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: $border-radius-sm;
  padding: 5px 8px;
  color: $text-muted;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba($accent-blue, 0.4);
    color: $text-main;
  }

  &.active {
    background: rgba($accent-blue, 0.05);
    border-color: rgba($accent-blue, 0.35);
    color: $text-main;
  }
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.76rem;
  font-weight: 600;
}

.chevron-icon {
  color: $text-muted;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;

  &.rotated {
    transform: rotate(90deg);
    color: $accent-blue;
  }
}

.toggle-hint {
  font-size: 0.7rem;
  font-weight: 400;
  color: $text-dim;
}

.configured-badge {
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: $border-radius-sm;
  background: rgba($accent-blue, 0.12);
  color: $accent-blue;
  border: 1px solid rgba($accent-blue, 0.25);
  font-weight: 500;
}

.more-config-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  @include button-base;
  padding: 7px 15px;
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  outline: none;
  box-shadow: 0 2px 10px rgba($accent-blue, 0.25);

  &:hover {
    filter: brightness(1.08);
  }
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-color;
  color: $text-muted;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: $text-main;
    background-color: rgba(255, 255, 255, 0.08);
  }
}
</style>
