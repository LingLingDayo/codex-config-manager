<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    description?: string;
    direction?: 'horizontal' | 'vertical';
    required?: boolean;
    span?: 1 | 2 | '1' | '2';
    title?: string;
  }>(),
  {
    direction: 'horizontal',
    required: false,
    span: 2,
  }
);
</script>

<template>
  <div class="setting-item" :class="[direction, `col-span-${span}`]">
    <div class="item-info">
      <div class="item-label-wrap" :title="title">
        <span class="item-label">{{ label }}</span>
        <span v-if="required" class="required-mark">*</span>
      </div>
      <p v-if="description" class="item-desc">{{ description }}</p>
    </div>
    <div class="item-control">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;

.setting-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;

  &.col-span-1 {
    grid-column: span 1;
    min-width: 0;
  }

  &.col-span-2 {
    grid-column: span 2;
    min-width: 0;
  }

  &.horizontal {
    align-items: center;

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-control {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
  }

  &.vertical {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;

    .item-control {
      width: 100%;
    }
  }
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-label-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: $text-main;
}

.required-mark {
  color: $danger;
  font-size: 0.8rem;
}

.item-desc {
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.35;
}
</style>
