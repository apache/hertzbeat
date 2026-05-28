import type { SystemConfig, TimezoneOption } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;
type RuntimeHandlers = {
  setLocale?: (locale: string) => Promise<void> | void;
  applyTheme?: (theme?: string | null) => void;
  reload?: () => void;
};

export function normalizeSystemConfigRuntimeLocale(locale?: string | null) {
  return locale?.trim().replace('_', '-') ?? '';
}

export async function loadSystemConfigData(apiGet: ApiGetter) {
  const [config, timezones] = await Promise.all([
    apiGet<SystemConfig>('/config/system'),
    apiGet<TimezoneOption[]>('/config/timezones')
  ]);

  return { config, timezones };
}

export async function saveSystemConfig(apiPost: ApiPoster, config: SystemConfig) {
  return apiPost<string>('/config/system', config);
}

export async function applySystemConfigRuntime(config: SystemConfig, handlers?: RuntimeHandlers) {
  const runtimeLocale = normalizeSystemConfigRuntimeLocale(config.locale);
  if (runtimeLocale && handlers?.setLocale) {
    await handlers.setLocale(runtimeLocale);
  }
  handlers?.applyTheme?.(config.theme);
  handlers?.reload?.();
}

export async function persistSystemConfig(
  apiPost: ApiPoster,
  config: SystemConfig,
  saveSuccessMessage: string,
  runtimeHandlers?: RuntimeHandlers
) {
  await saveSystemConfig(apiPost, config);
  await applySystemConfigRuntime(config, runtimeHandlers);
  return saveSuccessMessage;
}
