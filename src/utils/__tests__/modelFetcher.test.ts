import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildModelsUrl,
  parseModelList,
  fetchProviderModels,
} from '../modelFetcher';

describe('modelFetcher utility', () => {
  describe('buildModelsUrl', () => {
    it('空字符串返回空', () => {
      expect(buildModelsUrl('')).toBe('');
      expect(buildModelsUrl('   ')).toBe('');
    });

    it('标准 /v1 结尾的 URL 应追加 /models', () => {
      expect(buildModelsUrl('https://api.openai.com/v1')).toBe(
        'https://api.openai.com/v1/models'
      );
      expect(buildModelsUrl('https://api.openai.com/v1/')).toBe(
        'https://api.openai.com/v1/models'
      );
    });

    it('无版本号的 URL 默认追加 /v1/models', () => {
      expect(buildModelsUrl('https://api.openai.com')).toBe(
        'https://api.openai.com/v1/models'
      );
    });

    it('以 /v4 等版本号结尾的端点追加 /models', () => {
      expect(buildModelsUrl('https://open.bigmodel.cn/api/paas/v4')).toBe(
        'https://open.bigmodel.cn/api/paas/v4/models'
      );
    });

    it('已包含 /models 的 URL 直接返回', () => {
      expect(buildModelsUrl('https://custom.api/v1/models')).toBe(
        'https://custom.api/v1/models'
      );
    });
  });

  describe('parseModelList', () => {
    it('null 或 undefined 返回空数组', () => {
      expect(parseModelList(null)).toEqual([]);
      expect(parseModelList(undefined)).toEqual([]);
    });

    it('解析标准 OpenAI { data: [{ id: "..." }] } 结构并排序去重', () => {
      const input = {
        data: [
          { id: 'gpt-4o' },
          { id: 'chatgpt-4o-latest' },
          { id: 'gpt-4o' }, // 重复项
        ],
      };
      expect(parseModelList(input)).toEqual(['chatgpt-4o-latest', 'gpt-4o']);
    });

    it('解析 Ollama 风格 { models: [{ name: "..." }] } 结构', () => {
      const input = {
        models: [{ name: 'llama3:latest' }, { name: 'qwen2.5:7b' }],
      };
      expect(parseModelList(input)).toEqual(['llama3:latest', 'qwen2.5:7b']);
    });

    it('解析纯字符串数组', () => {
      const input = ['gpt-4o', 'claude-3-5-sonnet'];
      expect(parseModelList(input)).toEqual(['claude-3-5-sonnet', 'gpt-4o']);
    });

    it('过滤无效或空值', () => {
      const input = {
        data: [{ id: '' }, { id: '   ' }, null, { other: 123 }, { id: 'gpt-4o' }],
      };
      expect(parseModelList(input)).toEqual(['gpt-4o']);
    });
  });

  describe('fetchProviderModels', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('未设置 key 或 url 时给出明确错误提示', async () => {
      await expect(fetchProviderModels('', '')).rejects.toThrow(
        '请先配置 API Key 和中转站地址'
      );
      await expect(fetchProviderModels('https://api.test.com/v1', '')).rejects.toThrow(
        '请先配置 API Key'
      );
      await expect(fetchProviderModels('', 'sk-test')).rejects.toThrow(
        '请先配置中转站地址'
      );
    });

    it('成功请求时携带 Bearer Key 并返回解析后的模型列表', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'gpt-4o' }, { id: 'gpt-5.6-sol' }],
        }),
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const models = await fetchProviderModels('https://api.openai.com/v1', 'sk-valid');
      expect(models).toEqual(['gpt-4o', 'gpt-5.6-sol']);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer sk-valid',
            Accept: 'application/json',
          },
        })
      );
    });

    it('返回 401 状态码时抛出鉴权失败提示', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({}),
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        fetchProviderModels('https://api.openai.com/v1', 'sk-invalid')
      ).rejects.toThrow('API Key 无效或未授权');
    });

    it('网络超时抛出超时提示', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout'));

      await expect(
        fetchProviderModels('https://api.openai.com/v1', 'sk-valid')
      ).rejects.toThrow('请求中转站超时，请检查网络或中转站地址');
    });
  });
});
