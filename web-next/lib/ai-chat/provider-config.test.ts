import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_CHAT_PROVIDER_OPTIONS,
  applyAiChatProviderDefaults,
  buildDefaultAiChatProviderConfig,
  loadAiChatProviderConfig,
  saveAiChatProviderConfig
} from './provider-config';

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn()
}));

describe('AI chat provider configuration controller', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the Angular provider option defaults', () => {
    expect(AI_CHAT_PROVIDER_OPTIONS).toEqual([
      { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
      { value: 'zai', label: 'ZAI', defaultBaseUrl: 'https://api.z.ai/api/paas/v4', defaultModel: 'glm-4.6' },
      { value: 'zhipu', label: 'ZhiPu', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4.6' }
    ]);
    expect(buildDefaultAiChatProviderConfig('zhipu')).toEqual({
      code: 'zhipu',
      apiKey: '',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4.6'
    });
  });

  it('fills missing base URL and model from the selected provider', () => {
    expect(applyAiChatProviderDefaults({ code: 'zai', apiKey: 'sk-zai', baseUrl: '', model: '' })).toEqual({
      code: 'zai',
      apiKey: 'sk-zai',
      baseUrl: 'https://api.z.ai/api/paas/v4',
      model: 'glm-4.6'
    });
  });

  it('loads /config/provider and normalizes missing fields for the shared config panel', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockResolvedValueOnce({
      code: 'openai',
      apiKey: 'sk-live',
      baseUrl: '',
      model: ''
    });

    await expect(loadAiChatProviderConfig()).resolves.toEqual({
      status: 'ready',
      config: {
        code: 'openai',
        apiKey: 'sk-live',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4'
      },
      statusLabelKey: 'ai.chat.config.ready'
    });
    expect(apiMessageGet).toHaveBeenCalledWith('/config/provider');
  });

  it('opens the panel with default OpenAI values when /config/provider fails', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockRejectedValueOnce(new Error('503'));

    await expect(loadAiChatProviderConfig()).resolves.toEqual({
      status: 'error',
      config: {
        code: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4'
      },
      statusLabelKey: 'ai.chat.config.save.failed'
    });
  });

  it('saves /config/provider with defaults applied', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockResolvedValueOnce({});

    await expect(saveAiChatProviderConfig({ code: 'zhipu', apiKey: 'sk-zhipu', baseUrl: '', model: '' })).resolves.toEqual({
      status: 'saved',
      statusLabelKey: 'ai.chat.config.save.success'
    });
    expect(apiMessagePost).toHaveBeenCalledWith('/config/provider', {
      code: 'zhipu',
      apiKey: 'sk-zhipu',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4.6'
    });
  });

  it('maps validation failures to the Angular validation copy', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockRejectedValueOnce(new Error('validation failed: invalid API key'));

    await expect(saveAiChatProviderConfig(buildDefaultAiChatProviderConfig())).resolves.toEqual({
      status: 'error',
      statusLabelKey: 'ai.chat.config.validation.failed'
    });
  });
});
