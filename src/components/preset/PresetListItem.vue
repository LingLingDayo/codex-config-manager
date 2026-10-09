<script setup lang="ts">
import { GripVertical } from '@lucide/vue';
import type { PresetConfig } from '../../types/config';
import { normalizeUrl } from '../../utils/format';

const props = withDefaults(
  defineProps<{
    preset: PresetConfig;
    isActive: boolean;
    draggable?: boolean;
    isDragging?: boolean;
    isDragOver?: boolean;
  }>(),
  {
    draggable: false,
    isDragging: false,
    isDragOver: false,
  }
);

const emit = defineEmits<{
  (e: 'apply', preset: PresetConfig): void;
  (e: 'edit', preset: PresetConfig): void;
  (e: 'delete', preset: PresetConfig): void;
}>();

const handleRowClick = () => {
  if (props.isDragging) {
    return;
  }
  if (!props.isActive) {
    emit('apply', props.preset);
  }
};
</script>

<template>
  <div
    class="preset-item"
    :class="{
      'is-active': isActive,
      'is-dragging': isDragging,
      'is-drag-over': isDragOver,
    }"
    :title="isActive ? '当前正在生效' : '点击立即切换至此配置'"
    :draggable="draggable"
    @click="handleRowClick"
  >
    <!-- 拖拽把手 (多于1个配置时支持拖拽排序) -->
    <div
      v-if="draggable"
      class="drag-handle"
      title="按住拖拽以调整顺序"
      @click.stop
    >
      <GripVertical :size="13" class="drag-handle-icon" />
    </div>

    <!-- 左侧基本信息 -->
    <div class="preset-info">
      <div class="preset-title-row">
        <span class="status-indicator-dot" :class="{ active: isActive }"></span>
        <span class="preset-name">{{ preset.name }}</span>
      </div>
      <span class="preset-url" :title="preset.provider_url">
        {{ normalizeUrl(preset.provider_url) || '默认 URL' }}
      </span>
    </div>

    <!-- 右侧操作与状态 -->
    <div class="preset-actions" @click.stop @mousedown.stop>
      <span v-if="isActive" class="active-pill">
        <span class="pill-dot"></span>生效中
      </span>
      <button
        v-else
        type="button"
        class="btn-use"
        title="切换并生效"
        @click.stop="emit('apply', preset)"
      >
        切换
      </button>

      <button
        type="button"
        class="btn-action-icon"
        title="编辑配置"
        @click.stop="emit('edit', preset)"
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
        @click.stop="emit('delete', preset)"
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
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.preset-item {
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.18s ease;

  &:hover {
    background: rgba($bg-secondary, 0.95);
    border-color: rgba($accent-blue, 0.35);

    .preset-name {
      color: #fff;
    }

    .drag-handle {
      color: rgba(255, 255, 255, 0.55);
    }
  }

  &.is-dragging {
    opacity: 0.38;
    background: rgba($bg-secondary, 0.45);
    border: 1px dashed rgba($accent-blue, 0.6);
    box-shadow: none;
    cursor: grabbing;

    * {
      pointer-events: none;
    }
  }

  &.is-drag-over {
    border-color: $accent-blue;
    background: rgba($accent-blue, 0.1);
    box-shadow: 0 0 12px rgba($accent-blue, 0.22);
    transform: translateY(-1px);
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

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.26);
  cursor: grab;
  padding: 4px 1px;
  border-radius: $border-radius-xs;
  flex-shrink: 0;
  transition: all 0.18s ease;
  user-select: none;

  &:hover {
    color: $accent-blue;
    background: rgba($accent-blue, 0.12);
  }

  &:active {
    cursor: grabbing;
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
  border: none;
  outline: none;
  box-shadow: inset 0 0 0 1px rgba($accent-blue, 0.25);
  color: $accent-blue;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 11px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: $accent-gradient;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 4px rgba($accent-blue, 0.2);
    filter: brightness(1.08);
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
</style>
