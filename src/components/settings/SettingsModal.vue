<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import SettingPathPicker from './SettingPathPicker.vue';
import { useSettings } from '../../composables/useSettings';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const {
  settings,
  detectedPath,
  loadSettings,
  saveSettings,
  pickPath,
} = useSettings();

const localPath = ref<string>('');
const isPicking = ref<boolean>(false);

// 打开弹窗时加载数据
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      await loadSettings();
      localPath.value = settings.value.codex_path || '';
    }
  },
  { immediate: true }
);

// 路径变化自动保存
watch(localPath, async (newVal) => {
  if (props.visible && newVal !== settings.value.codex_path) {
    await saveSettings({ codex_path: newVal });
  }
});

const handlePickPath = async () => {
  isPicking.value = true;
  try {
    const selected = await pickPath();
    if (selected) {
      localPath.value = selected;
    }
  } finally {
    isPicking.value = false;
  }
};

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
    <Transition name="fullscreen-modal">
      <div v-if="visible" class="settings-fullscreen-overlay">
        <div class="settings-fullscreen-container">
          <!-- 顶栏：标题与关闭按钮 -->
          <header class="settings-header">
            <h2 class="settings-title">设置</h2>

            <button
              type="button"
              class="btn-close-fullscreen"
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
          </header>

          <!-- 主体：简洁无框平铺的设置项 -->
          <main class="settings-body">
            <div class="setting-item">
              <label
                class="setting-label"
                title="选择 ChatGPT / Codex 的安装路径，留空则自动识别系统默认安装路径"
              >
                Codex 安装路径
              </label>

              <SettingPathPicker
                v-model="localPath"
                :detected-path="detectedPath"
                :is-picking="isPicking"
                @pick="handlePickPath"
              />
            </div>
          </main>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.fullscreen-modal-enter-active,
.fullscreen-modal-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

  .settings-fullscreen-container {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  }
}

.fullscreen-modal-enter-from,
.fullscreen-modal-leave-to {
  opacity: 0;

  .settings-fullscreen-container {
    transform: scale(0.97);
    opacity: 0;
  }
}

.settings-fullscreen-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1200;
  background: rgba($bg-primary, 0.94);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-fullscreen-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba($bg-secondary, 0.4);
  flex-shrink: 0;
}

.settings-title {
  font-size: 0.96rem;
  font-weight: 700;
  color: $text-main;
  letter-spacing: -0.2px;
}

.btn-close-fullscreen {
  width: 28px;
  height: 28px;
  border-radius: $border-radius-sm;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: $text-main;
  }
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  @include custom-scrollbar;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  /* 扁平无边框，融入页面底色，避免卡片套卡片感 */
  background: transparent;
  border: none;
  padding: 0;
}

.setting-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: $text-main;
  cursor: help;
  width: fit-content;
}
</style>
