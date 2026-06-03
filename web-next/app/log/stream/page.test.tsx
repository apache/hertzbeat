import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

vi.mock('../manage/log-manage-page', () => ({
  default: ({ forcedView, showViewToggle }: { forcedView: string; showViewToggle: boolean }) => (
    <div data-log-manage-page="true" data-forced-view={forcedView} data-show-view-toggle={String(showViewToggle)} />
  )
}));

describe('log stream route', () => {
  it('uses the canonical EventSource-backed virtualized stream instead of a static compatibility shell', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const { default: LogStreamPage } = await import('./page');
    const html = renderToStaticMarkup(<LogStreamPage />);
    const source = readFileSync(resolve(process.cwd(), 'app/log/stream/page.tsx'), 'utf8');

    expect(html).toContain('data-log-stream-canonical-live-route="log-manage-stream"');
    expect(html).toContain('data-log-manage-page="true"');
    expect(html).toContain('data-forced-view="stream"');
    expect(html).toContain('data-show-view-toggle="false"');
    expect(source).toContain('LogManagePage');
    expect(source).toContain('forcedView="stream"');
    expect(source).toContain('showViewToggle={false}');
    expect(source).not.toContain('data-log-stream-surface="angular-log-stream"');
    expect(source).not.toContain(`${expectedT('log.manage.stream.status.connecting')}...`);
    expect(source).not.toContain(expectedT('log.manage.stream.count', { count: 0 }));
    expect(source).not.toContain('filterFields.map');
  });
});
