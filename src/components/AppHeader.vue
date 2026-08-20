<script setup lang="ts">
defineProps<{
  isEnabled: boolean;
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
    <div
      class="status-indicator"
      :class="{ active: isEnabled, inactive: !isEnabled }"
      :title="isEnabled ? 'API 接口已启用' : '未启用 API 接口'"
    >
      <span class="status-dot"></span>
      <span class="status-text">{{ isEnabled ? 'API 已启用' : '未启用 API' }}</span>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/animations' as *;

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding-bottom: 12px;
  flex-shrink: 0;
}

.title-brand-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-logo {
  width: 34px;
  height: 34px;
  object-fit: contain;
  border-radius: $border-radius-md;
  filter: drop-shadow(0 2px 8px rgba($accent-blue, 0.3));
}

.title-group {
  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.4px;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1px;
  }

  .subtitle {
    font-size: 0.76rem;
    color: $text-muted;
  }
}

.status-indicator {
  display: flex;
  align-items: center;
  background: rgba($bg-secondary, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid $border-color;
  padding: 4px 10px;
  border-radius: $border-radius-round;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: $text-dim;
  }

  &.active {
    .status-dot {
      background-color: $success;
      box-shadow: 0 0 8px $success;
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
</style>
