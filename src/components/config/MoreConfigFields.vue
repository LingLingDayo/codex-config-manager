<script lang="ts">
/**
 * 更多配置字段的统一元数据定义（单一事实来源）
 */
export const MORE_CONFIG_META = {
  model: {
    label: '自定义模型 (Model)',
    title:
      '对应 config.toml 中的 model 字段。用于指定兼容 OpenAI 格式的目标模型，留空则使用默认模型。',
    placeholder: '例如: gpt-5.6-sol',
  },
  reasoningEffort: {
    label: '思考强度 (Reasoning Effort)',
    title:
      '对应 config.toml 中的 model_reasoning_effort 字段。用于配置模型的深度思考与推理强度，请务必选择所选模型实际支持的思考强度档位（若模型不支持思考请设为 none 或留空）。',
    placeholder: '例如: low / medium / high',
  },
  displayName: {
    label: '模型别名 (Display Name)',
    title:
      '为当前自定义模型设置显示别名，Codex 的模型选择器中将直接展示该名称。别名通过 config.toml 的 model_catalog_json 模型目录机制生效（写入该模型的 display_name），依附于上方填写的自定义模型，留空则恢复显示原始模型名。',
    placeholder: '例如: 5.6 Sol',
  },
} as const;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import SettingItem from '../settings/SettingItem.vue';
import SettingInput from '../settings/SettingInput.vue';
import SettingSelect from '../settings/SettingSelect.vue';
import ModelSelect from './ModelSelect.vue';
import { REASONING_EFFORT_OPTIONS } from '../../types/config';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    model?: string;
    reasoningEffort?: string;
    displayName?: string;
    idPrefix?: string;
    fullWidthDisplayName?: boolean;
    apiKey?: string;
    providerUrl?: string;
  }>(),
  {
    modelValue: '',
    model: '',
    reasoningEffort: '',
    displayName: '',
    idPrefix: '',
    fullWidthDisplayName: false,
    apiKey: '',
    providerUrl: '',
  }
);

const emit = defineEmits<{
  (e: 'update:model', value: string): void;
  (e: 'update:modelValue', value: string): void;
  (e: 'update:reasoningEffort', value: string): void;
  (e: 'update:displayName', value: string): void;
  (e: 'enter'): void;
}>();

const resolvedModel = computed(() => props.model || props.modelValue || '');

const modelInputId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-model` : 'custom-model-input'
);
const reasoningSelectId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-reasoning` : 'reasoning-effort-select'
);
const displayNameInputId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-display-name` : 'model-display-name-input'
);

const handleModelUpdate = (val: string) => {
  emit('update:model', val);
  emit('update:modelValue', val);
};
</script>

<template>
  <div class="more-config-fields-grid">
    <!-- 自定义模型 -->
    <SettingItem
      class="field-model"
      :label="MORE_CONFIG_META.model.label"
      direction="vertical"
      :span="1"
      :title="MORE_CONFIG_META.model.title"
    >
      <ModelSelect
        :id="modelInputId"
        :model-value="resolvedModel"
        :api-key="apiKey"
        :provider-url="providerUrl"
        :placeholder="MORE_CONFIG_META.model.placeholder"
        :title="MORE_CONFIG_META.model.title"
        @update:model-value="handleModelUpdate"
        @enter="emit('enter')"
      />
    </SettingItem>

    <!-- 思考强度 -->
    <SettingItem
      class="field-reasoning"
      :label="MORE_CONFIG_META.reasoningEffort.label"
      direction="vertical"
      :span="1"
      :title="MORE_CONFIG_META.reasoningEffort.title"
    >
      <SettingSelect
        :id="reasoningSelectId"
        :model-value="reasoningEffort"
        :options="REASONING_EFFORT_OPTIONS"
        :placeholder="MORE_CONFIG_META.reasoningEffort.placeholder"
        :allow-custom="true"
        :title="MORE_CONFIG_META.reasoningEffort.title"
        @update:model-value="emit('update:reasoningEffort', $event)"
        @keydown.enter="emit('enter')"
      />
    </SettingItem>

    <!-- 模型别名 -->
    <SettingItem
      class="field-display-name"
      :class="{ 'full-width': fullWidthDisplayName }"
      :label="MORE_CONFIG_META.displayName.label"
      direction="vertical"
      :span="fullWidthDisplayName ? 2 : 1"
      :title="MORE_CONFIG_META.displayName.title"
    >
      <SettingInput
        :id="displayNameInputId"
        :model-value="displayName"
        :placeholder="MORE_CONFIG_META.displayName.placeholder"
        :title="MORE_CONFIG_META.displayName.title"
        autocomplete="off"
        @update:model-value="emit('update:displayName', $event)"
        @keydown.enter="emit('enter')"
      />
    </SettingItem>
  </div>
</template>

<style lang="scss" scoped>
.more-config-fields-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;

  .field-model {
    grid-column: 1 / 2;
    min-width: 0;
  }

  .field-reasoning {
    grid-column: 2 / 3;
    min-width: 0;
  }

  .field-display-name {
    grid-column: 1 / 2;
    min-width: 0;

    &.full-width {
      grid-column: 1 / -1;
    }
  }
}
</style>
