import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfigCardHeader from '../ConfigCardHeader.vue';

describe('ConfigCardHeader.vue component', () => {
  it('正确渲染标题和默认状态', () => {
    const wrapper = mount(ConfigCardHeader);

    expect(wrapper.find('h2').text()).toBe('当前生效配置');
    expect(wrapper.find('.active-preset-tag').exists()).toBe(false);
  });

  it('传入 activePresetName 时展示预设徽章', () => {
    const wrapper = mount(ConfigCardHeader, {
      props: {
        activePresetName: '测试预设节点',
      },
    });

    const tag = wrapper.find('.active-preset-tag');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toContain('测试预设节点');
    expect(tag.attributes('title')).toBe('当前匹配预设: 测试预设节点');
  });

  it('点击配置列表按钮触发 open-presets 事件', async () => {
    const wrapper = mount(ConfigCardHeader);

    const presetListBtn = wrapper.find('.btn-header-preset');
    expect(presetListBtn.exists()).toBe(true);
    await presetListBtn.trigger('click');

    expect(wrapper.emitted('open-presets')).toBeTruthy();
  });

  it('点击保存配置按钮触发 save-as-preset 事件', async () => {
    const wrapper = mount(ConfigCardHeader);

    const savePresetBtn = wrapper.find('.btn-text-action');
    expect(savePresetBtn.exists()).toBe(true);
    await savePresetBtn.trigger('click');

    expect(wrapper.emitted('save-as-preset')).toBeTruthy();
  });

  it('默认状态未保存时，星标图标为无填充且按钮无 is-saved 类', () => {
    const wrapper = mount(ConfigCardHeader, {
      props: {
        isSaved: false,
      },
    });

    const btn = wrapper.find('.btn-text-action');
    expect(btn.classes()).not.toContain('is-saved');
    const starSvg = btn.find('svg');
    expect(starSvg.attributes('fill')).toBe('none');
  });

  it('配置已保存 (isSaved 为 true) 时，星标图标填充 currentColor 且应用 is-saved 样式', () => {
    const wrapper = mount(ConfigCardHeader, {
      props: {
        isSaved: true,
      },
    });

    const btn = wrapper.find('.btn-text-action');
    expect(btn.classes()).toContain('is-saved');
    const starSvg = btn.find('svg');
    expect(starSvg.attributes('fill')).toBe('currentColor');
    expect(starSvg.classes()).toContain('star-saved');
  });
});
