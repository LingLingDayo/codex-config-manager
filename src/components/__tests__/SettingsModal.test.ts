import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { invoke } from '@tauri-apps/api/core';
import SettingsModal from '../settings/SettingsModal.vue';
import { resetSettingsState } from '../../composables/useSettings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('SettingsModal.vue component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    resetSettingsState();
  });

  it('visible 为 false 时不应渲染弹窗主体', () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: false,
      },
    });

    expect(wrapper.find('.settings-fullscreen-overlay').exists()).toBe(false);
  });

  it('visible 为 true 时应正确渲染全屏弹窗、标题、路径选择器以及模型提供商预设切换开关', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: true,
      },
      attachTo: document.body,
    });

    const overlay = document.querySelector('.settings-fullscreen-overlay');
    expect(overlay).not.toBeNull();
    expect(document.querySelector('.settings-title')?.textContent).toBe('设置');
    expect(document.body.innerHTML).toContain('Codex 安装路径');
    expect(document.body.innerHTML).toContain('显示模型提供商预设');

    const switchBtn = document.querySelector('[aria-label="切换显示模型提供商预设"]') as HTMLButtonElement;
    expect(switchBtn).not.toBeNull();
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');

    wrapper.unmount();
  });

  it('点击模型提供商预设开关时应触发保存', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: true,
      },
      attachTo: document.body,
    });

    const switchBtn = document.querySelector('[aria-label="切换显示模型提供商预设"]') as HTMLButtonElement;
    expect(switchBtn).not.toBeNull();

    switchBtn.click();
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('save_app_settings', {
      settings: expect.objectContaining({
        show_provider_presets: false,
      }),
    });

    wrapper.unmount();
  });

  it('点击关闭按钮时应触发 close 事件', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: true,
      },
      attachTo: document.body,
    });

    const closeBtn = document.querySelector('.btn-close-fullscreen') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });
});
