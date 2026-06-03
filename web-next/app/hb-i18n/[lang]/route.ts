import { NextResponse } from 'next/server';
import { normalizeLocale } from '../../../lib/i18n';
import { SUPPLEMENTAL_MESSAGES } from '../../../lib/i18n-runtime-messages';

export async function GET(_: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  const locale = normalizeLocale(lang);
  const fallbackMessages = locale.startsWith('zh') ? SUPPLEMENTAL_MESSAGES['zh-CN'] : SUPPLEMENTAL_MESSAGES['en-US'];
  const supplementalMessages = SUPPLEMENTAL_MESSAGES[locale] || fallbackMessages || {};

  return NextResponse.json(supplementalMessages);
}
