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

  it('visible 为 true 时应正确渲染全屏弹窗、标题及控件', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: true,
        customModel: 'gpt-5-test',
      },
      attachTo: document.body,
    });

    const overlay = document.querySelector('.settings-fullscreen-overlay');
    expect(overlay).not.toBeNull();
    expect(document.querySelector('.settings-header h2')?.textContent).toBe('系统设置');
    expect(document.body.innerHTML).toContain('Codex (ChatGPT) 启动与路径');
    expect(document.body.innerHTML).toContain('模型配置');

    wrapper.unmount();
  });

  it('点击关闭按钮或完成按钮时应触发 close 事件', async () => {
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

    const doneBtn = document.querySelector('.btn-done') as HTMLButtonElement;
    expect(doneBtn).not.toBeNull();
    doneBtn.click();
    expect(wrapper.emitted('close')?.length).toBe(2);

    wrapper.unmount();
  });
});
