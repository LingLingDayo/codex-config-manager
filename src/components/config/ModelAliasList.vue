<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { ModelAlias } from '../../types/config';
import {
  cloneModelAliases,
  mergeFetchedModels,
  modelAliasesEqual,
  normalizeModelAliases,
} from '../../utils/modelAliases';
import { fetchProviderModels } from '../../utils/modelFetcher';

interface AliasRow extends ModelAlias {
  id: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: ModelAlias[];
    apiKey?: string;
    providerUrl?: string;
    autoFetch?: boolean;
    idPrefix?: string;
  }>(),
  {
    modelValue: () => [],
    apiKey: '',
    providerUrl: '',
    autoFetch: true,
    idPrefix: '',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelAlias[]): void;
  (e: 'fetched', models: string[]): void;
}>();

let rowSeq = 0;
const nextRowId = () => `${props.idPrefix || 'alias'}-${++rowSeq}`;

const toRows = (list?: ModelAlias[] | null): AliasRow[] =>
  cloneModelAliases(list).map((item) => ({ ...item, id: nextRowId() }));

const rows = ref<AliasRow[]>(toRows(props.modelValue));
const fetchedModels = ref<string[]>([]);
const isLoading = ref(false);
const fetchError = ref('');
const hasFetched = ref(false);
const autoFilled = ref(false);

const datalistId = computed(() =>
  props.idPrefix ? `${props.idPrefix}-model-alias-options` : 'model-alias-options'
);

const statusText = computed(() => {
  if (isLoading.value) return '正在获取模型列表...';
  if (fetchError.value) return fetchError.value;
  if (hasFetched.value) {
    return fetchedModels.value.length
      ? `已获取 ${fetchedModels.value.length} 个模型`
      : '未从中转站获取到可用模型';
  }
  if (!props.apiKey.trim() || !props.providerUrl.trim()) {
    return '配置 Key 与中转站地址后将自动获取模型';
  }
  return '展开后将自动获取模型列表';
});

const emitRows = () => {
  emit(
    'update:modelValue',
    rows.value.map((row) => ({ slug: row.slug, display_name: row.display_name }))
  );
};

watch(
  () => props.modelValue,
  (value) => {
    const incoming = cloneModelAliases(value);
    const current = rows.value.map((row) => ({
      slug: row.slug,
      display_name: row.display_name,
    }));
    if (modelAliasesEqual(incoming, current)) return;
    rows.value = toRows(incoming);
  },
  { deep: true }
);

const handleSlugInput = (row: AliasRow, value: string) => {
  const previous = row.slug;
  row.slug = value;
  if (!row.display_name.trim() || row.display_name === previous) {
    row.display_name = value;
  }
  emitRows();
};

const handleAliasInput = (row: AliasRow, value: string) => {
  row.display_name = value;
  emitRows();
};

const addRow = (slug = '', displayName = '') => {
  rows.value.push({
    id: nextRowId(),
    slug,
    display_name: displayName || slug,
  });
  emitRows();
};

const removeRow = (id: string) => {
  rows.value = rows.value.filter((row) => row.id !== id);
  emitRows();
};

const applyFetchedModels = (models: string[], merge: boolean) => {
  fetchedModels.value = models;
  hasFetched.value = true;
  emit('fetched', models);

  const current = rows.value.map((row) => ({
    slug: row.slug,
    display_name: row.display_name,
  }));
  const normalized = normalizeModelAliases(current);

  if (!merge && (normalized.length > 0 || autoFilled.value)) {
    return;
  }

  const next = mergeFetchedModels(current, models);
  if (modelAliasesEqual(current, next)) {
    if (next.length > 0) autoFilled.value = true;
    return;
  }
  rows.value = toRows(next);
  autoFilled.value = true;
  emitRows();
};

const performFetch = async (isManual = false) => {
  const key = props.apiKey.trim();
  const url = props.providerUrl.trim();
  if (!key || !url || isLoading.value) return;

  isLoading.value = true;
  fetchError.value = '';
  try {
    const models = await fetchProviderModels(url, key);
    applyFetchedModels(models, isManual);
  } catch (err: any) {
    fetchError.value = err?.message || '获取模型列表失败';
    hasFetched.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (props.autoFetch && props.apiKey.trim() && props.providerUrl.trim()) {
    void performFetch(false);
  }
});
</script>

<template>
  <div class="model-alias-list">
    <div class="list-toolbar">
      <span class="list-status" :class="{ error: Boolean(fetchError), loading: isLoading }">
        {{ statusText }}
      </span>
      <div class="toolbar-actions">
        <button
          type="button"
          class="btn-text"
          title="重新获取并补充尚未加入的模型"
          :disabled="isLoading || !apiKey.trim() || !providerUrl.trim()"
          @click="performFetch(true)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :class="{ spin: isLoading }"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>刷新</span>
        </button>
        <button type="button" class="btn-text" title="新增一项模型别名" @click="addRow()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
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
          <span>新增</span>
        </button>
      </div>
    </div>

    <div class="list-head">
      <span>模型</span>
      <span>别名</span>
      <span class="head-action"></span>
    </div>

    <div v-if="rows.length === 0" class="list-empty">
      暂无模型别名，获取成功后将自动填入，也可手动新增
    </div>

    <div v-else class="list-body">
      <div v-for="row in rows" :key="row.id" class="alias-row">
        <input
          :id="`${row.id}-slug`"
          class="alias-input"
          type="text"
          :value="row.slug"
          :list="datalistId"
          placeholder="模型 ID"
          autocomplete="off"
          @input="handleSlugInput(row, ($event.target as HTMLInputElement).value)"
        />
        <input
          :id="`${row.id}-alias`"
          class="alias-input"
          type="text"
          :value="row.display_name"
          placeholder="显示别名"
          autocomplete="off"
          @input="handleAliasInput(row, ($event.target as HTMLInputElement).value)"
        />
        <button
          type="button"
          class="btn-remove"
          title="删除此项"
          @click="removeRow(row.id)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>

    <datalist :id="datalistId">
      <option v-for="model in fetchedModels" :key="model" :value="model" />
    </datalist>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.model-alias-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.list-status {
  font-size: 0.7rem;
  color: $text-muted;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.loading {
    color: $accent-blue;
  }

  &.error {
    color: $danger;
  }
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.btn-text {
  background: transparent;
  border: none;
  color: $accent-blue;
  font-size: 0.72rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  border-radius: $border-radius-sm;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba($accent-blue, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.list-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 22px;
  gap: 6px;
  padding: 0 2px;
  font-size: 0.68rem;
  color: $text-dim;
  user-select: none;
}

.list-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 132px;
  overflow-y: auto;
  padding-right: 2px;
  @include custom-scrollbar;
}

.alias-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 22px;
  gap: 6px;
  align-items: center;
}

.alias-input {
  @include input-base;
  padding: 6px 8px;
  font-size: 0.76rem;
  font-family: $font-family-mono;
  min-width: 0;
}

.btn-remove {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: $border-radius-sm;
  transition: all 0.15s ease;

  &:hover {
    color: $danger;
    background: rgba($danger, 0.12);
  }
}

.list-empty {
  padding: 10px 8px;
  text-align: center;
  font-size: 0.72rem;
  color: $text-muted;
  line-height: 1.4;
}
</style>
