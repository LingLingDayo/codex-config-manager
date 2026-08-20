<script setup lang="ts">
import type { CodexConfig, PresetConfig } from '../types/config';
import { maskKey, normalizeUrl, formatDate } from '../utils/format';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../composables/useToast';

const props = defineProps<{
  presets: PresetConfig[];
  currentConfig: CodexConfig;
}>();

const emit = defineEmits<{
  (e: 'add-preset'): void;
  (e: 'edit-preset', preset: PresetConfig): void;
  (e: 'delete-preset', preset: PresetConfig): void;
  (e: 'apply-preset', preset: PresetConfig): void;
}>();

const { showToast } = useToast();

const isPresetActive = (preset: PresetConfig): boolean => {
  if (!props.currentConfig.is_enabled) return false;
  if (!props.currentConfig.key || !preset.key) return false;
  return (
    preset.key.trim() === props.currentConfig.key.trim() &&
    normalizeUrl(preset.provider_url) === normalizeUrl(props.currentConfig.provider_url)
  );
};

const handleCopyKey = async (key: string) => {
  const success = await copyToClipboard(key);
  if (success) {
    showToast('API Key 已复制到剪贴板');
  } else {
    showToast('复制失败，请手动复制', 'error');
  }
};

const handleCardDblClick = (preset: PresetConfig) => {
  if (!isPresetActive(preset)) {
    emit('apply-preset', preset);
  }
};
</script>

<template>
  <section class="card preset-section">
    <div class="card-header">
      <div class="card-title-group">
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
          class="card-icon"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 9 3 3-3 3" />
        </svg>
        <h2>中转站配置库</h2>
        <span class="count-badge">{{ presets.length }}</span>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-accent"
        title="添加新的中转站配置"
        @click="emit('add-preset')"
      >
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新增配置</span>
      </button>
    </div>

    <!-- 预设卡片列表 -->
    <div v-if="presets.length > 0" class="preset-list">
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="preset-card"
        :class="{ 'is-active': isPresetActive(preset) }"
        @dblclick="handleCardDblClick(preset)"
      >
        <div class="preset-card-top">
          <div class="preset-name-wrap">
            <span class="preset-name" :title="preset.name">{{ preset.name }}</span>
            <span v-if="isPresetActive(preset)" class="active-tag">
              <span class="active-tag-dot"></span>生效中
            </span>
          </div>
          <button
            type="button"
            class="btn-apply-preset"
            :class="{ active: isPresetActive(preset) }"
            :title="isPresetActive(preset) ? '当前已生效' : '一键切换至此配置并生效'"
            @click.stop="!isPresetActive(preset) && emit('apply-preset', preset)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>{{ isPresetActive(preset) ? '当前使用中' : '立即使用' }}</span>
          </button>
        </div>

        <div class="preset-card-body">
          <span class="preset-url-tag" :title="preset.provider_url">
            {{ normalizeUrl(preset.provider_url) }}
          </span>
          <span class="preset-key-preview" title="点击右侧按钮复制完整 Key">
            {{ maskKey(preset.key) }}
          </span>
          <button
            type="button"
            class="btn-copy-key"
            title="复制 API Key"
            @click.stop="handleCopyKey(preset.key)"
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
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
        </div>

        <div class="preset-card-footer">
          <span class="date-text">
            {{ formatDate(preset.updated_at) }}
          </span>
          <div class="preset-actions-right">
            <button
              type="button"
              class="btn-icon-action btn-edit"
              title="编辑此配置"
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
              class="btn-icon-action btn-delete"
              title="删除此配置"
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
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon-wrap">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
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
      <p class="empty-title">暂无中转站预设</p>
      <p class="empty-desc">添加多个常用中转站 Key，随时一键切换使用</p>
      <button type="button" class="btn btn-sm btn-secondary" @click="emit('add-preset')">
        + 立即添加第一个配置
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.preset-section {
  @include glass-card;
  padding: 14px 16px;
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .card-icon {
    color: $accent-blue;
    flex-shrink: 0;
  }

  h2 {
    font-size: 0.92rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.2px;
  }
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

.btn {
  @include button-base;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.76rem;
  border-radius: $border-radius-sm;
}

.btn-accent {
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.3);
  color: $accent-blue;

  &:hover {
    background: $accent-gradient;
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba($accent-blue, 0.3);
  }
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 2px;
  flex: 1;
  @include custom-scrollbar;
}

.preset-card {
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: $bg-tertiary;
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.is-active {
    border-color: rgba($accent-blue, 0.5);
    background: linear-gradient(135deg, rgba($accent-blue, 0.06), rgba($accent-purple, 0.06)),
      $bg-secondary;
    box-shadow: 0 0 12px rgba($accent-blue, 0.15);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: $accent-gradient;
    }
  }
}

.preset-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.preset-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preset-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: $text-main;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba($success, 0.15);
  border: 1px solid rgba($success, 0.3);
  color: $success;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 12px;
  flex-shrink: 0;

  .active-tag-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: $success;
    box-shadow: 0 0 6px $success;
  }
}

.btn-apply-preset {
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.3);
  color: $accent-blue;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
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

  &.active {
    background: rgba($success, 0.15);
    border-color: rgba($success, 0.3);
    color: $success;
    pointer-events: none;
  }
}

.preset-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 6px 10px;
  border-radius: $border-radius-sm;
  font-family: $font-family-mono;
  font-size: 0.74rem;
  gap: 8px;
}

.preset-url-tag {
  color: $accent-blue;
  background: rgba($accent-blue, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-key-preview {
  color: $text-muted;
  flex: 1;
  text-align: right;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-copy-key {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    color: $text-main;
    background: rgba(255, 255, 255, 0.1);
  }
}

.preset-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;

  .date-text {
    font-size: 0.7rem;
    color: $text-dim;
  }
}

.preset-actions-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-icon-action {
  background: transparent;
  border: 1px solid transparent;
  color: $text-muted;
  cursor: pointer;
  padding: 4px;
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
  padding: 24px 12px;
  text-align: center;
  background: rgba($bg-secondary, 0.4);
  border: 1px dashed $border-color;
  border-radius: 10px;
  gap: 8px;
  margin: auto 0;

  .empty-icon-wrap {
    width: 48px;
    height: 48px;
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
    max-width: 260px;
    line-height: 1.4;
    margin-bottom: 4px;
  }

  .btn-secondary {
    background-color: rgba(255, 255, 255, 0.04);
    border-color: $border-color;
    color: $text-muted;

    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
      color: $text-main;
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}
</style>
