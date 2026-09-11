import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, LaunchResult } from '../types/settings';
import { useToast } from './useToast';

const SETTINGS_STORAGE_KEY = 'codex_app_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  codex_path: '',
  custom_model: '',
  launch_kill_previous: true,
};

// 模块级单例状态，确保全局设置在不同组件间保持一致与响应式同步
const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS });
const isLoading = ref<boolean>(false);
const isSaving = ref<boolean>(false);
const isLaunching = ref<boolean>(false);
const detectedPath = ref<string | null>(null);

/**
 * 重置设置状态（供单元测试使用）
 */
export const resetSettingsState = () => {
  settings.value = { ...DEFAULT_APP_SETTINGS };
  isLoading.value = false;
  isSaving.value = false;
  isLaunching.value = false;
  detectedPath.value = null;
};

export function useSettings() {
  const { showToast } = useToast();

  /**
   * 加载设置与默认路径检测
   */
  const loadSettings = async () => {
    isLoading.value = true;
    try {
      // 1. 尝试从 Rust 后端读取设置
      const backendSettings = await invoke<AppSettings>('get_app_settings');
      if (backendSettings) {
        settings.value = {
          ...DEFAULT_APP_SETTINGS,
          ...backendSettings,
        };
      } else {
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          settings.value = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(cached) };
        }
      }
    } catch (e) {
      console.warn('从后端加载设置失败，降级使用本地存储', e);
      const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        try {
          settings.value = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(cached) };
        } catch {
          settings.value = { ...DEFAULT_APP_SETTINGS };
        }
      }
    } finally {
      isLoading.value = false;
    }

    // 尝试获取后端自动识别的安装路径（异步静默执行）
    detectPath().catch(() => {});
  };

  /**
   * 保存设置
   */
  const saveSettings = async (partial: Partial<AppSettings>): Promise<boolean> => {
    isSaving.value = true;
    const updated: AppSettings = {
      ...settings.value,
      ...partial,
    };

    try {
      await invoke('save_app_settings', { settings: updated });
      settings.value = updated;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('保存设置失败', e);
      // 即使后端保存失败，也缓存到本地并更新前端响应式
      settings.value = updated;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      showToast('设置已保存到本地缓存', 'warning');
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * 调起系统文件选择器选择路径
   */
  const pickPath = async (): Promise<string | null> => {
    try {
      const selected = await invoke<string | null>('pick_codex_path');
      if (selected) {
        await saveSettings({ codex_path: selected });
        showToast('已更新应用路径');
        return selected;
      }
      return null;
    } catch (e) {
      console.error('选择应用路径失败', e);
      showToast(typeof e === 'string' ? e : '打开文件选择器失败', 'error');
      return null;
    }
  };

  /**
   * 获取系统自动检测的默认路径
   */
  const detectPath = async (): Promise<string | null> => {
    try {
      const path = await invoke<string | null>('detect_codex_path');
      detectedPath.value = path;
      return path;
    } catch (e) {
      console.warn('自动检测安装路径异常', e);
      return null;
    }
  };

  /**
   * 启动/重启 Codex 应用
   */
  const launchApp = async (): Promise<LaunchResult | null> => {
    if (isLaunching.value) return null;
    isLaunching.value = true;

    try {
      const result = await invoke<LaunchResult>('launch_codex_app');
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message || '启动应用失败', 'error');
      }
      return result;
    } catch (e) {
      console.error('启动 Codex 应用失败', e);
      const errMsg = typeof e === 'string' ? e : '启动应用失败，请检查设置中的安装路径';
      showToast(errMsg, 'error');
      return null;
    } finally {
      isLaunching.value = false;
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    isLaunching,
    detectedPath,
    loadSettings,
    saveSettings,
    pickPath,
    detectPath,
    launchApp,
  };
}
