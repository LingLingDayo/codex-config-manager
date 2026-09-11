<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import SettingItem from './settings/SettingItem.vue';
import SettingInput from './settings/SettingInput.vue';
import SettingSelect from './settings/SettingSelect.vue';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    modelValue: string;
    reasoningEffort?: string;
  }>(),
  {
    reasoningEffort: '',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:reasoningEffort', value: string): void;
  (e: 'close'): void;
}>();

const reasoningEffortOptions = [
  { label: 'low', value: 'low', description: '低思考强度 (快速响应)' },
  { label: 'medium', value: 'medium', description: '中等思考强度 (推荐平衡)' },
  { label: 'high', value: 'high', description: '高思考强度 (深入推理)' },
  { label: 'minimal', value: 'minimal', description: '极低思考强度' },
  { label: 'xhigh', value: 'xhigh', description: '极高思考强度 (超长推理)' },
];

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
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-backdrop" @click.self="emit('close')">
        <div class="drawer-panel">
          <!-- 抽屉头部与右上角关闭按钮 -->
          <div class="drawer-header">
            <span class="drawer-title">更多配置</span>
            <button
              type="button"
              class="btn-drawer-close"
              title="关闭 (Esc)"
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

          <!-- 抽屉配置项列表主体：默认两列网格布局 -->
          <div class="drawer-content">
            <!-- 自定义模型：占据 1 列 -->
            <SettingItem
              label="自定义模型 (Model)"
              direction="vertical"
              :span="1"
              title="对应 config.toml 中的 model 字段。用于指定兼容 OpenAI 格式的目标模型，留空则使用默认模型。"
            >
              <SettingInput
                id="custom-model-input"
                :model-value="modelValue"
                placeholder="例如: gpt-5.6-sol"
                @update:model-value="emit('update:modelValue', $event)"
                @keydown.enter="emit('close')"
              />
            </SettingItem>

            <!-- 思考强度：占据 1 列，位于自定义模型右侧 -->
            <SettingItem
              label="思考强度 (Reasoning Effort)"
              direction="vertical"
              :span="1"
              title="对应 config.toml 中的 model_reasoning_effort 字段。用于指定推理模型的思考强度。"
            >
              <SettingSelect
                id="reasoning-effort-select"
                :model-value="reasoningEffort"
                :options="reasoningEffortOptions"
                placeholder="例如: low / medium / high"
                :allow-custom="true"
                @update:model-value="emit('update:reasoningEffort', $event)"
                @keydown.enter="emit('close')"
              />
            </SettingItem>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/mixins' as *;

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease;

  .drawer-panel {
    transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;

  .drawer-panel {
    transform: translateY(100%);
  }
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.drawer-panel {
  position: relative;
  width: 100%;
  height: 80%;
  background: $bg-primary;
  border-top-left-radius: $border-radius-lg;
  border-top-right-radius: $border-radius-lg;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 14px 18px 16px;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 14px;
}

.drawer-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: $text-main;
}

.btn-drawer-close {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-main;
  }
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
  align-content: start;
  @include custom-scrollbar;
}
</style>
