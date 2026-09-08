<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch, ref } from 'vue';

const props = defineProps<{
  visible: boolean;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'close'): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

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
          <!-- 极简顶部指示条，点击亦可收起 -->
          <div class="drawer-pill" title="点击收起" @click="emit('close')"></div>

          <!-- 抽屉设置项列表主体 -->
          <div class="drawer-content">
            <div class="setting-item">
              <label for="custom-model-input">自定义模型 (Model)</label>
              <input
                id="custom-model-input"
                ref="inputRef"
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  z-index: 1050;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.drawer-panel {
  position: relative;
  width: 100%;
  height: 80%; // 严格 80% 高度
  background: $bg-tertiary;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  padding: 10px 22px 20px;
  overflow: hidden;
  will-change: transform;
}

.drawer-pill {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 2px;
  margin: 0 auto 18px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba($accent-blue, 0.6);
    width: 48px;
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

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.86rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.1px;
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
