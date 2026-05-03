import React from 'react';
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
    t: createTranslatorMock()
  })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    loadState.lastLoad = load;
    return (
      <div data-client-workbench="true">
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
    expect(html).toContain('Ops board');
    expect(loadBulletinData).toHaveBeenCalledWith(apiMessageGet, '');
  }, 15000);
});
