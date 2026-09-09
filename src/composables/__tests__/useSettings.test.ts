import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../useSettings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('useSettings composable', () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('loadSettings', () => {
    it('成功从后端获取设置时，应正确更新 settings', async () => {
      mockedInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'get_app_settings') {
          return {
            codex_path: 'C:\\Program Files\\ChatGPT\\ChatGPT.exe',
            custom_model: 'gpt-4o',
            launch_kill_previous: true,
          };
        }
        if (cmd === 'detect_codex_path') {
          return 'C:\\Program Files\\ChatGPT\\ChatGPT.exe';
        }
        return null;
      });

      const { settings, loadSettings, detectedPath } = useSettings();
      await loadSettings();

      expect(settings.value.codex_path).toBe('C:\\Program Files\\ChatGPT\\ChatGPT.exe');
      expect(settings.value.custom_model).toBe('gpt-4o');
      expect(settings.value.launch_kill_previous).toBe(true);
      expect(detectedPath.value).toBe('C:\\Program Files\\ChatGPT\\ChatGPT.exe');
    });

    it('后端异常时应降级从 localStorage 读取设置', async () => {
      localStorage.setItem(
        'codex_app_settings',
        JSON.stringify({
          codex_path: 'D:\\Codex\\ChatGPT.exe',
          custom_model: 'o1',
          launch_kill_previous: false,
        })
      );
      mockedInvoke.mockRejectedValueOnce(new Error('Backend error'));

      const { settings, loadSettings } = useSettings();
      await loadSettings();

      expect(settings.value.codex_path).toBe('D:\\Codex\\ChatGPT.exe');
      expect(settings.value.custom_model).toBe('o1');
      expect(settings.value.launch_kill_previous).toBe(false);
    });
  });

  describe('saveSettings', () => {
    it('保存设置应调用后端并同步至 localStorage', async () => {
      mockedInvoke.mockResolvedValueOnce(undefined);

      const { settings, saveSettings } = useSettings();
      const success = await saveSettings({
        codex_path: 'E:\\ChatGPT.exe',
        custom_model: 'gpt-4.5',
      });

      expect(success).toBe(true);
      expect(settings.value.codex_path).toBe('E:\\ChatGPT.exe');
      expect(settings.value.custom_model).toBe('gpt-4.5');

      const saved = JSON.parse(localStorage.getItem('codex_app_settings') || '{}');
      expect(saved.codex_path).toBe('E:\\ChatGPT.exe');
      expect(saved.custom_model).toBe('gpt-4.5');
    });
  });

  describe('launchApp', () => {
    it('调用启动指令应返回结果并更新状态', async () => {
      mockedInvoke.mockResolvedValueOnce({
        success: true,
        killed_previous: true,
        message: '已结束已运行实例并重新启动 ChatGPT',
        target: 'ChatGPT.exe',
      });

      const { isLaunching, launchApp } = useSettings();
      expect(isLaunching.value).toBe(false);

      const promise = launchApp();
      expect(isLaunching.value).toBe(true);

      const res = await promise;
      expect(isLaunching.value).toBe(false);
      expect(res?.success).toBe(true);
      expect(res?.killed_previous).toBe(true);
    });

    it('启动发生异常时应捕获并重置 isLaunching', async () => {
      mockedInvoke.mockRejectedValueOnce('未找到安装程序');

      const { isLaunching, launchApp } = useSettings();
      const res = await launchApp();

      expect(isLaunching.value).toBe(false);
      expect(res).toBeNull();
    });
  });
});
