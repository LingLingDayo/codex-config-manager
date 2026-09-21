import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MoreConfigFields, { MORE_CONFIG_META } from '../MoreConfigFields.vue';

describe('MoreConfigFields.vue component', () => {
  it('正确渲染 3 个核心配置项及其单一事实来源的标题与说明文本', () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        displayName: '5.6 Sol',
      },
    });

    const items = wrapper.findAll('.setting-item');
    expect(items.length).toBe(3);

    // 检查字段标题与 tooltip 是否严格等于 MORE_CONFIG_META
    expect(items[0].find('.item-label').text()).toBe(MORE_CONFIG_META.model.label);
    expect(items[0].find('.item-label-wrap').attributes('title')).toBe(
      MORE_CONFIG_META.model.title
    );

    expect(items[1].find('.item-label').text()).toBe(MORE_CONFIG_META.reasoningEffort.label);
    expect(items[1].find('.item-label-wrap').attributes('title')).toBe(
      MORE_CONFIG_META.reasoningEffort.title
    );

    expect(items[2].find('.item-label').text()).toBe(MORE_CONFIG_META.displayName.label);
    expect(items[2].find('.item-label-wrap').attributes('title')).toBe(
      MORE_CONFIG_META.displayName.title
    );
  });

  it('网格容器包含前两项 1fr 并排类名设置', () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        model: '',
        reasoningEffort: '',
      },
    });

    const grid = wrapper.find('.more-config-fields-grid');
    expect(grid.exists()).toBe(true);

    const modelField = wrapper.find('.field-model');
    const reasoningField = wrapper.find('.field-reasoning');
    expect(modelField.exists()).toBe(true);
    expect(reasoningField.exists()).toBe(true);
  });

  it('输入自定义模型触发 update:model 与 update:modelValue 事件', async () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        model: 'gpt-4o',
      },
    });

    const input = wrapper.find<HTMLInputElement>('#custom-model-input');
    await input.setValue('gpt-5.6-turbo');

    expect(wrapper.emitted('update:model')?.[0]).toEqual(['gpt-5.6-turbo']);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['gpt-5.6-turbo']);
  });

  it('修改思考强度触发 update:reasoningEffort 事件', async () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        reasoningEffort: 'low',
      },
    });

    // 展开下拉并选择 high
    const arrow = wrapper.find('.btn-arrow');
    await arrow.trigger('click');

    const options = wrapper.findAll('.dropdown-item');
    const highOption = options.find((opt) => opt.text().includes('high'));
    expect(highOption).toBeDefined();
    await highOption!.trigger('click');

    expect(wrapper.emitted('update:reasoningEffort')?.[0]).toEqual(['high']);
  });

  it('输入模型别名触发 update:displayName 事件', async () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        displayName: 'Old Name',
      },
    });

    const input = wrapper.find<HTMLInputElement>('#model-display-name-input');
    await input.setValue('New Alias');

    expect(wrapper.emitted('update:displayName')?.[0]).toEqual(['New Alias']);
  });

  it('支持传入 idPrefix 适配弹窗场景', () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        idPrefix: 'modal-preset',
      },
    });

    expect(wrapper.find('#modal-preset-model').exists()).toBe(true);
    expect(wrapper.find('#modal-preset-reasoning').exists()).toBe(true);
    expect(wrapper.find('#modal-preset-display-name').exists()).toBe(true);
  });

  it('fullWidthDisplayName 为 true 时给别名项添加 full-width 类与 span=2 属性', () => {
    const wrapper = mount(MoreConfigFields, {
      props: {
        fullWidthDisplayName: true,
      },
    });

    const displayNameField = wrapper.find('.field-display-name');
    expect(displayNameField.classes()).toContain('full-width');
    expect(displayNameField.classes()).toContain('col-span-2');
  });
});
