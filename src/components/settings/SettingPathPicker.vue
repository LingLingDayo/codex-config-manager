<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string;
    detectedPath?: string | null;
    disabled?: boolean;
    isPicking?: boolean;
  }>(),
  {
    detectedPath: null,
    disabled: false,
    isPicking: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'pick'): void;
}>();

const handleInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  emit('update:modelValue', val);
};

const handleClear = () => {
  if (props.disabled) return;
  emit('update:modelValue', '');
};
</script>

<template>
  <div class="setting-path-picker" :class="{ disabled }">
    <div class="picker-input-row">
      <div class="input-wrapper">
        <input
          type="text"
          :value="modelValue"
          placeholder="留空自动识别（默认安装路径）"
          :disabled="disabled"
          class="path-input"
          autocomplete="off"
          @input="handleInput"
        />
        <button
          v-if="modelValue && !disabled"
          type="button"
          class="btn-clear-path"
          title="清空并设为自动识别"
          @click="handleClear"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        class="btn-browse"
        :disabled="disabled || isPicking"
        title="打开文件选择器"
        @click="emit('pick')"
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
          <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
        </svg>
        <span>{{ isPicking ? '选择中...' : '浏览' }}</span>
      </button>
    </div>

    <!-- 自动识别状态展示条 -->
    <div class="path-status-bar">
      <template v-if="!modelValue">
        <span class="status-tag auto">默认</span>
        <span v-if="detectedPath" class="status-detected" :title="detectedPath">
          默认检测路径: {{ detectedPath }}
        </span>
        <span v-else class="status-hint">启动时将自动检索系统默认安装路径</span>
      </template>
      <template v-else>
        <span class="status-tag custom">自定义</span>
        <span class="status-hint custom" :title="modelValue">优先使用指定可执行文件路径</span>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.setting-path-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.picker-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.path-input {
  @include input-base;
  padding-right: 28px;
  font-family: $font-family-mono;
  font-size: 0.78rem;
}

.btn-clear-path {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    color: $text-main;
    background: rgba(255, 255, 255, 0.1);
  }
}

.btn-browse {
  @include button-base;
  flex-shrink: 0;
  padding: 7px 12px;
  font-size: 0.76rem;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: $text-main;
  border-radius: $border-radius-md;

  &:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.22);
    color: #ffffff;
  }
}

.path-status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  line-height: 1.3;
}

.status-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  flex-shrink: 0;

  &.auto {
    background: rgba($success, 0.15);
    color: $success;
    border: 1px solid rgba($success, 0.3);
  }

  &.custom {
    background: rgba($accent-blue, 0.15);
    color: $accent-blue;
    border: 1px solid rgba($accent-blue, 0.3);
  }
}

.status-detected,
.status-hint {
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.custom {
    color: rgba($text-main, 0.75);
  }
}
</style>
