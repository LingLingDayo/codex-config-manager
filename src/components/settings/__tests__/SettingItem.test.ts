import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingItem from '../SettingItem.vue';

describe('SettingItem.vue component', () => {
  it('正常渲染 label 与 slot 插槽内容', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '测试设置项',
      },
      slots: {
        default: '<input class="test-input" />',
      },
    });

    expect(wrapper.find('.item-label').text()).toBe('测试设置项');
    expect(wrapper.find('.test-input').exists()).toBe(true);
    expect(wrapper.find('.item-label-wrap').attributes('title')).toBeUndefined();
  });

  it('传入 title 属性时应在 .item-label-wrap 上渲染 title 属性', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '自定义模型',
        title: '用于指定兼容 OpenAI 格式的目标模型',
      },
    });

    const labelWrap = wrapper.find('.item-label-wrap');
    expect(labelWrap.exists()).toBe(true);
    expect(labelWrap.attributes('title')).toBe('用于指定兼容 OpenAI 格式的目标模型');
  });

  it('未传入 title 属性时 .item-label-wrap 不应有 title 属性', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '无提示设置项',
      },
    });

    const labelWrap = wrapper.find('.item-label-wrap');
    expect(labelWrap.attributes('title')).toBeUndefined();
  });

  it('传入 description 时应正确渲染描述信息', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '偏好设置',
        description: '这是一段测试说明文本',
      },
    });

    const desc = wrapper.find('.item-desc');
    expect(desc.exists()).toBe(true);
    expect(desc.text()).toBe('这是一段测试说明文本');
  });

  it('传入 required 时应显示必填星号', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '必填项',
        required: true,
      },
    });

    const mark = wrapper.find('.required-mark');
    expect(mark.exists()).toBe(true);
    expect(mark.text()).toBe('*');
  });

  it('方向与网格跨度类名正确绑定', () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: '垂直布局',
        direction: 'vertical',
        span: 1,
      },
    });

    const root = wrapper.find('.setting-item');
    expect(root.classes()).toContain('vertical');
    expect(root.classes()).toContain('col-span-1');
  });
});
