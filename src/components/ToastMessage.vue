<script setup lang="ts">
import { useToast } from '../composables/useToast';

const { message, type, visible } = useToast();
</script>

<template>
  <footer class="app-footer">
    <div class="toast" :class="[type, { hidden: !visible }]">
      <span>{{ message }}</span>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/animations' as *;

.app-footer {
  position: relative;
  min-height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.toast {
  background-color: $bg-tertiary;
  border: 1px solid $border-color;
  padding: 5px 14px;
  border-radius: $border-radius-round;
  font-size: 0.76rem;
  font-weight: 500;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 100;

  &.hidden {
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
  }

  &.success {
    border-color: rgba($success, 0.4);
    color: $success;
    background: rgba($success, 0.08);
  }

  &.error {
    border-color: rgba($danger, 0.4);
    color: $danger;
    background: rgba($danger, 0.08);
  }

  &.warning {
    border-color: rgba($warning, 0.4);
    color: $warning;
    background: rgba($warning, 0.08);
  }

  &.info {
    border-color: rgba($accent-blue, 0.4);
    color: $accent-blue;
    background: rgba($accent-blue, 0.08);
  }
}
</style>
