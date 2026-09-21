<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from '../../composables/useToast';
import { fetchProviderModels } from '../../utils/modelFetcher';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    apiKey?: string;
    providerUrl?: string;
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
    id?: string;
    title?: string;
  }>(),
  {
    modelValue: '',
    apiKey: '',
    providerUrl: '',
    placeholder: '例如: gpt-5.6-sol 或下拉选择',
    disabled: false,
    clearable: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'enter'): void;
}>();

const { showToast } = useToast();

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref<boolean>(false);
const isLoading = ref<boolean>(false);

// 模型列表缓存机制
const cachedModels = ref<string[]>([]);
const lastFetchedKey = ref<string>('');
const lastFetchedUrl = ref<string>('');
const filterText = ref<string>('');

// 当 key 或 url 变更时，自动失效过往缓存
watch(
  () => [props.apiKey, props.providerUrl],
  ([newKey, newUrl]) => {
    if (newKey !== lastFetchedKey.value || newUrl !== lastFetchedUrl.value) {
      cachedModels.value = [];
      lastFetchedKey.value = '';
      lastFetchedUrl.value = '';
    }
  }
);

// 过滤后的模型列表：若用户在下拉打开期间输入，支持即时模糊筛选
const filteredModels = computed<string[]>(() => {
  const query = filterText.value.trim().toLowerCase();
  if (!query) {
    return cachedModels.value;
  }
  return cachedModels.value.filter((m) => m.toLowerCase().includes(query));
});

// 核心请求逻辑
const performFetch = async (url: string, key: string, isManualRefresh = false) => {
  isLoading.value = true;
  try {
    const models = await fetchProviderModels(url, key);
    cachedModels.value = models;
    lastFetchedKey.value = key;
    lastFetchedUrl.value = url;
    filterText.value = '';

    if (models.length === 0) {
      showToast('未从中转站获取到任何可用模型', 'warning');
    } else {
      isOpen.value = true;
      showToast(
        isManualRefresh
          ? `已刷新，共获取到 ${models.length} 个可用模型`
          : `已成功获取 ${models.length} 个可用模型`,
        'success'
      );
    }
  } catch (err: any) {
    const errorMsg = err?.message || '获取模型列表失败';
    showToast(errorMsg, 'error');
  } finally {
    isLoading.value = false;
  }
};

// 点击右侧下拉按钮
const handleDropdownClick = async () => {
  if (props.disabled || isLoading.value) return;

  // 若当前已处于展开状态，则收起
  if (isOpen.value) {
    isOpen.value = false;
    return;
  }

  const key = props.apiKey?.trim() || '';
  const url = props.providerUrl?.trim() || '';

  // 严格校验前置必填项
  if (!key && !url) {
    showToast('请先配置 API Key 和中转站地址', 'warning');
    return;
  }
  if (!key) {
    showToast('请先配置 API Key', 'warning');
    return;
  }
  if (!url) {
    showToast('请先配置中转站地址', 'warning');
    return;
  }

  // 若当前 key 与 url 已成功拉取过且存在模型数据，直接展开并重置过滤文本
  if (
    cachedModels.value.length > 0 &&
    lastFetchedKey.value === key &&
    lastFetchedUrl.value === url
  ) {
    filterText.value = '';
    isOpen.value = true;
    return;
  }

  // 否则发起实际远程请求
  await performFetch(url, key);
};

// 点击下拉面板内的“刷新”按钮强制重新拉取
const handleRefreshClick = async (event: MouseEvent) => {
  event.stopPropagation();
  const key = props.apiKey?.trim() || '';
  const url = props.providerUrl?.trim() || '';
  if (!key || !url || isLoading.value) return;

  await performFetch(url, key, true);
};

// 选中某个模型选项
const selectModel = (model: string) => {
  emit('update:modelValue', model);
  emit('change', model);
  isOpen.value = false;
  filterText.value = '';
  inputRef.value?.focus();
};

// 键盘与输入事件
const handleInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value;
  filterText.value = val;
  emit('update:modelValue', val);
  emit('change', val);
};

// 清空当前输入
const handleClear = (event: MouseEvent) => {
  event.stopPropagation();
  if (props.disabled) return;
  emit('update:modelValue', '');
  emit('change', '');
  filterText.value = '';
  inputRef.value?.focus();
};

// 键盘快捷键监听
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isOpen.value) {
      e.stopPropagation();
      isOpen.value = false;
    }
  } else if (e.key === 'Enter') {
    if (isOpen.value) {
      isOpen.value = false;
    }
    emit('enter');
  }
};

