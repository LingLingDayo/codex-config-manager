import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingSelect from '../SettingSelect.vue';

describe('SettingSelect.vue component', () => {
  const sampleOptions = [
    { label: 'low', value: 'low', description: '低思考强度' },
    { label: 'medium', value: 'medium', description: '中等思考强度' },
    { label: 'high', value: 'high', description: '高思考强度' },
  ];

  it('正常渲染初始值与 placeholder', () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'medium',
        options: sampleOptions,
        placeholder: '请选择思考强度',
      },
    });

    const input = wrapper.find('input.select-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('medium');
    expect(input.attributes('placeholder')).toBe('请选择思考强度');
  });

  it('点击箭头可展开下拉菜单并渲染选项列表', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'low',
        options: sampleOptions,
      },
    });

    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(false);

    const arrowBtn = wrapper.find('.btn-arrow');
    await arrowBtn.trigger('click');

    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(true);
    const items = wrapper.findAll('.dropdown-item');
    expect(items.length).toBe(3);
    expect(items[0].text()).toContain('low');
    expect(items[0].text()).toContain('低思考强度');
    expect(items[0].classes()).toContain('active');
  });

  it('点击下拉选项时应触发 update:modelValue 与 change 并收起菜单', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'low',
        options: sampleOptions,
      },
    });

    await wrapper.find('.btn-arrow').trigger('click');
    const items = wrapper.findAll('.dropdown-item');

    await items[2].trigger('click'); // 点击 'high'
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['high']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['high']);
    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(false);
  });

  it('输入框支持直接键入自定义值', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: '',
        options: sampleOptions,
        allowCustom: true,
      },
    });

    const input = wrapper.find('input.select-input');
    await input.setValue('custom-effort-123');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['custom-effort-123']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['custom-effort-123']);
  });

  it('点击清空按钮应清空当前值', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'high',
        options: sampleOptions,
        clearable: true,
      },
    });

    const clearBtn = wrapper.find('.btn-clear');
    expect(clearBtn.exists()).toBe(true);

    await clearBtn.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['']);
  });

  it('按 Esc 键应关闭下拉菜单', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'low',
        options: sampleOptions,
      },
    });

    await wrapper.find('.btn-arrow').trigger('click');
    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(true);

    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(false);
  });

  it('点击外部区域时收起下拉菜单', async () => {
    const wrapper = mount(SettingSelect, {
      props: {
        modelValue: 'low',
        options: sampleOptions,
      },
      attachTo: document.body,
    });

    await wrapper.find('.btn-arrow').trigger('click');
    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(true);

    // 触发全局 pointerdown
    window.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.select-dropdown-menu').exists()).toBe(false);
    wrapper.unmount();
  });
});
