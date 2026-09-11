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

  it('visible 为 true 时渲染两列网格布局且内部控件配置为 1 列宽', () => {
    const wrapper = mount(ConfigDrawer, {
      props: {
        visible: true,
        modelValue: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
      },
      attachTo: document.body,
    });

    const panel = document.body.querySelector('.drawer-panel');
    expect(panel).not.toBeNull();

    const drawerContent = document.body.querySelector('.drawer-content');
    expect(drawerContent).not.toBeNull();

    // 检查是否有两个并排的 span-1 控件
    const items = document.body.querySelectorAll('.setting-item');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('col-span-1')).toBe(true);
    expect(items[1].classList.contains('col-span-1')).toBe(true);

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
});
