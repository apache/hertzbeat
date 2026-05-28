import type { HzAiChatConfigStatus, HzAiChatProviderConfigValue, HzAiChatProviderOption } from '@hertzbeat/ui';
import { apiMessageGet, apiMessagePost } from '@/lib/api-client';

const AI_CHAT_CONFIG_TIMEOUT_MS = 3500;

type RawModelProviderConfig = Partial<HzAiChatProviderConfigValue> & {
  error?: string | null;
  type?: string | null;
};

export type AiChatProviderConfigState = {
  status: Extract<HzAiChatConfigStatus, 'ready' | 'error'>;
  config: HzAiChatProviderConfigValue;
  statusLabelKey: string;
};

export type AiChatProviderConfigSaveState = {
  status: Extract<HzAiChatConfigStatus, 'saved' | 'error'>;
  statusLabelKey: string;
};

export const AI_CHAT_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
  { value: 'zai', label: 'ZAI', defaultBaseUrl: 'https://api.z.ai/api/paas/v4', defaultModel: 'glm-4.6' },
  { value: 'zhipu', label: 'ZhiPu', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4.6' }
] as const satisfies HzAiChatProviderOption[];

export const AI_CHAT_CONFIG_STATUS_LABEL_KEYS = {
  idle: 'ai.chat.config.idle',
  loading: 'ai.chat.config.loading',
  ready: 'ai.chat.config.ready',
  saving: 'ai.chat.config.saving',
  saved: 'ai.chat.config.save.success',
  error: 'ai.chat.config.save.failed',
  validationFailed: 'ai.chat.config.validation.failed'
} as const;

function findProviderOption(code: string | null | undefined) {
  return AI_CHAT_PROVIDER_OPTIONS.find(option => option.value === code) ?? AI_CHAT_PROVIDER_OPTIONS[0];
}

export function buildDefaultAiChatProviderConfig(code = 'openai'): HzAiChatProviderConfigValue {
  const provider = findProviderOption(code);
  return {
    code: provider.value,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl || '',
    model: provider.defaultModel || ''
  };
}

export function applyAiChatProviderDefaults(config: Partial<HzAiChatProviderConfigValue>): HzAiChatProviderConfigValue {
  const provider = findProviderOption(config.code);
  const defaults = buildDefaultAiChatProviderConfig(provider.value);
  return {
    code: provider.value,
    apiKey: config.apiKey || '',
    baseUrl: config.baseUrl || defaults.baseUrl,
    model: config.model || defaults.model
  };
}

async function promiseWithAiChatConfigTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = globalThis.setTimeout(() => reject(new Error('AI chat provider config request timed out')), AI_CHAT_CONFIG_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

export async function loadAiChatProviderConfig(): Promise<AiChatProviderConfigState> {
  try {
    return {
      status: 'ready',
      config: applyAiChatProviderDefaults(await promiseWithAiChatConfigTimeout(apiMessageGet<RawModelProviderConfig>('/config/provider'))),
      statusLabelKey: AI_CHAT_CONFIG_STATUS_LABEL_KEYS.ready
    };
  } catch {
    return {
      status: 'error',
      config: buildDefaultAiChatProviderConfig(),
      statusLabelKey: AI_CHAT_CONFIG_STATUS_LABEL_KEYS.error
    };
  }
}

export async function saveAiChatProviderConfig(config: HzAiChatProviderConfigValue): Promise<AiChatProviderConfigSaveState> {
  try {
    await promiseWithAiChatConfigTimeout(apiMessagePost<unknown>('/config/provider', applyAiChatProviderDefaults(config)));
    return {
      status: 'saved',
      statusLabelKey: AI_CHAT_CONFIG_STATUS_LABEL_KEYS.saved
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return {
      status: 'error',
      statusLabelKey: message.includes('validation failed')
        ? AI_CHAT_CONFIG_STATUS_LABEL_KEYS.validationFailed
        : AI_CHAT_CONFIG_STATUS_LABEL_KEYS.error
    };
  }
}
