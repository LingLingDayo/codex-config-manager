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
  aliases: {
    label: '模型别名 (Aliases)',
    title:
      '为中转站模型设置 Codex 选择器中的显示名称。左侧填写模型 ID，右侧填写自定义别名（默认与模型名相同）。保存后写入本工具自管的模型目录文件，重启 Codex 后即可在客户端中看到这些模型。',
  },
} as const;
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SettingItem from '../settings/SettingItem.vue';
import SettingSelect from '../settings/SettingSelect.vue';
import ModelSelect from './ModelSelect.vue';
import ModelAliasList from './ModelAliasList.vue';
import { REASONING_EFFORT_OPTIONS } from '../../types/config';
import type { ModelAlias } from '../../types/config';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    model?: string;
    reasoningEffort?: string;
    modelAliases?: ModelAlias[];
    idPrefix?: string;
    apiKey?: string;
    providerUrl?: string;
  }>(),
  {
    modelValue: '',
    model: '',
    reasoningEffort: '',
    modelAliases: () => [],
    idPrefix: '',
    apiKey: '',
    providerUrl: '',
  }
);

const emit = defineEmits<{
  (e: 'update:model', value: string): void;
  (e: 'update:modelValue', value: string): void;
  (e: 'update:reasoningEffort', value: string): void;
  (e: 'update:modelAliases', value: ModelAlias[]): void;
  (e: 'enter'): void;
}>();

const fetchedModels = ref<string[]>([]);

const resolvedModel = computed(() => props.model || props.modelValue || '');

const modelInputId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-model` : 'custom-model-input'
);
const reasoningSelectId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-reasoning` : 'reasoning-effort-select'
);
const aliasesListId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-aliases` : 'model-aliases'
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
        :seed-models="fetchedModels"
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

    <!-- 模型别名列表 -->
    <SettingItem
      class="field-aliases"
      :label="MORE_CONFIG_META.aliases.label"
      direction="vertical"
      :span="2"
      :title="MORE_CONFIG_META.aliases.title"
    >
      <ModelAliasList
        :id="aliasesListId"
        :model-value="modelAliases"
        :api-key="apiKey"
        :provider-url="providerUrl"
        :id-prefix="idPrefix"
        @update:model-value="emit('update:modelAliases', $event)"
        @fetched="fetchedModels = $event"
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

  .field-aliases {
    grid-column: 1 / -1;
    min-width: 0;
  }
}
</style>
