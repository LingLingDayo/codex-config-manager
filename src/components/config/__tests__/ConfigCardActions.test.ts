import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfigCardActions from '../ConfigCardActions.vue';

describe('ConfigCardActions.vue component', () => {
  it('正确渲染4个操作按钮', () => {
    const wrapper = mount(ConfigCardActions, {
      props: {
        isLoading: false,
        isLaunching: false,
      },
    });

    const primaryBtn = wrapper.find('button[type="submit"].btn-primary');
    const launchBtn = wrapper.find('.btn-launch');
    const moreBtn = wrapper.find('.btn-more');
    const restoreBtn = wrapper.find('.btn-restore');

    expect(primaryBtn.exists()).toBe(true);
    expect(primaryBtn.text()).toContain('保存配置');

    expect(launchBtn.exists()).toBe(true);
    expect(launchBtn.text()).toContain('启动 Codex');

    expect(moreBtn.exists()).toBe(true);
    expect(moreBtn.attributes('title')).toBe('更多配置');

    expect(restoreBtn.exists()).toBe(true);
    expect(restoreBtn.attributes('title')).toBe('恢复默认配置（清除中转配置，恢复后将变成使用账号登录）');
  });

  it('isLoading 状态下保存配置按钮被禁用且文案变化', () => {
    const wrapper = mount(ConfigCardActions, {
      props: {
        isLoading: true,
      },
    });

    const primaryBtn = wrapper.find('button[type="submit"].btn-primary');
    expect(primaryBtn.attributes('disabled')).toBeDefined();
    expect(primaryBtn.text()).toContain('保存中...');
  });

  it('isLaunching 状态下启动按钮被禁用且文案变化', () => {
    const wrapper = mount(ConfigCardActions, {
      props: {
        isLaunching: true,
      },
    });

    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.attributes('disabled')).toBeDefined();
    expect(launchBtn.text()).toContain('重启中...');
  });

  it('点击启动按钮触发 launch 事件', async () => {
    const wrapper = mount(ConfigCardActions);

    const launchBtn = wrapper.find('.btn-launch');
    await launchBtn.trigger('click');

    expect(wrapper.emitted('launch')).toBeTruthy();
  });

  it('点击更多配置按钮触发 open-drawer 事件', async () => {
    const wrapper = mount(ConfigCardActions);

    const moreBtn = wrapper.find('.btn-more');
    await moreBtn.trigger('click');

    expect(wrapper.emitted('open-drawer')).toBeTruthy();
  });

  it('点击恢复默认按钮触发 restore 事件', async () => {
    const wrapper = mount(ConfigCardActions);

    const restoreBtn = wrapper.find('.btn-restore');
    await restoreBtn.trigger('click');

    expect(wrapper.emitted('restore')).toBeTruthy();
  });
});
