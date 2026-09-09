<script setup lang="ts">
withDefaults(
  defineProps<{
    isEnabled: boolean;
    isLaunching?: boolean;
  }>(),
  {
    isLaunching: false,
  }
);

const emit = defineEmits<{
  (e: 'launch-app'): void;
  (e: 'open-settings'): void;
}>();
</script>

<template>
  <header class="app-header">
    <div class="title-brand-wrapper">
      <img src="../assets/logo_minimal.png" alt="Codex Logo" class="app-logo" />
      <div class="title-group">
        <h1>Codex 配置助手</h1>
        <p class="subtitle">轻松管理与快捷切换多中转站 API 配置</p>
      </div>
    </div>

    <!-- 头部右侧操作组 -->
    <div class="header-right-actions">
      <!-- 状态指示胶囊 -->
      <div
        class="status-indicator"
        :class="{ active: isEnabled, inactive: !isEnabled }"
        :title="isEnabled ? 'API 接口已启用' : '未启用 API 接口'"
      >
        <span class="status-dot"></span>
        <span class="status-text">{{ isEnabled ? 'API 已启用' : '未启用' }}</span>
      </div>

      <!-- 启动 Codex (ChatGPT) 按钮 (三角形 Icon) -->
      <button
        type="button"
        class="btn-header-launch"
        :class="{ launching: isLaunching }"
        :disabled="isLaunching"
        title="启动或重启 Codex (ChatGPT) 客户端"
        @click="emit('launch-app')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="launch-icon"
        >
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        <span class="launch-text">{{ isLaunching ? '重启中...' : '启动' }}</span>
      </button>

      <!-- 右上角纯 Icon 设置按钮 -->
      <button
        type="button"
        class="btn-header-settings"
        title="偏好设置"
        aria-label="偏好设置"
        @click="emit('open-settings')"
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
          class="settings-icon"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/animations' as *;
@use '../styles/mixins' as *;

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding-bottom: 11px;
  flex-shrink: 0;
  gap: 10px;
}

.title-brand-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: $border-radius-md;
  flex-shrink: 0;
}

.title-group {
  min-width: 0;

  h1 {
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.4px;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1px;
    white-space: nowrap;
  }

  .subtitle {
    font-size: 0.72rem;
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  background: rgba($bg-secondary, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid $border-color;
  padding: 3px 8px;
  border-radius: $border-radius-round;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: $text-dim;
    flex-shrink: 0;
  }

  &.active {
    .status-dot {
      background-color: $success;
      box-shadow: 0 0 6px $success;
      animation: pulse 2s infinite;
    }
  }

  &.inactive {
    .status-dot {
      background-color: $text-dim;
      box-shadow: none;
    }
  }
}

// 启动应用按钮
.btn-header-launch {
  @include button-base;
  padding: 4px 9px;
  font-size: 0.72rem;
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.32);
  color: $accent-blue;
  border-radius: $border-radius-sm;
  gap: 4px;

  .launch-icon {
    transition: transform 0.2s ease;
  }

  &:hover:not(:disabled) {
    background: rgba($accent-blue, 0.22);
    border-color: $accent-blue;
    color: #ffffff;
    box-shadow: 0 0 10px rgba($accent-blue, 0.35);

    .launch-icon {
      transform: scale(1.12);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  &.launching .launch-icon {
    animation: pulse 1s infinite;
  }
}

// 右上角纯图标设置按钮
.btn-header-settings {
  width: 27px;
  height: 27px;
  padding: 0;
  border-radius: $border-radius-sm;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);

  .settings-icon {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba($accent-blue, 0.4);
    color: $text-main;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);

    .settings-icon {
      color: $accent-blue;
      transform: rotate(45deg);
    }
  }

  &:active {
    transform: scale(0.94);
  }
}
</style>
