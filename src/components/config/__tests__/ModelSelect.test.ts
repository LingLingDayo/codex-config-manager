import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ModelSelect from '../ModelSelect.vue';
import * as modelFetcher from '../../../utils/modelFetcher';
import { useToast } from '../../../composables/useToast';

describe('ModelSelect.vue component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('正确渲染输入框及其初始值与 id', () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: 'gpt-5.6-sol',
        id: 'custom-model-input',
      },
    });

    const input = wrapper.find<HTMLInputElement>('#custom-model-input');
    expect(input.exists()).toBe(true);
    expect(input.element.value).toBe('gpt-5.6-sol');
  });

  it('用户输入文本时触发 update:modelValue 与 change 事件', async () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        id: 'custom-model-input',
      },
    });

    const input = wrapper.find<HTMLInputElement>('#custom-model-input');
    await input.setValue('custom-model-x');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['custom-model-x']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['custom-model-x']);
  });

  it('点击清空按钮清空输入并触发更新事件', async () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: 'gpt-4o',
        clearable: true,
      },
    });

    const clearBtn = wrapper.find('.btn-clear');
    expect(clearBtn.exists()).toBe(true);
    await clearBtn.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['']);
  });

  it('未设置 key 或 url 时点击下拉按钮给出 toast 警告提示且不展开菜单', async () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        apiKey: '',
        providerUrl: '',
      },
    });

    const dropdownBtn = wrapper.find('.btn-dropdown');
    await dropdownBtn.trigger('click');

    const { message, type } = useToast();
    expect(message.value).toBe('请先配置 API Key 和中转站地址');
    expect(type.value).toBe('warning');
    expect(wrapper.find('.model-dropdown-menu').exists()).toBe(false);
  });

  it('仅缺失 key 时给出填写 key 的提示', async () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        apiKey: '',
        providerUrl: 'https://api.openai.com/v1',
      },
    });

    await wrapper.find('.btn-dropdown').trigger('click');

    const { message, type } = useToast();
    expect(message.value).toBe('请先配置 API Key');
    expect(type.value).toBe('warning');
  });

  it('仅缺失 url 时给出填写中转站地址的提示', async () => {
    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        apiKey: 'sk-test',
        providerUrl: '',
      },
    });

    await wrapper.find('.btn-dropdown').trigger('click');

    const { message, type } = useToast();
    expect(message.value).toBe('请先配置中转站地址');
    expect(type.value).toBe('warning');
  });

  it('已配置 key 与 url 时点击下拉按钮拉取并展开模型列表，支持点击选项回填', async () => {
    const fetchSpy = vi
      .spyOn(modelFetcher, 'fetchProviderModels')
      .mockResolvedValue(['claude-3-5-sonnet', 'gpt-4o', 'gpt-5.6-sol']);

    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        apiKey: 'sk-valid',
        providerUrl: 'https://api.openai.com/v1',
      },
    });

    await wrapper.find('.btn-dropdown').trigger('click');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1', 'sk-valid');

    // 展开了下拉菜单
    const menu = wrapper.find('.model-dropdown-menu');
    expect(menu.exists()).toBe(true);

    const items = wrapper.findAll('.dropdown-item');
    expect(items.length).toBe(3);
    expect(items[0].text()).toContain('claude-3-5-sonnet');
    expect(items[1].text()).toContain('gpt-4o');
    expect(items[2].text()).toContain('gpt-5.6-sol');

    // 点击第二个选项 gpt-4o
    await items[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['gpt-4o']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['gpt-4o']);

    // 选择后收起下拉菜单
    expect(wrapper.find('.model-dropdown-menu').exists()).toBe(false);
  });

  it('获取模型列表失败时给出错误 Toast 提示', async () => {
    vi.spyOn(modelFetcher, 'fetchProviderModels').mockRejectedValue(
      new Error('API Key 无效或未授权')
    );

    const wrapper = mount(ModelSelect, {
      props: {
        modelValue: '',
        apiKey: 'sk-invalid',
        providerUrl: 'https://api.openai.com/v1',
      },
    });

    await wrapper.find('.btn-dropdown').trigger('click');

    const { message, type } = useToast();
    expect(message.value).toBe('API Key 无效或未授权');
    expect(type.value).toBe('error');
    expect(wrapper.find('.model-dropdown-menu').exists()).toBe(false);
  });
});
