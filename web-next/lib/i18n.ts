export type LocaleCode = 'en-US' | 'zh-CN' | 'zh-TW' | 'ja-JP' | 'pt-BR';
export type TranslationParams = Record<string, string | number | null | undefined>;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

export const LOCALES: Array<{ code: LocaleCode; labelKey: string; abbr: string }> = [
  { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
  { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' },
  { code: 'zh-TW', labelKey: 'settings.system-config.locale.zh_TW', abbr: '🇭🇰' },
  { code: 'ja-JP', labelKey: 'settings.system-config.locale.ja_JP', abbr: '🇯🇵' },
  { code: 'pt-BR', labelKey: 'settings.system-config.locale.pt_BR', abbr: '🇧🇷' }
];

const SUPPORTED = new Set(LOCALES.map(item => item.code));

export function normalizeLocale(input?: string | null): LocaleCode {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.replace('_', '-');
  if (SUPPORTED.has(normalized as LocaleCode)) {
    return normalized as LocaleCode;
  }

  const lowered = normalized.toLowerCase();
  if (lowered.startsWith('zh-cn')) return 'zh-CN';
  if (lowered.startsWith('zh-tw') || lowered.startsWith('zh-hk') || lowered.startsWith('zh-hant')) return 'zh-TW';
  if (lowered.startsWith('ja')) return 'ja-JP';
  if (lowered.startsWith('pt-br') || lowered.startsWith('pt')) return 'pt-BR';
  if (lowered.startsWith('en')) return 'en-US';
  return DEFAULT_LOCALE;
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}|\{([\w.-]+)\}/g, (_, doubleKey: string | undefined, singleKey: string | undefined) => {
    const key = doubleKey ?? singleKey;
    const value = key ? params[key] : undefined;
    return value == null ? '' : String(value);
  });
}
