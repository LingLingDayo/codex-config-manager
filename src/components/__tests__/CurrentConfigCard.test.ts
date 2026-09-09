import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CurrentConfigCard from '../CurrentConfigCard.vue';
import type { CodexConfig } from '../../types/config';

const mockConfig: CodexConfig = {
  key: 'sk-test-key-123456',
  provider_url: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  is_enabled: true,
};

describe('CurrentConfigCard.vue component', () => {
  it('正确渲染保存配置按钮及其文案', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: false,
      },
    });

    const saveBtn = wrapper.find('button[type="submit"].btn-primary');
    expect(saveBtn.exists()).toBe(true);
    expect(saveBtn.text()).toContain('保存配置');
  });

  it('isLoading 为 true 时保存配置按钮显示保存中且处于禁用状态', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: true,
        isLaunching: false,
      },
    });

    const saveBtn = wrapper.find('button[type="submit"].btn-primary');
    expect(saveBtn.attributes('disabled')).toBeDefined();
    expect(saveBtn.text()).toContain('保存中...');
  });

  it('点击启动按钮应触发 launch-app 事件，且具备指定 hover 提示', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: false,
      },
    });

    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.exists()).toBe(true);
    expect(launchBtn.text()).toContain('启动Codex');
    expect(launchBtn.attributes('title')).toBe('以当前配置启动Codex/ChatGPT');

    await launchBtn.trigger('click');
    expect(wrapper.emitted('launch-app')).toBeTruthy();
  });

  it('isLaunching 为 true 时启动按钮处于禁用状态且文案变为重启中', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: true,
      },
    });

    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.attributes('disabled')).toBeDefined();
    expect(launchBtn.text()).toContain('重启中...');
  });

  it('更多配置按钮仅为图标，且具备更多配置 hover 提示', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
      },
    });

    const moreBtn = wrapper.find('.btn-more');
    expect(moreBtn.exists()).toBe(true);
    expect(moreBtn.text()).toBe(''); // 纯图标无文字
    expect(moreBtn.attributes('title')).toBe('更多配置');
  });

  it('恢复默认按钮仅为图标，且具备回复默认配置 hover 提示与触发 restore-default', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
      },
    });

    const restoreBtn = wrapper.find('.btn-restore');
    expect(restoreBtn.exists()).toBe(true);
    expect(restoreBtn.text()).toBe(''); // 纯图标无文字
    expect(restoreBtn.attributes('title')).toBe('回复默认配置');

    await restoreBtn.trigger('click');
    expect(wrapper.emitted('restore-default')).toBeTruthy();
  });
});
