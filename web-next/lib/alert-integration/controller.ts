import fs from 'node:fs/promises';
import path from 'node:path';

import { translateAlertIntegration } from './view-model';
import { normalizeLocale, type LocaleCode } from '../i18n';

export const fallbackDocCopy = translateAlertIntegration('alert.integration.doc.fallback', undefined, 'zh-CN');

type ReadFile = (path: string, encoding: BufferEncoding) => Promise<string>;

export function getAlertIntegrationFallbackDocCopy(locale: LocaleCode | string = 'zh-CN') {
  return translateAlertIntegration('alert.integration.doc.fallback', undefined, normalizeLocale(locale));
}

export function buildIntegrationDocCandidates(source: string, locale: LocaleCode | string = 'zh-CN') {
  return Array.from(new Set([`${source}.${normalizeLocale(locale)}.md`, `${source}.en-US.md`]));
}

export async function loadIntegrationDoc(
  baseDir: string,
  source: string,
  localeOrReadFile: LocaleCode | string | ReadFile = 'zh-CN',
  readFile: ReadFile = fs.readFile
) {
  const locale = typeof localeOrReadFile === 'function' ? 'zh-CN' : normalizeLocale(localeOrReadFile);
  const reader = typeof localeOrReadFile === 'function' ? localeOrReadFile : readFile;
  const candidates = buildIntegrationDocCandidates(source, locale);
  for (const fileName of candidates) {
    try {
      return await reader(path.join(baseDir, fileName), 'utf8');
    } catch {}
  }
  return getAlertIntegrationFallbackDocCopy(locale);
}
