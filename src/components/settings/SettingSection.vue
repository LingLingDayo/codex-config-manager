<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <slot name="icon" />
        <h3 class="section-title">{{ title }}</h3>
      </div>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba($bg-secondary, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: $border-radius-lg;
  padding: 14px 16px;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $accent-blue;

  :deep(svg) {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }
}

.section-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: $text-main;
  letter-spacing: -0.2px;
}

.section-description {
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.4;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}
</style>
