<script setup lang="ts">
defineProps<{
  activePresetName?: string;
}>();

const emit = defineEmits<{
  (e: 'open-presets'): void;
  (e: 'save-as-preset'): void;
}>();
</script>

<template>
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
        <path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <h2>当前生效配置</h2>

      <!-- 当前匹配的预设名称徽章 -->
      <span
        v-if="activePresetName"
        class="active-preset-tag"
        :title="`当前匹配预设: ${activePresetName}`"
      >
        <span class="active-preset-dot"></span>
        {{ activePresetName }}
      </span>
    </div>

    <!-- 头部右侧操作组 -->
    <div class="header-actions">
      <!-- 头部预设按钮 -->
      <button
        type="button"
        class="btn-header-preset"
        title="点击打开中转站配置列表"
        @click="emit('open-presets')"
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
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 9 3 3-3 3" />
        </svg>
        <span>配置列表</span>
      </button>

      <!-- 保存配置 -->
      <button
        type="button"
        class="btn-text-action"
        title="将当前填写的配置保存到配置列表"
        @click="emit('save-as-preset')"
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
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          />
        </svg>
        <span>保存配置</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
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
    font-size: 0.94rem;
    font-weight: 600;
    color: $text-main;
    letter-spacing: -0.2px;
  }
}

.active-preset-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.28);
  color: $accent-blue;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .active-preset-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: $accent-blue;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-header-preset {
  background: rgba($accent-blue, 0.1);
  border: 1px solid rgba($accent-blue, 0.25);
  color: $accent-blue;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba($accent-blue, 0.2);
    border-color: $accent-blue;
    color: #fff;
  }

  .header-count-pill {
    background: rgba($accent-blue, 0.25);
    color: #fff;
    font-size: 0.66rem;
    padding: 0 5px;
    border-radius: 8px;
    min-width: 15px;
    text-align: center;
  }
}

.btn-text-action {
  background: transparent;
  border: 1px solid transparent;
  color: $text-muted;
  font-size: 0.74rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-main;
    border-color: $border-color;
  }
}
</style>
