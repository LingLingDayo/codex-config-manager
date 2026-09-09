<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import type { ConfirmType } from '../types/config';
import { useConfirm, getDefaultTitle, getDefaultConfirmText } from '../composables/useConfirm';

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    title?: string;
    message?: string;
    detail?: string;
    type?: ConfirmType;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    loading?: boolean;
    teleport?: boolean;
  }>(),
  {
    showCancel: true,
    teleport: true,
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

const { confirmState, handleConfirm: globalConfirm, handleCancel: globalCancel } = useConfirm();

// 判断是否为受控模式（外部显式传入 visible prop）
const instance = getCurrentInstance();
const isControlled = computed(() => {
  const vnodeProps = instance?.vnode.props;
  return vnodeProps ? 'visible' in vnodeProps : false;
});

// 解析当前的各项属性（受控优先，降级到全局单例状态）
const isVisible = computed(() => (isControlled.value ? !!props.visible : confirmState.value.visible));
const resolvedType = computed<ConfirmType>(() => {
  if (isControlled.value) {
    return props.type || 'warning';
  }
  return confirmState.value.type || 'warning';
});

const resolvedTitle = computed(() => {
  if (isControlled.value && props.title !== undefined) {
    return props.title;
  }
  return confirmState.value.title || getDefaultTitle(resolvedType.value);
});

const resolvedMessage = computed(() => {
  if (isControlled.value && props.message !== undefined) {
    return props.message;
  }
  return confirmState.value.message;
});

const resolvedDetail = computed(() => {
  if (isControlled.value && props.detail !== undefined) {
    return props.detail;
  }
  return confirmState.value.detail;
});

const resolvedConfirmText = computed(() => {
  if (isControlled.value && props.confirmText !== undefined) {
    return props.confirmText;
  }
  return confirmState.value.confirmText || getDefaultConfirmText(resolvedType.value);
});

const resolvedCancelText = computed(() => {
  if (isControlled.value && props.cancelText !== undefined) {
    return props.cancelText;
  }
  return confirmState.value.cancelText || '取消';
});

const resolvedShowCancel = computed(() => {
  if (isControlled.value) {
    return props.showCancel !== false;
  }
  return confirmState.value.showCancel !== false;
});

// 操作触发
const onConfirm = () => {
  if (props.loading) return;
  if (isControlled.value) {
    emit('confirm');
    emit('update:visible', false);
  } else {
    globalConfirm();
  }
};

const onCancel = () => {
  if (props.loading) return;
  if (isControlled.value) {
    emit('cancel');
    emit('close');
    emit('update:visible', false);
  } else {
    globalCancel();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isVisible.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  } else if (e.key === 'Enter') {
    // 如果当前焦点不是取消按钮，回车直接确认
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('btn-cancel')) {
      return;
    }
    e.preventDefault();
    onConfirm();
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
  <Teleport to="body" :disabled="!props.teleport">
    <div
      v-if="isVisible"
      class="confirm-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="onCancel"
    >
      <div class="confirm-dialog" :class="[`type-${resolvedType}`]">
        <!-- 头部区域与关闭按钮 -->
        <div class="dialog-header">
          <div class="icon-and-title">
            <!-- 样式图标徽章 -->
            <div class="icon-badge" :class="resolvedType">
              <!-- 危险样式 (danger) -->
              <svg
                v-if="resolvedType === 'danger'"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>

              <!-- 警告样式 (warning) -->
              <svg
                v-else-if="resolvedType === 'warning'"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>

              <!-- 成功样式 (success) -->
              <svg
                v-else-if="resolvedType === 'success'"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>

              <!-- 信息样式 (info) -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>

            <div class="title-wrap">
              <h3 class="confirm-title">{{ resolvedTitle }}</h3>
            </div>
          </div>

          <button
            type="button"
            class="btn-close"
            title="关闭 (Esc)"
            aria-label="关闭"
            @click="onCancel"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="dialog-body">
          <slot>
            <p class="confirm-message">{{ resolvedMessage }}</p>
            <p v-if="resolvedDetail" class="confirm-detail">
              {{ resolvedDetail }}
            </p>
          </slot>
        </div>

        <!-- 操作按钮行 -->
        <div class="dialog-footer">
          <button
            v-if="resolvedShowCancel"
            type="button"
            class="btn btn-cancel"
            :disabled="loading"
            @click="onCancel"
          >
            {{ resolvedCancelText }}
          </button>

          <button
            type="button"
            class="btn btn-confirm"
            :class="[resolvedType]"
            :disabled="loading"
            @click="onConfirm"
          >
            <svg
              v-if="loading"
              class="loading-spinner"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span>{{ loading ? '处理中...' : resolvedConfirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;
@use '../styles/animations' as *;

.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2500;
  padding: 14px;
  animation: fadeIn 0.2s ease forwards;
}

.confirm-dialog {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: $bg-tertiary;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: $border-radius-lg;
  padding: 18px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7);
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.icon-and-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.danger {
    background: rgba($danger, 0.15);
    color: $danger;
  }

  &.warning {
    background: rgba($warning, 0.15);
    color: $warning;
  }

  &.info {
    background: rgba($accent-blue, 0.15);
    color: $accent-blue;
  }

  &.success {
    background: rgba($success, 0.15);
    color: $success;
  }
}

.title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.confirm-title {
  font-size: 0.94rem;
  font-weight: 600;
  color: $text-main;
  letter-spacing: -0.2px;
  line-height: 1.3;
  margin: 0;
}

.btn-close {
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

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0 6px;
}

.confirm-message {
  font-size: 0.86rem;
  color: $text-main;
  line-height: 1.5;
  margin: 0;
  font-weight: 500;
  word-break: break-word;
}

.confirm-detail {
  font-size: 0.78rem;
  color: $text-muted;
  line-height: 1.5;
  margin: 0;
  word-break: break-word;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  @include button-base;
  height: 32px;
  box-sizing: border-box;
  padding: 0 14px;
  font-size: 0.82rem;
  font-weight: 500;
  border-radius: $border-radius-sm;
  line-height: 1;
}

.btn-cancel {
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: $text-muted;

  &:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.12);
    color: $text-main;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.btn-confirm {
  color: #ffffff;
  border: none;
  font-weight: 600;

  &.warning {
    background: #f59e0b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      background: #d97706;
    }
  }

  &.danger {
    background: #ef4444;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      background: #dc2626;
    }
  }

  &.info {
    background: $accent-gradient;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }

  &.success {
    background: #10b981;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      background: #059669;
    }
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
