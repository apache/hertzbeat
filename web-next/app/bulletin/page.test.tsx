import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const loadState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>)
}));

const apiMessageGet = vi.fn();
const loadBulletinData = vi.fn(async () => ({
  list: {
    totalElements: 2,
    content: [
      { id: 7, name: 'Ops board', app: 'website', monitorIds: [1, 2], creator: 'ops' },
      { id: 8, name: 'DB board', app: 'website', monitorIds: [3], creator: 'ops' }
    ]
  }
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'en-US' }),
    locale: 'en-US'
  })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    loadState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
        {children({
          list: {
            totalElements: 2,
            content: [
              { id: 7, name: 'Ops board', app: 'website', monitorIds: [1, 2], creator: 'ops' },
              { id: 8, name: 'DB board', app: 'website', monitorIds: [3], creator: 'ops' }
            ]
          }
        })}
      </div>
    );
  }
}));

vi.mock('@/components/pages/bulletin-center-surface', () => ({
  BulletinCenterSurface: ({ refreshTick }: { refreshTick: number }) => (
    <div data-bulletin-center-surface="true">
      <span>{refreshTick}</span>
      <span>Ops board</span>
    </div>
  )
}));

vi.mock('../../lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('../../lib/bulletin-center/controller', async () => {
  const actual = await import('../../lib/bulletin-center/controller');
  return {
    ...actual,
    loadBulletinData
  };
});

describe('bulletin page', () => {
  it('renders the shared bulletin center surface and keeps the controller-backed load path', async () => {
    loadBulletinData.mockClear();
    apiMessageGet.mockReset();
    loadState.lastLoad = null;

    const { default: BulletinPage } = await import('./page');
    const html = renderToStaticMarkup(<BulletinPage />);
    const lastLoad = loadState.lastLoad as (() => Promise<unknown>) | null;
    await lastLoad?.();

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-bulletin-center-surface="true"');
    expect(html).toContain('data-loading-copy="Loading bulletin center"');
    expect(html).toContain('Ops board');
    expect(loadBulletinData).toHaveBeenCalledWith(apiMessageGet, '');
  }, 15000);

  it('keeps bulletin center remounts on a short settled cache window while reload invalidates it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/bulletin/bulletin-page.tsx'), 'utf8');

    expect(source).toContain('BULLETIN_CENTER_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['bulletin-center', bulletinListUrl, refreshTick].join(':')");
    expect(source).toContain('[bulletinListUrl, refreshTick]');
    expect(source).toContain('onReload={() => setRefreshTick(value => value + 1)}');
    expect(source).toContain('cacheSettledTtlMs={BULLETIN_CENTER_SETTLED_CACHE_TTL_MS}');
  });
});
