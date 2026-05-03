import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MonitorEditPage from './page';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  lastLoad: null as null | (() => Promise<unknown>),
  routerPush: vi.fn(),
  draft: {
    monitor: {
      id: 42,
      app: 'website',
      name: 'checkout',
      instance: 'example.com:80',
      scrape: 'static',
      scheduleType: 'interval',
      intervals: 60,
      status: 1,
      labels: { team: 'platform' },
      annotations: { owner: 'sre' }
    },
    collector: '',
    grafanaDashboard: { enabled: false, template: '' },
    params: [{ field: 'host', paramValue: 'example.com' }],
    paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
    advancedParams: [],
    advancedParamDefines: [],
    scrapeParams: [],
    scrapeParamDefines: [],
    collectors: []
  }
}));

const loadMonitorEditorDraft = vi.hoisted(() => vi.fn(async () => mockState.draft));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockState.routerPush
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock(),
    locale: 'en-US'
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.draft)}</div>;
  }
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => ''
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}));

vi.mock('@/components/workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, children }: any) => (
    <section>
      <h3>{title}</h3>
      <p>{copy}</p>
      {children}
    </section>
  )
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  WorkbenchPage: ({ kicker, title, subtitle, actions, main, side }: any) => (
    <main>
      <div>{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      <div>{main}</div>
      <aside>{side}</aside>
    </main>
  ),
  RowList: ({ rows }: any) => (
    <div>
      {rows.map((row: any, index: number) => (
        <div key={`${row.title}-${index}`}>{`${row.title}:${row.copy}`}</div>
      ))}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/monitor-editor/controller', () => ({
  createMonitor: vi.fn(),
  detectMonitor: vi.fn(),
  loadMonitorEditorDraft,
  loadMonitorScrapeDraft: vi.fn(async () => ({
    scrapeParams: [],
    scrapeParamDefines: []
  })),
  syncMonitorDependentDisplay: (draft: any) => draft,
  updateMonitor: vi.fn(),
  updateMonitorEditorParam: (draft: any, kind: string, index: number, value: unknown) => ({
    ...draft,
    [kind]: draft[kind].map((row: any, rowIndex: number) => (rowIndex === index ? { ...row, paramValue: value } : row))
  }),
  validateMonitorEditorDraft: vi.fn(() => null)
}));

vi.mock('@/lib/monitor-editor/navigation', () => ({
  buildMonitorEditorReturnUrl: () => '/monitors?app=website'
}));

vi.mock('@/lib/monitor-editor/localized-text', () => ({
  resolveLocalizedText: (value: any, _locale: string, fallback: string) => {
    if (typeof value === 'string') return value;
    return fallback;
  }
}));

vi.mock('@/lib/entity-editor/draft-utils', () => ({
  fromKeyValueDraft: (rows: Array<{ key: string; value: string }>) =>
    rows.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value.trim();
      return acc;
    }, {}),
  toKeyValueDraft: (record?: Record<string, string>) =>
    Object.entries(record || {}).length > 0
      ? Object.entries(record || {}).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
}));

vi.mock('@/lib/entity-editor/editor-state', () => ({
  ensureKeyValueRows: (rows: Array<{ key: string; value: string }>) => (rows.length > 0 ? rows : [{ key: '', value: '' }]),
  removeRowAt: (rows: Array<{ key: string; value: string }>, index: number) =>
    rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, rowIndex) => rowIndex !== index),
  updateRowAt: (rows: Array<{ key: string; value: string }>, index: number, patch: Record<string, string>) =>
    rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | undefined | null | false>) => values.filter(Boolean).join(' ')
}));

describe('MonitorEditPage', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams('returnTo=%2Fentities%2F7');
    mockState.lastLoad = null;
    mockState.routerPush.mockReset();
    loadMonitorEditorDraft.mockClear().mockResolvedValue(mockState.draft);
  });

  it('renders the HertzBeat monitor form surface for the edit route', () => {
    const html = renderToStaticMarkup(<MonitorEditPage params={Promise.resolve({ monitorId: '42' })} />);

    expect(html).toContain('<form');
    expect(html).toContain('checkout');
    expect(html).toContain('OK');
  });

  it('loads the edit-monitor draft with the current monitor id', async () => {
    renderToStaticMarkup(<MonitorEditPage params={Promise.resolve({ monitorId: '42' })} />);

    await mockState.lastLoad?.();

    expect(loadMonitorEditorDraft).toHaveBeenCalledWith(expect.any(Function), 'edit', {
      monitorId: '42'
    });
  });
});
