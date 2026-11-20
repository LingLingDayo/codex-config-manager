import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeCommand, isTauriEnv } from '../hybridStorage';
import {
  buildModelsUrl,
  parseModelList,
  fetchProviderModels,
  clearModelFetchCache,
} from '../modelFetcher';

vi.mock('../hybridStorage', () => ({
  invokeCommand: vi.fn(),
  isTauriEnv: vi.fn(),
}));

const invokeMock = vi.mocked(invokeCommand);
const tauriEnvMock = vi.mocked(isTauriEnv);

const okBody = (models: string[]) => JSON.stringify({ data: models.map((id) => ({ id })) });

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
      vi.clearAllMocks();
      clearModelFetchCache();
      tauriEnvMock.mockReturnValue(true);
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('未设置 key 或 url 时给出明确错误提示', async () => {
      await expect(fetchProviderModels('', '')).rejects.toThrow(
        '请先配置 API Key 和地址'
      );
      await expect(fetchProviderModels('https://api.test.com/v1', '')).rejects.toThrow(
        '请先配置 API Key'
      );
      await expect(fetchProviderModels('', 'sk-test')).rejects.toThrow(
        '请先配置地址'
      );
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('Tauri 环境下经 Rust 传输层请求并解析模型列表', async () => {
      invokeMock.mockResolvedValue({ status: 200, body: okBody(['gpt-4o', 'gpt-5.6-sol']) });

      const models = await fetchProviderModels('https://api.openai.com/v1', 'sk-valid');

      expect(models).toEqual(['gpt-4o', 'gpt-5.6-sol']);
      expect(invokeMock).toHaveBeenCalledWith('fetch_provider_models', {
        endpoint: 'https://api.openai.com/v1/models',
        apiKey: 'sk-valid',
        timeoutMs: 10000,
      });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('相同凭证在缓存有效期内不重复发起请求', async () => {
      invokeMock.mockResolvedValue({ status: 200, body: okBody(['gpt-4o']) });

      await fetchProviderModels('https://api.openai.com/v1', 'sk-valid');
      const models = await fetchProviderModels('https://api.openai.com/v1', 'sk-valid');

      expect(models).toEqual(['gpt-4o']);
      expect(invokeMock).toHaveBeenCalledTimes(1);
    });

    it('返回 401 状态码时抛出鉴权失败提示', async () => {
      invokeMock.mockResolvedValue({ status: 401, body: '{}' });

      await expect(
        fetchProviderModels('https://api.openai.com/v1', 'sk-invalid')
      ).rejects.toThrow('API Key 无效或未授权');
    });

    it('主端点 404 时自动降级请求 /models', async () => {
      invokeMock
        .mockResolvedValueOnce({ status: 404, body: '' })
        .mockResolvedValueOnce({ status: 200, body: okBody(['glm-5.3']) });

      const models = await fetchProviderModels('https://custom.api', 'sk-valid');

      expect(models).toEqual(['glm-5.3']);
      expect(invokeMock).toHaveBeenNthCalledWith(2, 'fetch_provider_models', {
        endpoint: 'https://custom.api/models',
        apiKey: 'sk-valid',
        timeoutMs: 5000,
      });
    });

    it('主端点与降级端点均 404 时给出未找到接口提示', async () => {
      invokeMock.mockResolvedValue({ status: 404, body: '' });

      await expect(
        fetchProviderModels('https://custom.api', 'sk-valid')
      ).rejects.toThrow('未找到模型接口 (/v1/models)');
    });

    it('非 2xx 响应优先展示服务端返回的错误信息', async () => {
      invokeMock.mockResolvedValue({
        status: 429,
        body: JSON.stringify({ error: { message: '请求过于频繁' } }),
      });

      await expect(
        fetchProviderModels('https://custom.api', 'sk-valid')
      ).rejects.toThrow('获取模型列表失败: 请求过于频繁');
    });

    it('成功响应但不是合法 JSON 时给出明确提示', async () => {
      invokeMock.mockResolvedValue({ status: 200, body: '<html>503</html>' });

      await expect(
        fetchProviderModels('https://custom.api', 'sk-valid')
      ).rejects.toThrow('获取模型列表失败: 响应不是有效的 JSON');
    });

    it('Rust 传输层上报超时时直接沿用中文提示，不重复拼接前缀', async () => {
      invokeMock.mockRejectedValue(new Error('获取模型列表超时，请检查网络或地址'));

      await expect(
        fetchProviderModels('https://custom.api', 'sk-valid')
      ).rejects.toThrow('获取模型列表超时，请检查网络或地址');
    });

    it('Rust 传输层上报连接失败时展示可读提示', async () => {
      invokeMock.mockRejectedValue(
        new Error('获取模型列表失败: 无法连接到地址，请检查网络或地址是否正确')
      );

      await expect(
        fetchProviderModels('https://custom.api', 'sk-valid')
      ).rejects.toThrow('获取模型列表失败: 无法连接到地址，请检查网络或地址是否正确');
    });

    it('纯浏览器预览降级为原生 fetch 并解析模型列表', async () => {
      tauriEnvMock.mockReturnValue(false);
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => okBody(['gpt-4o']),
      } as Response);

      const models = await fetchProviderModels('https://api.openai.com/v1', 'sk-valid');

      expect(models).toEqual(['gpt-4o']);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer sk-valid',
            Accept: 'application/json',
          },
        })
      );
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('降级路径网络超时抛出超时提示', async () => {
      tauriEnvMock.mockReturnValue(false);
      vi.mocked(globalThis.fetch).mockRejectedValue(
        new Error('The operation was aborted due to timeout')
      );

      await expect(
        fetchProviderModels('https://api.openai.com/v1', 'sk-valid')
      ).rejects.toThrow('获取模型列表超时，请检查网络或地址');
    });

    it('降级路径网络连接失败抛出获取模型列表失败提示，不包含中转站字样', async () => {
      tauriEnvMock.mockReturnValue(false);
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        fetchProviderModels('https://api.openai.com/v1', 'sk-valid')
      ).rejects.toThrow('获取模型列表失败: Failed to fetch');
    });
  });
});
