import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ModelAliasList from '../ModelAliasList.vue';
import * as modelFetcher from '../../../utils/modelFetcher';

describe('ModelAliasList.vue component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('未配置 key 或 url 时仅展示工具栏', () => {
    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
        autoFetch: false,
      },
    });

    expect(wrapper.find('.list-toolbar').exists()).toBe(true);
    expect(wrapper.find('.list-head').exists()).toBe(false);
    expect(wrapper.find('.list-body').exists()).toBe(false);
    expect(wrapper.find('.list-empty').exists()).toBe(false);
    expect(wrapper.findAll('.alias-row').length).toBe(0);
  });

  it('渲染已有别名行并支持修改右侧别名', async () => {
    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
        apiKey: 'sk-test',
        providerUrl: 'https://api.example.com/v1',
        autoFetch: false,
      },
    });

    const slugInput = wrapper.find<HTMLInputElement>('input[id$="-slug"]');
    const aliasInput = wrapper.find<HTMLInputElement>('input[id$="-alias"]');
    expect(slugInput.element.value).toBe('gpt-5.6-sol');
    expect(aliasInput.element.value).toBe('5.6 Sol');

    await aliasInput.setValue('Sol Max');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [{ slug: 'gpt-5.6-sol', display_name: 'Sol Max' }],
    ]);
  });

  it('点击新增与删除应增删一行', async () => {
    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [],
        apiKey: 'sk-test',
        providerUrl: 'https://api.example.com/v1',
        autoFetch: false,
      },
    });

    const buttons = wrapper.findAll('.btn-text');
    const addBtn = buttons.find((btn) => btn.text().includes('新增'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');

    expect(wrapper.findAll('.alias-row').length).toBe(1);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[{ slug: '', display_name: '' }]]);

    await wrapper.find('.btn-remove').trigger('click');
    expect(wrapper.findAll('.alias-row').length).toBe(0);
  });

  it('展开时若已配置 key 与 url 应自动拉取并填入默认别名', async () => {
    vi.spyOn(modelFetcher, 'fetchProviderModels').mockResolvedValue(['gpt-5.6-sol', 'glm-5.3']);

    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [],
        apiKey: 'sk-test',
        providerUrl: 'https://api.example.com/v1',
        autoFetch: true,
      },
    });

    await flushPromises();

    expect(modelFetcher.fetchProviderModels).toHaveBeenCalledWith(
      'https://api.example.com/v1',
      'sk-test'
    );
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [
        { slug: 'gpt-5.6-sol', display_name: 'gpt-5.6-sol' },
        { slug: 'glm-5.3', display_name: 'glm-5.3' },
      ],
    ]);
    expect(wrapper.emitted('fetched')?.[0]).toEqual([['gpt-5.6-sol', 'glm-5.3']]);
  });

  it('已有别名时自动拉取不会覆盖自定义名称', async () => {
    vi.spyOn(modelFetcher, 'fetchProviderModels').mockResolvedValue(['gpt-5.6-sol', 'glm-5.3']);

    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
        apiKey: 'sk-test',
        providerUrl: 'https://api.example.com/v1',
        autoFetch: true,
      },
    });

    await flushPromises();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.find<HTMLInputElement>('input[id$="-alias"]').element.value).toBe('5.6 Sol');
  });

  it('刷新会把尚未存在的模型追加进列表', async () => {
    vi.spyOn(modelFetcher, 'fetchProviderModels').mockResolvedValue(['gpt-5.6-sol', 'glm-5.3']);

    const wrapper = mount(ModelAliasList, {
      props: {
        modelValue: [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
        apiKey: 'sk-test',
        providerUrl: 'https://api.example.com/v1',
        autoFetch: false,
      },
    });

    const refreshBtn = wrapper.findAll('.btn-text').find((btn) => btn.text().includes('刷新'));
    await refreshBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [
        { slug: 'gpt-5.6-sol', display_name: '5.6 Sol' },
        { slug: 'glm-5.3', display_name: 'glm-5.3' },
      ],
    ]);
  });
});
