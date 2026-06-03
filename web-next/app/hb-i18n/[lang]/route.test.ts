import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPLEMENTAL_MESSAGES } from '../../../lib/i18n-runtime-messages';

const zhMessages = SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {};
const enMessages = SUPPLEMENTAL_MESSAGES['en-US'] ?? {};

describe('hb-i18n route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('serves the normalized Next runtime locale bundle', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/hb-i18n/zh_CN'), {
      params: Promise.resolve({ lang: 'zh_CN' })
    });

    await expect(response.json()).resolves.toMatchObject({
      'common.save': zhMessages['common.save'],
      'layout.setup.progress.headline': zhMessages['layout.setup.progress.headline'],
      'alert.notice.title': zhMessages['alert.notice.title']
    });
  });

  it('serves web-next-owned alert workbench copy without a legacy locale bundle', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/hb-i18n/zh-CN'), {
      params: Promise.resolve({ lang: 'zh-CN' })
    });

    await expect(response.json()).resolves.toMatchObject({
      'alert.workbench.empty.copy': zhMessages['alert.workbench.empty.copy'],
      'alert.workbench.empty.copy.filtered': zhMessages['alert.workbench.empty.copy.filtered']
    });
  });

  it('falls back to English runtime copy when a normalized locale has no local catalog yet', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/hb-i18n/ja-JP'), {
      params: Promise.resolve({ lang: 'ja-JP' })
    });

    await expect(response.json()).resolves.toMatchObject({
      'common.save': enMessages['common.save'],
      'layout.setup.progress.headline': enMessages['layout.setup.progress.headline']
    });
  });
});
