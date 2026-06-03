import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MonitorNewPage from './monitor-new-page';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { MonitorNewRouteState } from '../../../lib/monitor-editor/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  routerPush: vi.fn(),
  redirect: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
  draft: {
    monitor: {
      id: 0,
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

const loadMonitorEditorDraftFromFacade = vi.hoisted(() => vi.fn(async () => mockState.draft));

vi.mock('next/navigation', () => ({
  redirect: mockState.redirect,
  useRouter: () => ({
    push: mockState.routerPush
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' }),
    locale: 'zh-CN'
  })
}));

const expectedT = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    cacheKey,
    cacheSettledTtlMs
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
  }) => {
    mockState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-cache-key={cacheKey} data-cache-settled-ttl={cacheSettledTtlMs}>
        {children(mockState.draft)}
      </div>
    );
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

vi.mock('@/lib/monitor-api-facade', () => ({
  api: {
    monitors: {
      editorCollectors: vi.fn(),
      editorParamDefines: vi.fn()
    }
  }
}));

vi.mock('@/lib/monitor-editor/controller', () => ({
  buildMonitorEditorCollectorsUrl: () => '/collector',
  buildMonitorEditorParamDefinesUrl: (app: string) => `/apps/${app}/params`,
  createMonitor: vi.fn(),
  detectMonitor: vi.fn(),
  loadMonitorEditorDraftFromFacade,
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
  buildMonitorEditorCancelUrl: () => '/monitors',
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

function renderMonitorNewPage(
  initialRouteState: MonitorNewRouteState = {
    app: 'website',
    returnContext: { returnTo: '/entities/7' }
  }
) {
  return renderToStaticMarkup(<MonitorNewPage initialRouteState={initialRouteState} />);
}

describe('MonitorNewPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.routerPush.mockReset();
    mockState.redirect.mockClear();
    loadMonitorEditorDraftFromFacade.mockClear().mockResolvedValue(mockState.draft);
  });

  it('renders the HertzBeat monitor form surface for the new route', () => {
    const html = renderMonitorNewPage();

    expect(html).toContain('<form');
    expect(html).toContain('data-cache-key="monitor-editor-new:/collector:/apps/website/params"');
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('data-monitor-editor-app-source-contract="angular-route-context-hidden-field"');
    expect(html).toContain('data-monitor-editor-static-host-position-contract="angular-before-name"');
    expect(html).toContain('data-monitor-editor-field-order-contract="angular-monitor-form-sequence"');
    expect(html).toContain('data-monitor-editor-detect-payload-contract="angular-monitor-collector-params-no-grafana"');
    expect(html).toContain('data-monitor-editor-save-payload-contract="angular-monitor-collector-params-grafana"');
    expect(html).toContain('data-monitor-editor-payload-param-merge-contract="angular-params-advanced-sdparams"');
    expect(html).toContain('data-monitor-editor-payload-host-instance-contract="angular-host-param-as-instance"');
    expect(html).toContain('data-monitor-editor-service-discovery-params="angular-nonstatic-only"');
    expect(html).toContain('data-monitor-editor-ssl-port-notice="angular-info-notification"');
    expect(html).toContain('data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"');
    expect(html).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(html).toContain(expectedT('monitor.new-monitor'));
    expect(html).toContain(expectedT('common.button.ok'));
  });

  it('loads the new-monitor draft with the current app context', async () => {
    renderMonitorNewPage();

    await mockState.lastLoad?.();

    expect(loadMonitorEditorDraftFromFacade).toHaveBeenCalledWith(
      expect.objectContaining({
        readCollectors: expect.any(Function),
        readParamDefines: expect.any(Function)
      }),
      'new',
      {
        app: 'website'
      }
    );
  });

  it('uses the typed route state app when loading a new monitor from a handoff', async () => {
    const initialRouteState: MonitorNewRouteState = {
      app: 'prometheus',
      returnContext: {
        labels: 'team=platform',
        entityId: '42',
        entityName: 'Checkout Service',
        timeRange: '1h',
        returnTo: '/entities/42'
      }
    };
    const html = renderMonitorNewPage(initialRouteState);

    expect(html).toContain('data-cache-key="monitor-editor-new:/collector:/apps/prometheus/params"');

    await mockState.lastLoad?.();

    expect(loadMonitorEditorDraftFromFacade).toHaveBeenCalledWith(
      expect.objectContaining({
        readCollectors: expect.any(Function),
        readParamDefines: expect.any(Function)
      }),
      'new',
      {
        app: 'prometheus'
      }
    );
  });

  it('loads monitor editor draft through the monitor domain facade instead of a raw getter', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/new/monitor-new-page.tsx'), 'utf8');

    expect(source).toContain('loadMonitorEditorDraftFromFacade(');
    expect(source).toContain('readCollectors: api.monitors.editorCollectors');
    expect(source).toContain('readParamDefines: api.monitors.editorParamDefines');
    expect(source).not.toContain("import { apiMessageGet } from '@/lib/api-client'");
    expect(source).not.toContain('loadMonitorEditorDraft(apiMessageGet');
  });
});

describe('MonitorNewRoutePage', () => {
  beforeEach(() => {
    mockState.redirect.mockClear();
  });

  it('redirects missing app query to the Angular-style website monitor setup URL', async () => {
    const { default: MonitorNewRoutePage } = await import('./page');

    await expect(MonitorNewRoutePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/monitors/new?app=website'
    );
    expect(mockState.redirect).toHaveBeenCalledWith('/monitors/new?app=website');
  });

  it('does not redirect when the app query is present', async () => {
    const { default: MonitorNewRoutePage } = await import('./page');
    const element = await MonitorNewRoutePage({ searchParams: Promise.resolve({ app: 'prometheus' }) });
    const html = renderToStaticMarkup(element);

    expect(mockState.redirect).not.toHaveBeenCalled();
    expect(html).toContain('data-cache-key="monitor-editor-new:/collector:/apps/prometheus/params"');
  });
});
