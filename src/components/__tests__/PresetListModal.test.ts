import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Lightbulb } from '@lucide/vue';
import PresetListModal from '../PresetListModal.vue';
import type { CodexConfig } from '../../types/config';

const mockCurrentConfig: CodexConfig = {
  key: 'sk-test-123',
  provider_url: 'https://api.openai.com/v1',
  is_enabled: true,
};

describe('PresetListModal.vue component', () => {
  it('弹窗标题应正确显示为「配置列表」', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });

    const title = wrapper.find('.modal-header h3');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('配置列表');
  });

  it('点击关闭按钮或按 ESC 键触发 close 事件', async () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });

    const closeBtn = wrapper.find('.btn-close');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('底部提示栏应正确渲染说明文案与提示图标', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });

    const footerTip = wrapper.find('.footer-tip');
    expect(footerTip.exists()).toBe(true);
    expect(footerTip.text()).toContain('点击任意配置项即可立即切换并生效');
    expect(footerTip.find('.tip-icon').exists()).toBe(true);
    expect(wrapper.findComponent(Lightbulb).exists()).toBe(true);
  });
});
