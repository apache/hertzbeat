export type LocalizedText = string | Record<string, string> | null | undefined;

export function resolveLocalizedText(value: LocalizedText, locale: string, fallback: string) {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value[locale] || value['zh-CN'] || value['en-US'] || value['ja-JP'] || Object.values(value)[0] || fallback;
}
