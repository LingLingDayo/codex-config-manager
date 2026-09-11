import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppHeader from '../AppHeader.vue';

describe('AppHeader.vue component', () => {
  it('当 isEnabled 为 true 时展示已启用状态标记', () => {
    const wrapper = mount(AppHeader, {
      props: {
        isEnabled: true,
      },
    });

    const indicator = wrapper.find('.status-indicator');
    expect(indicator.classes()).toContain('active');
    expect(indicator.classes()).not.toContain('inactive');
    expect(indicator.text()).toContain('API 已启用');
  });

  it('当 isEnabled 为 false 时展示未启用状态标记', () => {
    const wrapper = mount(AppHeader, {
      props: {
        isEnabled: false,
      },
    });

    const indicator = wrapper.find('.status-indicator');
    expect(indicator.classes()).toContain('inactive');
    expect(indicator.classes()).not.toContain('active');
    expect(indicator.text()).toContain('未启用');
  });

  it('应正确渲染标题与副标题文本', () => {
    const wrapper = mount(AppHeader, {
      props: {
        isEnabled: false,
      },
    });

    expect(wrapper.find('h1').text()).toBe('Codex 配置助手');
    expect(wrapper.find('.subtitle').text()).toContain('一键切换不同的接口与模型');
  });


  it('点击设置按钮应触发 open-settings 事件', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        isEnabled: true,
      },
    });

    const settingsBtn = wrapper.find('.btn-header-settings');
    expect(settingsBtn.exists()).toBe(true);

    await settingsBtn.trigger('click');
    expect(wrapper.emitted('open-settings')).toBeTruthy();
  });
});
