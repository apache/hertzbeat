import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { normalizeLocale, type LocaleCode } from '../../../lib/i18n';
import { SUPPLEMENTAL_MESSAGES } from '../../../lib/i18n-runtime-messages';

const FILES: Record<LocaleCode, string> = {
  'en-US': 'en-US.json',
  'zh-CN': 'zh-CN.json',
  'zh-TW': 'zh-TW.json',
  'ja-JP': 'ja-JP.json',
  'pt-BR': 'pt-BR.json'
};

const WEB_NEXT_OWNED_OVERRIDE_KEYS = new Set([
  'alert.workbench.empty.copy',
  'alert.workbench.empty.copy.filtered'
]);

export async function GET(_: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  const locale = normalizeLocale(lang);
  const filePath = path.join(process.cwd(), '..', 'web-app', 'src', 'assets', 'i18n', FILES[locale]);
  const raw = await fs.readFile(filePath, 'utf-8');
  const supplementalMessages = SUPPLEMENTAL_MESSAGES[locale] || {};
  const webNextOwnedOverrides = Object.fromEntries(
    Object.entries(supplementalMessages).filter(([key]) => WEB_NEXT_OWNED_OVERRIDE_KEYS.has(key))
  );

  return NextResponse.json({
    ...supplementalMessages,
    ...(JSON.parse(raw) as Record<string, string>),
    ...webNextOwnedOverrides
  });
}
