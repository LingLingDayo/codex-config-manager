<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface SelectOptionItem {
  label: string;
  value: string;
  description?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: Array<string | SelectOptionItem>;
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
    allowCustom?: boolean;
  }>(),
  {
    placeholder: '请选择或输入',
    disabled: false,
    clearable: true,
    allowCustom: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'blur', event: FocusEvent): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref<boolean>(false);

// 格式化选项列表
const normalizedOptions = computed<SelectOptionItem[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });
});

// 打开下拉列表
const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value && inputRef.value) {
    inputRef.value.focus();
  }
};

// 选中某个选项
const selectOption = (item: SelectOptionItem) => {
  emit('update:modelValue', item.value);
  emit('change', item.value);
  isOpen.value = false;
};

// 输入框内容变动
const handleInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  emit('update:modelValue', val);
  emit('change', val);
  if (!isOpen.value) {
    isOpen.value = true;
  }
};

// 清空当前内容
const handleClear = (event: MouseEvent) => {
  event.stopPropagation();
  if (props.disabled) return;
  emit('update:modelValue', '');
  emit('change', '');
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

// 键盘按键交互
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isOpen.value) {
      e.stopPropagation();
      isOpen.value = false;
    }
  } else if (e.key === 'Enter') {
    isOpen.value = false;
  }
};

// 点击外部区域收起下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('pointerdown', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleClickOutside);
});
</script>

<template>
  <div
    ref="containerRef"
    class="setting-select"
    :class="{ disabled, 'is-open': isOpen }"
    @keydown="handleKeyDown"
  >
    <!-- 输入/触发框 -->
    <div class="select-trigger" @click="toggleDropdown">
      <input
        ref="inputRef"
        :value="modelValue"
        :type="'text'"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="!allowCustom"
        class="select-input"
        autocomplete="off"
        @input="handleInput"
        @blur="emit('blur', $event)"
      />

      <!-- 操作动作区域（清空与展开箭头） -->
      <div class="actions-wrapper">
        <button
          v-if="clearable && modelValue && !disabled"
          type="button"
          class="btn-icon btn-clear"
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

        <button
          type="button"
          class="btn-icon btn-arrow"
          :class="{ rotated: isOpen }"
          title="展开选项"
          tabindex="-1"
          @click.stop="toggleDropdown"
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 下拉选项菜单 -->
    <Transition name="select-dropdown">
      <div v-if="isOpen && !disabled" class="select-dropdown-menu">
        <ul class="dropdown-list">
          <li
            v-for="item in normalizedOptions"
            :key="item.value"
            class="dropdown-item"
            :class="{ active: modelValue.trim() === item.value.trim() }"
            @click.stop="selectOption(item)"
          >
            <div class="item-text">
              <span class="item-label">{{ item.label }}</span>
              <span v-if="item.description" class="item-desc">{{ item.description }}</span>
            </div>
            <svg
              v-if="modelValue.trim() === item.value.trim()"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="check-icon"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </li>
          <li v-if="normalizedOptions.length === 0" class="empty-tip">
            暂无预设选项，可直接输入
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.setting-select {
  position: relative;
  width: 100%;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.select-input {
  @include input-base;
  padding-right: 50px;
  font-size: 0.82rem;
  font-family: $font-family-mono;
  width: 100%;
  cursor: text;

  &[readonly] {
    cursor: pointer;
  }
}

.actions-wrapper {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
}

.btn-icon {
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

.btn-arrow {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
    color: $accent-blue;
  }
}

.select-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1200;
  background: $bg-secondary;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: $border-radius-md;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  max-height: 180px;
  overflow-y: auto;
  @include custom-scrollbar;
  padding: 4px;
}

.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: rgba($accent-blue, 0.14);
    color: $accent-blue;

    .item-label {
      color: $accent-blue;
      font-weight: 600;
    }
  }
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-label {
  font-size: 0.8rem;
  color: $text-main;
  line-height: 1.25;
}

.item-desc {
  font-size: 0.68rem;
  color: $text-muted;
  line-height: 1.2;
}

.check-icon {
  color: $accent-blue;
  flex-shrink: 0;
  margin-left: 8px;
}

.empty-tip {
  padding: 10px;
  text-align: center;
  font-size: 0.76rem;
  color: $text-muted;
}

/* 动效 */
.select-dropdown-enter-active,
.select-dropdown-leave-active {
  transition: opacity 0.16s ease, transform 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.select-dropdown-enter-from,
.select-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
