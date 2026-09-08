import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ToastMessage from '../ToastMessage.vue';
import { useToast } from '../../composables/useToast';

describe('ToastMessage.vue component', () => {
  beforeEach(() => {
    const { hideToast } = useToast();
    hideToast();
  });

  it('初始状态下 toast 应带有 hidden 类', () => {
    const wrapper = mount(ToastMessage);
    const toast = wrapper.find('.toast');
    expect(toast.classes()).toContain('hidden');
  });

  it('触发 showToast 时应展示消息内容并应用相应类型样式类', async () => {
    const wrapper = mount(ToastMessage);
    const { showToast } = useToast();

    showToast('保存成功', 'success');
    await wrapper.vm.$nextTick();

    const toast = wrapper.find('.toast');
    expect(toast.classes()).not.toContain('hidden');
    expect(toast.classes()).toContain('success');
    expect(toast.text()).toBe('保存成功');
  });

  it('错误类型 toast 渲染正确样式', async () => {
    const wrapper = mount(ToastMessage);
    const { showToast } = useToast();

    showToast('操作失败', 'error');
    await wrapper.vm.$nextTick();

    const toast = wrapper.find('.toast');
    expect(toast.classes()).toContain('error');
    expect(toast.text()).toBe('操作失败');
  });
});