// 点击外部区域收起下拉菜单
const handleClickOutside = (event: PointerEvent | MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('pointerdown', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleClickOutside);
});
</script>

<template>
  <div
    ref="containerRef"
    class="model-select"
    :class="{ disabled, 'is-open': isOpen }"
    @keydown="handleKeyDown"
  >
    <!-- 输入与触发框 -->
    <div class="input-trigger" :title="title">
      <input
        ref="inputRef"
        :id="id"
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :title="title"
        class="model-select-input"
        :class="{ 'has-clear': clearable && modelValue }"
        autocomplete="off"
        @input="handleInput"
        @blur="emit('blur', $event)"
      />

      <!-- 右侧操作栏（清空与下拉按钮） -->
      <div class="actions-wrapper">
        <button
          v-if="clearable && modelValue && !disabled"
          type="button"
          class="btn-icon btn-clear"
          title="清空"
          @click="handleClear"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <!-- 下拉/获取模型列表按钮 -->
        <button
          type="button"
          class="btn-icon btn-dropdown"
          :class="{ rotated: isOpen && !isLoading, 'is-loading': isLoading }"
          :title="isLoading ? '正在获取模型列表...' : isOpen ? '收起模型列表' : '获取并展开可用模型列表'"
          :disabled="disabled || isLoading"
          tabindex="-1"
          @click.stop="handleDropdownClick"
        >
          <svg
            v-if="isLoading"
            class="spin"
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
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 下拉选项菜单 -->
    <Transition name="select-dropdown">
      <div v-if="isOpen && !disabled" class="model-dropdown-menu">
        <!-- 顶部状态栏与刷新操作 -->
        <div class="dropdown-header">
          <span class="models-count">
            {{
              filteredModels.length === cachedModels.length
                ? `共 ${cachedModels.length} 个模型`
                : `已匹配 ${filteredModels.length} / ${cachedModels.length} 个`
            }}
          </span>
          <button
            type="button"
            class="btn-refresh"
            title="重新从中转站拉取最新模型列表"
            :disabled="isLoading"
            @click="handleRefreshClick"
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
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>刷新</span>
          </button>
        </div>

        <!-- 选项列表 -->
        <ul class="dropdown-list">
          <li
            v-for="item in filteredModels"
            :key="item"
            class="dropdown-item"
            :class="{ active: modelValue.trim() === item.trim() }"
            :title="item"
            @click.stop="selectModel(item)"
          >
            <span class="item-label">{{ item }}</span>
            <svg
              v-if="modelValue.trim() === item.trim()"
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="check-icon"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </li>
          <li v-if="filteredModels.length === 0 && cachedModels.length > 0" class="empty-tip">
            无匹配模型，回车即可作为自定义名称
          </li>
          <li v-if="cachedModels.length === 0" class="empty-tip">
            暂无可用模型
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.model-select {
  position: relative;
  width: 100%;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.input-trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.model-select-input {
  @include input-base;
  padding-right: 48px;
  font-size: 0.82rem;
  font-family: $font-family-mono;
  width: 100%;

  &.has-clear {
    padding-right: 66px;
  }
}

.actions-wrapper {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
}

.btn-icon {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: $border-radius-sm;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: $text-main;
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-dropdown {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
    color: $accent-blue;
  }

  &.is-loading {
    color: $accent-blue;
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

.model-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1200;
  background: $bg-secondary;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: $border-radius-md;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  max-height: 190px;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 3px;
}

.models-count {
  font-size: 0.72rem;
  color: $text-muted;
  user-select: none;
}

.btn-refresh {
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
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba($accent-blue, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 145px;
  @include custom-scrollbar;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: rgba($accent-blue, 0.14);
    color: $accent-blue;

    .item-label {
      color: $accent-blue;
      font-weight: 600;
    }
  }
}

.item-label {
  font-size: 0.78rem;
  color: $text-main;
  font-family: $font-family-mono;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  color: $accent-blue;
  flex-shrink: 0;
  margin-left: 6px;
}

.empty-tip {
  padding: 8px;
  text-align: center;
  font-size: 0.74rem;
  color: $text-muted;
}

/* 动效 */
.select-dropdown-enter-active,
.select-dropdown-leave-active {
  transition: opacity 0.16s ease, transform 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.select-dropdown-enter-from,
.select-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
