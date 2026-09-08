<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { CodexConfig, PresetConfig } from '../types/config';
import { normalizeUrl } from '../utils/format';

const props = defineProps<{
  visible: boolean;
  presets: PresetConfig[];
  currentConfig: CodexConfig;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-preset', preset: PresetConfig): void;
  (e: 'edit-preset', preset: PresetConfig): void;
  (e: 'delete-preset', preset: PresetConfig): void;
  (e: 'add-preset'): void;
}>();

const isPresetActive = (preset: PresetConfig): boolean => {
  if (!props.currentConfig.is_enabled) return false;
  if (!props.currentConfig.key || !preset.key) return false;
  return (
    preset.key.trim() === props.currentConfig.key.trim() &&
    normalizeUrl(preset.provider_url) === normalizeUrl(props.currentConfig.provider_url)
  );
};

const handleRowClick = (preset: PresetConfig) => {
  if (!isPresetActive(preset)) {
    emit('apply-preset', preset);
  }
};

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
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="title-group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="header-icon"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
          <h3>中转站配置列表</h3>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-add-preset"
            title="添加新配置"
            @click="emit('add-preset')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>新增配置</span>
          </button>
          <button
            type="button"
            class="modal-close-btn"
            title="关闭"
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
        </div>
      </div>

      <!-- 预设列表 -->
      <div v-if="presets.length > 0" class="preset-list">
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="preset-item"
          :class="{ 'is-active': isPresetActive(preset) }"
          :title="isPresetActive(preset) ? '当前正在生效' : '点击立即切换至此配置'"
          @click="handleRowClick(preset)"
        >
          <!-- 左侧基本信息 -->
          <div class="preset-info">
            <div class="preset-title-row">
              <span class="status-indicator-dot" :class="{ active: isPresetActive(preset) }"></span>
              <span class="preset-name">{{ preset.name }}</span>
            </div>
            <span class="preset-url" :title="preset.provider_url">
              {{ normalizeUrl(preset.provider_url) || '默认 URL' }}
            </span>
          </div>

          <!-- 右侧操作与状态 -->
          <div class="preset-actions" @click.stop>
            <span v-if="isPresetActive(preset)" class="active-pill">
              <span class="pill-dot"></span>生效中
            </span>
            <button
              v-else
              type="button"
              class="btn-use"
              title="切换并生效"
              @click.stop="emit('apply-preset', preset)"
            >
              切换
            </button>

            <button
              type="button"
              class="btn-action-icon"
              title="编辑配置"
              @click.stop="emit('edit-preset', preset)"
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
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>

            <button
              type="button"
              class="btn-action-icon btn-delete"
              title="删除配置"
              @click.stop="emit('delete-preset', preset)"
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon-wrap">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <p class="empty-title">暂无保存的预设</p>
        <p class="empty-desc">添加常用中转站 Key 与地址，随时一键切换</p>
        <button
          type="button"
          class="btn-add-empty"
          @click="emit('add-preset')"
        >
          + 立即添加第一个配置
        </button>
      </div>

      <!-- 底部操作与提示 -->
      <div class="modal-footer">
        <span class="footer-tip">💡 点击任意配置项即可立即切换并生效</span>
        <button type="button" class="btn-close" @click="emit('close')">
          完成
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;
@use '../styles/animations' as *;

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 10px;
  animation: fadeIn 0.2s ease forwards;
}

.modal-dialog {
  width: 100%;
  max-width: 460px;
  background: $bg-tertiary;
  border: 1px solid $border-card;
  border-radius: $border-radius-xl;
  padding: 12px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: scaleIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  max-height: calc(100vh - 20px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding-bottom: 12px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .header-icon {
    color: $accent-blue;
    flex-shrink: 0;
  }

  h3 {
    font-size: 0.96rem;
    font-weight: 700;
    color: $text-main;
    letter-spacing: -0.2px;
  }

  .count-badge {
    background: rgba($accent-blue, 0.15);
    color: $accent-blue;
    border: 1px solid rgba($accent-blue, 0.3);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 10px;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-add-preset {
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.3);
  color: $accent-blue;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: $accent-gradient;
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba($accent-blue, 0.3);
  }
}

.modal-close-btn {
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

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: $text-main;
  }
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 380px;
  padding-right: 2px;
  @include custom-scrollbar;
}

.preset-item {
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    background: rgba($bg-secondary, 0.95);
    border-color: rgba($accent-blue, 0.35);
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);

    .preset-name {
      color: #fff;
    }
  }

  &.is-active {
    border-color: rgba($accent-blue, 0.5);
    background: linear-gradient(135deg, rgba($accent-blue, 0.08), rgba($accent-purple, 0.06)),
      $bg-secondary;
    box-shadow: 0 0 10px rgba($accent-blue, 0.12);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: $accent-gradient;
      border-top-left-radius: $border-radius-md;
      border-bottom-left-radius: $border-radius-md;
    }
  }
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.preset-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.status-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: $text-dim;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &.active {
    background-color: $success;
    box-shadow: 0 0 6px $success;
  }
}

.preset-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: $text-main;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.preset-url {
  font-size: 0.72rem;
  color: $text-muted;
  font-family: $font-family-mono;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 13px;
}

.preset-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.active-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba($success, 0.15);
  border: 1px solid rgba($success, 0.3);
  color: $success;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;

  .pill-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: $success;
  }
}

.btn-use {
  background: rgba($accent-blue, 0.1);
  border: 1px solid rgba($accent-blue, 0.25);
  color: $accent-blue;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: $accent-gradient;
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba($accent-blue, 0.3);
  }
}

.btn-action-icon {
  background: transparent;
  border: 1px solid transparent;
  color: $text-muted;
  cursor: pointer;
  padding: 5px;
  border-radius: $border-radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-main;
    border-color: $border-color;
  }

  &.btn-delete:hover {
    background: rgba($danger, 0.15);
    color: $danger;
    border-color: rgba($danger, 0.3);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  text-align: center;
  background: rgba($bg-secondary, 0.4);
  border: 1px dashed $border-color;
  border-radius: $border-radius-md;
  gap: 8px;

  .empty-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba($accent-blue, 0.08);
    color: $accent-blue;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2px;
  }

  .empty-title {
    font-size: 0.86rem;
    font-weight: 600;
    color: $text-main;
  }

  .empty-desc {
    font-size: 0.74rem;
    color: $text-muted;
    max-width: 240px;
    line-height: 1.4;
    margin-bottom: 4px;
  }

  .btn-add-empty {
    background: rgba($accent-blue, 0.12);
    border: 1px solid rgba($accent-blue, 0.3);
    color: $accent-blue;
    padding: 6px 14px;
    font-size: 0.76rem;
    font-weight: 600;
    border-radius: $border-radius-sm;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: $accent-gradient;
      color: #fff;
      border-color: transparent;
      box-shadow: 0 2px 8px rgba($accent-blue, 0.3);
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid $border-color;
  padding-top: 10px;
  margin-top: 2px;
}

.footer-tip {
  font-size: 0.7rem;
  color: $text-dim;
}

.btn-close {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid $border-color;
  color: $text-muted;
  padding: 5px 14px;
  font-size: 0.76rem;
  font-weight: 500;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: $text-main;
    border-color: rgba(255, 255, 255, 0.2);
  }
}
</style>
