<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import SettingSection from './SettingSection.vue';
import SettingItem from './SettingItem.vue';
import SettingSwitch from './SettingSwitch.vue';
import SettingInput from './SettingInput.vue';
import SettingPathPicker from './SettingPathPicker.vue';
import { useSettings } from '../../composables/useSettings';
import { APP_VERSION } from '../../constants/version';

const props = defineProps<{
  visible: boolean;
  customModel?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:customModel', model: string): void;
}>();

const {
  settings,
  detectedPath,
  loadSettings,
  saveSettings,
  pickPath,
} = useSettings();

const localPath = ref<string>('');
const localKillPrevious = ref<boolean>(true);
const localCustomModel = ref<string>('');
const isPicking = ref<boolean>(false);

// 打开弹窗时同步最新数据
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      await loadSettings();
      localPath.value = settings.value.codex_path || '';
      localKillPrevious.value = settings.value.launch_kill_previous;
      localCustomModel.value = props.customModel ?? settings.value.custom_model ?? '';
    }
  },
  { immediate: true }
);

// 监听路径修改，自动保存
watch(localPath, async (newVal) => {
  if (props.visible && newVal !== settings.value.codex_path) {
    await saveSettings({ codex_path: newVal });
  }
});

// 监听杀进程选项修改，自动保存
watch(localKillPrevious, async (newVal) => {
  if (props.visible && newVal !== settings.value.launch_kill_previous) {
    await saveSettings({ launch_kill_previous: newVal });
  }
});

// 监听自定义模型修改，通知父级并保存
watch(localCustomModel, async (newVal) => {
  if (props.visible) {
    emit('update:customModel', newVal);
    if (newVal !== settings.value.custom_model) {
      await saveSettings({ custom_model: newVal });
    }
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
        <!-- 全屏窗口容器 -->
        <div class="settings-fullscreen-container">
          <!-- 弹窗顶栏 -->
          <header class="settings-header">
            <div class="header-left">
              <div class="header-icon-wrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
              </div>
              <div class="header-titles">
                <h2>系统设置</h2>
                <p>应用环境与偏好参数设置</p>
              </div>
            </div>

            <button
              type="button"
              class="btn-close-fullscreen"
              title="关闭设置 (Esc)"
              @click="emit('close')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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

          <!-- 弹窗滚动主体 -->
          <main class="settings-body">
            <!-- 分组 1: Codex / ChatGPT 应用配置 -->
            <SettingSection
              title="Codex (ChatGPT) 启动与路径"
              description="管理 Codex (ChatGPT) 应用程序的定位方式及重启控制"
            >
              <template #icon>
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
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </template>

              <!-- 路径选择器控件 -->
              <SettingItem
                direction="vertical"
                label="安装路径选择器"
                description="指定 ChatGPT/Codex 的安装文件路径。若留空则自动识别系统默认安装位置。"
              >
                <SettingPathPicker
                  v-model="localPath"
                  :detected-path="detectedPath"
                  :is-picking="isPicking"
                  @pick="handlePickPath"
                />
              </SettingItem>

              <!-- 杀死已有进程开关控件 -->
              <SettingItem
                direction="horizontal"
                label="启动时重新拉起"
                description="检测到 ChatGPT 已在运行时，先强制结束旧进程再重新启动。"
              >
                <SettingSwitch v-model="localKillPrevious" aria-label="启动前先结束已有实例" />
              </SettingItem>
            </SettingSection>

            <!-- 分组 2: 模型配置 -->
            <SettingSection
              title="模型配置"
              description="指定 Codex 使用的目标模型名称"
            >
              <template #icon>
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
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </template>

              <SettingItem
                direction="vertical"
                label="自定义模型 (Model)"
                description="对应 config.toml 中的 model 字段。留空则使用模型提供商的默认模型。"
              >
                <SettingInput
                  v-model="localCustomModel"
                  placeholder="例如: gpt-5.6-sol"
                />
              </SettingItem>
            </SettingSection>

            <!-- 分组 3: 系统与环境状态 -->
            <SettingSection
              title="关于与状态"
              description="运行环境信息与当前检测状态"
            >
              <template #icon>
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </template>

              <SettingItem
                direction="horizontal"
                label="应用版本"
                description="Codex 配置助手当前软件版本"
              >
                <span class="info-pill">{{ APP_VERSION }}</span>
              </SettingItem>

              <SettingItem
                direction="horizontal"
                label="自动识别状态"
                description="系统检测到的应用位置"
              >
                <span
                  class="info-pill"
                  :class="{ active: Boolean(detectedPath) }"
                  :title="detectedPath || '未检测到默认安装路径'"
                >
                  {{ detectedPath ? '已就绪' : '未检测到' }}
                </span>
              </SettingItem>
            </SettingSection>
          </main>

          <!-- 弹窗底栏 -->
          <footer class="settings-footer">
            <div class="footer-status">
              <span class="status-dot"></span>
              <span>设置即时自动生效</span>
            </div>

            <button
              type="button"
              class="btn-done"
              @click="emit('close')"
            >
              完成
            </button>
          </footer>
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
  background: rgba($bg-primary, 0.88);
  backdrop-filter: blur(20px);
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
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba($bg-secondary, 0.6);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: $border-radius-md;
  background: rgba($accent-blue, 0.12);
  border: 1px solid rgba($accent-blue, 0.28);
  color: $accent-blue;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-titles {
  h2 {
    font-size: 0.98rem;
    font-weight: 700;
    color: $text-main;
    letter-spacing: -0.2px;
    line-height: 1.2;
  }

  p {
    font-size: 0.72rem;
    color: $text-muted;
    line-height: 1.2;
    margin-top: 1px;
  }
}

.btn-close-fullscreen {
  width: 30px;
  height: 30px;
  border-radius: $border-radius-md;
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
    border-color: rgba(255, 255, 255, 0.18);
  }
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  @include custom-scrollbar;
}

.info-pill {
  font-family: $font-family-mono;
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  color: $text-muted;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.active {
    background: rgba($success, 0.12);
    border-color: rgba($success, 0.3);
    color: $success;
  }
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba($bg-secondary, 0.6);
  flex-shrink: 0;
}

.footer-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: $text-muted;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: $success;
    box-shadow: 0 0 6px rgba($success, 0.6);
  }
}

.btn-done {
  @include button-base;
  padding: 6px 18px;
  font-size: 0.78rem;
  background: $accent-gradient;
  color: #ffffff;
  border: none;
  box-shadow: 0 2px 8px rgba($accent-blue, 0.25);

  &:hover {
    filter: brightness(1.08);
  }
}
</style>
