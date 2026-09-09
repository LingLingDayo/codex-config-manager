import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsModal from '../settings/SettingsModal.vue';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('SettingsModal.vue component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('visible 为 false 时不应渲染弹窗主体', () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: false,
      },
    });

    expect(wrapper.find('.settings-fullscreen-overlay').exists()).toBe(false);
  });

  it('visible 为 true 时应正确渲染全屏弹窗、标题及路径选择器', async () => {
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
