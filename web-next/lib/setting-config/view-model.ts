import type { SystemConfig, TimezoneOption } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
export type SaveTone = 'success' | 'error' | null;

export const SYSTEM_CONFIG_LOCALE_OPTIONS = [
  { value: 'en_US', labelKey: 'settings.system-config.locale.en_US' },
  { value: 'zh_CN', labelKey: 'settings.system-config.locale.zh_CN' },
  { value: 'zh_TW', labelKey: 'settings.system-config.locale.zh_TW' },
  { value: 'ja_JP', labelKey: 'settings.system-config.locale.ja_JP' },
  { value: 'pt_BR', labelKey: 'settings.system-config.locale.pt_BR' }
] as const;

export const SYSTEM_CONFIG_THEME_OPTIONS = [
  { value: 'light-ops', labelKey: 'settings.system-config.theme.default' },
  { value: 'dark-ops', labelKey: 'settings.system-config.theme.dark' },
  { value: 'compact', labelKey: 'settings.system-config.theme.compact' }
] as const;

function formatSystemConfigFact(value: string | null | undefined, emptyValue: string) {
  const text = value?.trim() ?? '';
  return text || emptyValue;
}

export function normalizeSystemConfigLocale(locale?: string | null) {
  if (!locale) return '';
  return locale
    .replace('en-US', 'en_US')
    .replace('zh-CN', 'zh_CN')
    .replace('zh-TW', 'zh_TW')
    .replace('ja-JP', 'ja_JP')
    .replace('pt-BR', 'pt_BR');
}

export function normalizeSystemConfigTheme(theme?: string | null) {
  if (!theme) return 'dark-ops';
  if (theme === 'light-ops') return 'light-ops';
  if (theme === 'compact') return 'compact';
  return 'dark-ops';
}

export function resolveSystemLocaleLabel(locale: string | null | undefined, t: Translator, emptyValue = t('common.none')) {
  const normalizedLocale = normalizeSystemConfigLocale(locale);
  const option = SYSTEM_CONFIG_LOCALE_OPTIONS.find(item => item.value === normalizedLocale);
  return option ? t(option.labelKey) : formatSystemConfigFact(locale, emptyValue);
}

export function resolveSystemThemeLabel(theme: string | null | undefined, t: Translator) {
  const normalizedTheme = normalizeSystemConfigTheme(theme);
  const option = SYSTEM_CONFIG_THEME_OPTIONS.find(item => item.value === normalizedTheme);
  return option ? t(option.labelKey) : normalizedTheme;
}

export function buildConfigFacts(config: SystemConfig, t: Translator) {
  const emptyValue = t('common.none');

  return [
    { label: t('common.workspace'), value: 'setting/settings/config' },
    { label: t('settings.system-config.locale'), value: resolveSystemLocaleLabel(config.locale, t, emptyValue) },
    { label: t('settings.system-config.theme'), value: resolveSystemThemeLabel(config.theme, t) },
    { label: t('settings.system-config.timezone'), value: formatSystemConfigFact(config.timeZoneId, emptyValue) }
  ];
}

export function canSaveSystemConfig(config: SystemConfig) {
  return Boolean(normalizeSystemConfigLocale(config.locale) && normalizeSystemConfigTheme(config.theme) && config.timeZoneId);
}

export function updateSystemConfigField(config: SystemConfig, key: keyof SystemConfig, value: string) {
  return {
    ...config,
    [key]: value
  };
}

export function updateSystemConfigTimezone(config: SystemConfig, timeZoneId: string) {
  return updateSystemConfigField(config, 'timeZoneId', timeZoneId);
}

export function resolveSystemConfigDraft(draft: SystemConfig | null, config: SystemConfig) {
  const source = draft || config || {};
  return {
    ...source,
    locale: normalizeSystemConfigLocale(source.locale),
    theme: normalizeSystemConfigTheme(source.theme)
  };
}

export function buildTimezoneOptionLabel(zone: TimezoneOption) {
  return `${zone.zoneId} (${zone.offset})${zone.displayName ? ` ${zone.displayName}` : ''}`;
}

export function resolveConfigSaveFeedback(message: string | null, tone: SaveTone) {
  if (!message) {
    return null;
  }

  return {
    message,
    className: tone === 'success' ? 'text-emerald-300' : 'text-rose-300'
  };
}
