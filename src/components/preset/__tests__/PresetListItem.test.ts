import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PresetListItem from '../PresetListItem.vue';
import type { PresetConfig } from '../../../types/config';

describe('PresetListItem.vue component', () => {
  const mockPreset: PresetConfig = {
    id: 'preset-1',
    name: '测试中转站',
    provider_url: 'https://api.example.com/v1',
    key: 'sk-test-abc',
  };

  it('正确渲染预设名称和 URL', () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
      },
    });

    expect(wrapper.find('.preset-name').text()).toBe('测试中转站');
    expect(wrapper.find('.preset-url').text()).toBe('https://api.example.com/v1');
  });

  it('当处于激活状态时，显示生效中标签且不显示切换按钮', () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: true,
      },
    });

    expect(wrapper.classes()).toContain('is-active');
    expect(wrapper.find('.active-pill').exists()).toBe(true);
    expect(wrapper.find('.btn-use').exists()).toBe(false);
  });

  it('当处于非激活状态时，显示切换按钮，点击触发 apply 事件', async () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
      },
    });

    const useBtn = wrapper.find('.btn-use');
    expect(useBtn.exists()).toBe(true);
    await useBtn.trigger('click');

    expect(wrapper.emitted('apply')).toBeTruthy();
    expect(wrapper.emitted('apply')?.[0]).toEqual([mockPreset]);
  });

  it('点击整行在未激活状态下应触发 apply 事件', async () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('apply')).toBeTruthy();
  });

  it('拖拽中点击整行不应触发 apply 事件', async () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
        isDragging: true,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('apply')).toBeFalsy();
  });

  it('点击编辑按钮应触发 edit 事件', async () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
      },
    });

    const editBtn = wrapper.find('.btn-action-icon:not(.btn-delete)');
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockPreset]);
  });

  it('点击删除按钮应触发 delete 事件', async () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
      },
    });

    const deleteBtn = wrapper.find('.btn-delete');
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger('click');

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')?.[0]).toEqual([mockPreset]);
  });

  it('draggable 为 true 时渲染拖拽手柄', () => {
    const wrapper = mount(PresetListItem, {
      props: {
        preset: mockPreset,
        isActive: false,
        draggable: true,
      },
    });

    expect(wrapper.find('.drag-handle').exists()).toBe(true);
  });
});
