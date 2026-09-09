<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'close'): void;
}>();

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.visible) {
    emit('close');
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
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-backdrop" @click.self="emit('close')">
        <div class="drawer-panel">
          <!-- 右上角定位关闭按钮 -->
          <button
            type="button"
            class="btn-drawer-close"
            title="关闭 (Esc)"
            @click="emit('close')"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <!-- 抽屉配置项列表主体 -->
          <div class="drawer-content">
            <div class="config-item">
              <label
                for="custom-model-input"
                class="config-label"
                title="对应 config.toml 中的 model 字段。用于指定兼容 OpenAI 格式的目标模型，留空则使用默认模型。"
              >
                自定义模型 (Model)
              </label>
              <input
                id="custom-model-input"
                :value="modelValue"
                type="text"
                placeholder="例如: gpt-5.6-sol"
                autocomplete="off"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                @keydown.enter="emit('close')"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease;

  .drawer-panel {
    transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;

  .drawer-panel {
    transform: translateY(100%);
  }
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.drawer-panel {
  position: relative;
  width: 100%;
  height: 80%;
  background: $bg-primary;
  border-top-left-radius: $border-radius-lg;
  border-top-right-radius: $border-radius-lg;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: hidden;
}

.btn-drawer-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-main;
  }
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  @include custom-scrollbar;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .config-label {
    font-size: 0.86rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.1px;
    cursor: help;
    width: fit-content;
  }

  input {
    @include input-base;
    padding: 9px 12px;
    font-size: 0.84rem;
    font-family: $font-family-mono;

    &::placeholder {
      font-family: $font-family-base;
      font-size: 0.78rem;
      color: $text-dim;
    }
  }
}
</style>
