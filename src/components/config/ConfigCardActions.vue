<script setup lang="ts">
withDefaults(
  defineProps<{
    isLoading?: boolean;
    isLaunching?: boolean;
  }>(),
  {
    isLoading: false,
    isLaunching: false,
  }
);

const emit = defineEmits<{
  (e: 'launch'): void;
  (e: 'open-drawer'): void;
  (e: 'restore'): void;
}>();
</script>

<template>
  <div class="actions">
    <!-- 1. 保存配置主按钮 (原生 submit，提交外层 form) -->
    <button type="submit" class="btn btn-primary" :disabled="isLoading">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{{ isLoading ? '保存中...' : '保存配置' }}</span>
    </button>

    <!-- 2. 启动 Codex (ChatGPT) 客户端按钮 -->
    <button
      type="button"
      class="btn btn-launch"
      :class="{ launching: isLaunching }"
      :disabled="isLoading || isLaunching"
      title="以当前配置启动Codex/ChatGPT"
      @click="emit('launch')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="launch-icon"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <span class="launch-text">{{ isLaunching ? '重启中...' : '启动 Codex' }}</span>
    </button>

    <!-- 3. 更多配置按钮 (纯图标) -->
    <button
      type="button"
      class="btn btn-secondary btn-icon btn-more"
      title="更多配置"
      aria-label="更多配置"
      :disabled="isLoading"
      @click="emit('open-drawer')"
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
        <line x1="4" x2="20" y1="21" y2="21" />
        <line x1="4" x2="20" y1="3" y2="3" />
        <line x1="12" x2="20" y1="12" y2="12" />
        <line x1="4" x2="8" y1="12" y2="12" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="14" cy="3" r="2" />
        <circle cx="16" cy="21" r="2" />
      </svg>
    </button>

    <!-- 4. 恢复默认按钮 (纯图标) -->
    <button
      type="button"
      class="btn btn-secondary btn-icon btn-restore"
      title="恢复默认配置"
      aria-label="恢复默认配置"
      :disabled="isLoading"
      @click="emit('restore')"
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
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;
@use '../../styles/animations' as *;

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.btn {
  @include button-base;
  height: 34px;
  box-sizing: border-box;
  padding: 0 12px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: none;
  outline: none;

  span {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    transform: translateY(1px);
  }

  svg {
    flex-shrink: 0;
    transform: translateY(1px);
  }
}

.btn-primary {
  background: $accent-gradient;
  color: #fff;
  border: none;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba($accent-blue, 0.2);
  flex: 1;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
  }
}

.btn-launch {
  background: $accent-gradient;
  color: #ffffff;
  border: none;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba($accent-blue, 0.2);
  flex: 1;

  .launch-icon {
    fill: #ffffff;
    transition: transform 0.2s ease;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.35), 0 2px 6px rgba($accent-blue, 0.25);

    .launch-icon {
      transform: scale(1.1);
    }
  }

  &:disabled {
    opacity: 0.55;
    cursor: wait;
    filter: none;
    box-shadow: none;
  }

  &.launching .launch-icon {
    animation: pulse 1s infinite;
  }
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-color;
  color: $text-muted;

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.2);
    color: $text-main;
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.btn-icon {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: $border-radius-md;

  svg {
    color: $text-muted;
    transition: color 0.2s ease;
    transform: none;
  }

  &:hover:not(:disabled) svg {
    color: $text-main;
  }
}

.btn-restore {
  &:hover:not(:disabled) svg {
    color: $warning;
  }
}
</style>
