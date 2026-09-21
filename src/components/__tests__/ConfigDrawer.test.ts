import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfigDrawer from '../ConfigDrawer.vue';

describe('ConfigDrawer.vue component', () => {
  it('visible 为 false 时不显示抽屉', () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: false,
        modelValue: '',
        reasoningEffort: '',
      },
    });

    expect(wrapper.find('.drawer-panel').exists()).toBe(false);
  });

  it('visible 为 true 时渲染两列网格布局且别名列表占满整行', () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: true,
        modelValue: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        modelAliases: [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
      },
      attachTo: document.body,
    });

    const panel = document.body.querySelector('.drawer-panel');
    expect(panel).not.toBeNull();

    const drawerContent = document.body.querySelector('.drawer-content');
    expect(drawerContent).not.toBeNull();

    const items = document.body.querySelectorAll('.setting-item');
    expect(items.length).toBe(3);
    expect(items[0].classList.contains('col-span-1')).toBe(true);
    expect(items[1].classList.contains('col-span-1')).toBe(true);
    expect(items[2].classList.contains('col-span-2')).toBe(true);

    const aliasInput = document.body.querySelector(
      'input[id$="-alias"]'
    ) as HTMLInputElement;
    expect(aliasInput).not.toBeNull();
    expect(aliasInput.value).toBe('5.6 Sol');

    wrapper.unmount();
  });

  it('点击关闭按钮应触发 close 事件', async () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: true,
        modelValue: '',
      },
      attachTo: document.body,
    });

    const closeBtn = document.body.querySelector('.btn-drawer-close') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('输入自定义模型与修改思考强度时触发对应的 update 事件', async () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: true,
        modelValue: 'gpt-4o',
        reasoningEffort: 'low',
      },
      attachTo: document.body,
    });

    const modelInput = document.body.querySelector('#custom-model-input') as HTMLInputElement;
    expect(modelInput).not.toBeNull();
    modelInput.value = 'gpt-5.6-sol';
    modelInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['gpt-5.6-sol']);

    const effortInput = document.body.querySelector('.select-input') as HTMLInputElement;
    expect(effortInput).not.toBeNull();
    effortInput.value = 'high';
    effortInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:reasoningEffort')?.[0]).toEqual(['high']);

    wrapper.unmount();
  });

  it('编辑模型别名时触发 update:modelAliases 事件', async () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: true,
        modelValue: 'gpt-5.6-sol',
        modelAliases: [{ slug: 'gpt-5.6-sol', display_name: '' }],
      },
      attachTo: document.body,
    });

    const aliasInput = document.body.querySelector(
      'input[id$="-alias"]'
    ) as HTMLInputElement;
    expect(aliasInput).not.toBeNull();
    aliasInput.value = '5.6 Sol';
    aliasInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelAliases')?.[0]).toEqual([
      [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
    ]);

    wrapper.unmount();
  });
});
