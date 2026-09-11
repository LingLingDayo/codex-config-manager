import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { invoke } from '@tauri-apps/api/core';
import App from '../App.vue';
import { resetSettingsState } from '../composables/useSettings';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('App.vue - 启动 Codex 安装路径检测测试', () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSettingsState();
  });

  it('未检测到安装路径时点击启动，应提示用户去设置中进行配置且不调用启动指令', async () => {
    mockedInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'get_codex_config') {
        return { key: 'test-key', provider_url: 'https://api.test.com/v1', is_enabled: true };
      }
      if (cmd === 'get_app_settings') {
        return { codex_path: '', custom_model: '', launch_kill_previous: true };
      }
      if (cmd === 'detect_codex_path') {
        return null;
      }
      return null;
    });

    const wrapper = mount(App, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 20));

    const { message, type } = useToast();
    const { confirmState, handleConfirm } = useConfirm();

    // 点击启动按钮
    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.exists()).toBe(true);
    await launchBtn.trigger('click');
    await new Promise((r) => setTimeout(r, 20));

    // 应弹出 Toast 提示
    expect(message.value).toContain('未检测到 Codex 安装路径，请前往设置中进行配置');
    expect(type.value).toBe('warning');

    // 应弹出确认弹窗引导前往设置
    expect(confirmState.value.visible).toBe(true);
    expect(confirmState.value.message).toContain('未检测到 Codex 安装路径');
    expect(confirmState.value.confirmText).toBe('前往设置');

    // 未调用 launch_codex_app
    expect(mockedInvoke).not.toHaveBeenCalledWith('launch_codex_app');

    // 点击“前往设置”确认按钮，应打开全屏设置弹窗
    handleConfirm();
    await new Promise((r) => setTimeout(r, 20));

    expect(document.querySelector('.settings-fullscreen-overlay')).not.toBeNull();

    wrapper.unmount();
  });

  it('已配置安装路径时点击启动，应正常执行保存与启动指令', async () => {
    mockedInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'get_codex_config') {
        return { key: 'test-key', provider_url: 'https://api.test.com/v1', is_enabled: true };
      }
      if (cmd === 'get_app_settings') {
        return {
          codex_path: 'C:\\Program Files\\ChatGPT\\ChatGPT.exe',
          custom_model: '',
          launch_kill_previous: true,
        };
      }
      if (cmd === 'save_codex_config') {
        return undefined;
      }
      if (cmd === 'launch_codex_app') {
        return {
          success: true,
          killed_previous: false,
          message: '已成功启动 ChatGPT',
          target: 'ChatGPT.exe',
        };
      }
      return null;
    });

    const wrapper = mount(App, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 20));

    const { confirmState } = useConfirm();

    const launchBtn = wrapper.find('.btn-launch');
    await launchBtn.trigger('click');
    await new Promise((r) => setTimeout(r, 50));

    // 不应弹出“未检测到路径”确认弹窗
    expect(confirmState.value.visible).toBe(false);

    // 应调用 launch_codex_app
    expect(mockedInvoke).toHaveBeenCalledWith('launch_codex_app');

    wrapper.unmount();
  });

  it('未手动配置但系统自动检测到有效路径时，应正常拉起应用', async () => {
    mockedInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'get_codex_config') {
        return { key: 'test-key', provider_url: 'https://api.test.com/v1', is_enabled: true };
      }
      if (cmd === 'get_app_settings') {
        return { codex_path: '', custom_model: '', launch_kill_previous: true };
      }
      if (cmd === 'detect_codex_path') {
        return 'C:\\Users\\admin\\AppData\\Local\\Programs\\ChatGPT\\ChatGPT.exe';
      }
      if (cmd === 'save_codex_config') {
        return undefined;
      }
      if (cmd === 'launch_codex_app') {
        return {
          success: true,
          killed_previous: false,
          message: '已成功启动 ChatGPT',
          target: 'ChatGPT.exe',
        };
      }
      return null;
    });

    const wrapper = mount(App, {
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 20));

    const { confirmState } = useConfirm();

    const launchBtn = wrapper.find('.btn-launch');
    await launchBtn.trigger('click');
    await new Promise((r) => setTimeout(r, 50));

    // 不应弹出提示弹窗
    expect(confirmState.value.visible).toBe(false);

    // 应正常调用 launch_codex_app
    expect(mockedInvoke).toHaveBeenCalledWith('launch_codex_app');

    wrapper.unmount();
  });
});
