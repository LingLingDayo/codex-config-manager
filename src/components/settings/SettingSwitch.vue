<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    ariaLabel: '开关切换',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const toggle = () => {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="setting-switch"
    :class="{ active: modelValue, disabled }"
    @click="toggle"
  >
    <span class="switch-thumb"></span>
  </button>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.setting-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  outline: none;
  padding: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px $accent-blue;
  }

  &.active {
    background: $accent-gradient;
    border-color: rgba($accent-blue, 0.4);
    box-shadow: 0 2px 8px rgba($accent-blue, 0.35);

    .switch-thumb {
      transform: translateX(16px);
      background-color: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: $text-muted;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
}
</style>
