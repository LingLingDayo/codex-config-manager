import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmModal from '../ConfirmModal.vue';
import { useConfirm } from '../../composables/useConfirm';

describe('ConfirmModal.vue component', () => {
  const { resetConfirmState, showConfirm } = useConfirm();

  beforeEach(() => {
    resetConfirmState();
  });

  afterEach(() => {
    resetConfirmState();
    document.body.innerHTML = '';
  });

  it('受控模式：当 visible 为 false 时不应渲染弹窗遮罩', () => {
    const wrapper = mount(ConfirmModal, {
      props: { visible: false, teleport: false },
    });
    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false);
  });

  it('受控模式：当 visible 为 true 时渲染对应类型与文本', () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        visible: true,
        type: 'danger',
        title: '删除警告',
        message: '确认要删除吗？',
        detail: '删除不可逆',
        confirmText: '删吧',
        cancelText: '算了',
        teleport: false,
      },
    });

    expect(wrapper.find('.confirm-backdrop').exists()).toBe(true);
    expect(wrapper.find('.confirm-dialog').classes()).toContain('type-danger');
    expect(wrapper.find('.confirm-title').text()).toBe('删除警告');
    expect(wrapper.find('.confirm-message').text()).toBe('确认要删除吗？');
    expect(wrapper.find('.confirm-detail').text()).toContain('删除不可逆');
    expect(wrapper.find('.btn-confirm').text()).toContain('删吧');
    expect(wrapper.find('.btn-cancel').text().trim()).toBe('算了');
  });

  it('受控模式：点击确认与取消按钮触发对应 emit 事件', async () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        visible: true,
        type: 'warning',
        message: '请确认操作',
        teleport: false,
      },
    });

    const confirmBtn = wrapper.find('.btn-confirm');
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('confirm')).toBeTruthy();

    const cancelBtn = wrapper.find('.btn-cancel');
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('全局单例模式：响应 useConfirm 的 showConfirm 与各种样式类型', async () => {
    const wrapper = mount(ConfirmModal, {
      props: { teleport: false },
    });

    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false);

    // 触发 info 类型弹窗
    const confirmPromise = showConfirm({
      title: '信息确认',
      message: '测试全局信息弹窗',
      type: 'info',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.confirm-backdrop').exists()).toBe(true);
    expect(wrapper.find('.confirm-dialog').classes()).toContain('type-info');
    expect(wrapper.find('.confirm-title').text()).toBe('信息确认');
    expect(wrapper.find('.confirm-message').text()).toBe('测试全局信息弹窗');

    // 点击确认
    await wrapper.find('.btn-confirm').trigger('click');
    const result = await confirmPromise;
    expect(result).toBe(true);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false);
  });

  it('按下 Escape 键时应取消并关闭弹窗', async () => {
    const promise = showConfirm({
      message: '按 Esc 取消测试',
      type: 'warning',
    });
    const wrapper = mount(ConfirmModal, {
      props: { teleport: false },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.confirm-backdrop').exists()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const result = await promise;

    expect(result).toBe(false);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false);
  });

  it('支持挂载 Teleport 到 body', () => {
    const wrapper = mount(ConfirmModal, {
      props: {
        visible: true,
        teleport: true,
        message: 'Teleport 模式测试',
      },
    });

    const backdrop = document.body.querySelector('.confirm-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop?.textContent).toContain('Teleport 模式测试');
    wrapper.unmount();
  });
});
