<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    clearable?: boolean;
  }>(),
  {
    placeholder: '',
    type: 'text',
    disabled: false,
    clearable: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'blur', event: FocusEvent): void;
}>();

const handleInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  emit('update:modelValue', val);
  emit('change', val);
};

const handleClear = () => {
  if (props.disabled) return;
  emit('update:modelValue', '');
  emit('change', '');
};
</script>

<template>
  <div class="setting-input-wrapper" :class="{ disabled }">
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="setting-input"
      autocomplete="off"
      @input="handleInput"
      @blur="emit('blur', $event)"
    />
    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="btn-clear"
      title="清空"
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
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.setting-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.setting-input {
  @include input-base;
  padding-right: 28px;
  font-size: 0.82rem;
  font-family: $font-family-mono;
}

.btn-clear {
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
</style>
