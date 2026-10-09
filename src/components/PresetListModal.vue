<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { Lightbulb } from '@lucide/vue';
import type { CodexConfig, PresetConfig } from '../types/config';
import { isPresetActive as matchPresetActive } from '../utils/preset';
import { usePresetDragReorder } from '../composables/usePresetDragReorder';
import PresetListItem from './preset/PresetListItem.vue';
import PresetListEmpty from './preset/PresetListEmpty.vue';

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
  (e: 'reorder-presets', fromIndex: number, toIndex: number): void;
}>();

const {
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onListDrop,
  clearTimer,
} = usePresetDragReorder({
  getPresetsCount: () => props.presets.length,
  onReorder: (from, to) => emit('reorder-presets', from, to),
});

const isPresetActive = (preset: PresetConfig): boolean => {
  return matchPresetActive(preset, props.currentConfig);
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
  clearTimer();
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
          <h3>配置列表</h3>
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
      <div
        v-if="presets.length > 0"
        class="preset-list"
        @dragover.prevent
        @drop="onListDrop"
      >
        <PresetListItem
          v-for="(preset, index) in presets"
          :key="preset.id"
          :preset="preset"
          :is-active="isPresetActive(preset)"
          :draggable="presets.length > 1"
          :is-dragging="draggedIndex === index"
          :is-drag-over="dragOverIndex === index"
          @apply="emit('apply-preset', $event)"
          @edit="emit('edit-preset', $event)"
          @delete="emit('delete-preset', $event)"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragenter="onDragEnter($event, index)"
          @dragleave="onDragLeave($event, index)"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
        />
      </div>

      <!-- 空状态 -->
      <PresetListEmpty v-else @add-preset="emit('add-preset')" />

      <!-- 底部操作与提示 -->
      <div class="modal-footer">
        <span class="footer-tip">
          <Lightbulb :size="13" class="tip-icon" />
          <span>点击任意配置项即可立即切换并生效{{ presets.length > 1 ? '，按住可拖拽调整排序' : '' }}</span>
        </span>
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
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: scaleIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  max-height: calc(100vh - 20px);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $border-color;
  padding: 12px 16px 10px;
  flex-shrink: 0;
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
  border: none;
  outline: none;
  box-shadow: inset 0 0 0 1px rgba($accent-blue, 0.3);
  color: $accent-blue;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: $accent-gradient;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 4px rgba($accent-blue, 0.2);
    filter: brightness(1.08);
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 16px;
  @include custom-scrollbar;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid $border-color;
  padding: 10px 16px 12px;
  background: $bg-tertiary;
  flex-shrink: 0;
}

.footer-tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: $text-dim;

  .tip-icon {
    flex-shrink: 0;
    color: $warning;
    opacity: 0.85;
  }
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
