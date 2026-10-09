import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PresetListEmpty from '../PresetListEmpty.vue';

describe('PresetListEmpty.vue component', () => {
  it('正确渲染空状态说明文案与添加按钮', () => {
    const wrapper = mount(PresetListEmpty);

    expect(wrapper.find('.empty-title').text()).toBe('暂无保存的预设');
    expect(wrapper.find('.empty-desc').text()).toContain('添加常用中转站 Key 与地址');
    expect(wrapper.find('.btn-add-empty').text()).toContain('立即添加第一个配置');
  });

  it('点击添加按钮应派发 add-preset 事件', async () => {
    const wrapper = mount(PresetListEmpty);

    const btn = wrapper.find('.btn-add-empty');
    await btn.trigger('click');

    expect(wrapper.emitted('add-preset')).toBeTruthy();
  });
});
