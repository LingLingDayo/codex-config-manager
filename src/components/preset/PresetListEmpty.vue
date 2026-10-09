<script setup lang="ts">
const emit = defineEmits<{
  (e: 'add-preset'): void;
}>();
</script>

<template>
  <div class="empty-state">
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
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  margin: 12px 16px;
  text-align: center;
  background: rgba($bg-secondary, 0.4);
  border: 1px dashed $border-color;
  border-radius: $border-radius-md;
  gap: 8px;
  flex: 1;
  min-height: 0;

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
    border: none;
    outline: none;
    box-shadow: inset 0 0 0 1px rgba($accent-blue, 0.3);
    color: $accent-blue;
    padding: 7px 15px;
    font-size: 0.76rem;
    font-weight: 600;
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
}
</style>
