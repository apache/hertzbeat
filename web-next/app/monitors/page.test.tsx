import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const apiMessageGet = vi.fn();

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: null as any
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace,
    push: vi.fn()
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
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
    const data =
      mockState.renderData ??
      {
        list: {
          content: [
            {
              id: 42,
              name: 'checkout-http',
              app: 'http',
              instance: '10.0.0.42',
              status: 2,
              scrape: 'static',
              labels: { team: 'platform' },
              gmtUpdate: 1713200000000
            }
          ],
          pageIndex: 0,
          pageSize: 8,
          totalElements: 1
        },
        query: {
          search: mockState.searchParams.get('search') || '',
          app: mockState.searchParams.get('app') || '',
          labels: mockState.searchParams.get('labels') || '',
          status: mockState.searchParams.get('status') || '',
          pageIndex: mockState.searchParams.get('pageIndex') || '',
          pageSize: mockState.searchParams.get('pageSize') || '',
          entityId: mockState.searchParams.get('entityId') || '',
          entityName: mockState.searchParams.get('entityName') || '',
          returnTo: mockState.searchParams.get('returnTo') || ''
        },
        entityWorkbenchFallback: false
      };
    return (
      <div data-client-workbench="true">
        {children(data)}
      </div>
    );
  }
}));

vi.mock('@/components/workbench/overlay-dialog', () => ({
  OverlayDialog: ({ children, footer, open, title }: any) =>
    open ? (
      <div data-overlay-dialog="true" role="dialog" aria-label={title}>
        {children}
        {footer}
      </div>
    ) : null
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ containerClassName: _containerClassName, label, ...props }: any) => (
    <label data-cold-checkbox-owner="cold-checkbox">
      <input type="checkbox" data-cold-checkbox-control="native-hidden" {...props} />
      {label ? <span data-cold-checkbox-label="true">{label}</span> : null}
    </label>
  )
}));

vi.mock('@/components/ui/file-input', () => ({
  FileInput: ({ className: _className, ...props }: any) => (
    <input type="file" data-cold-file-input-owner="cold-file-input" data-cold-file-input-control="native-hidden-file" {...props} />
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>
}));

vi.mock('@/components/observability', () => ({
  DrawerCodePreview: ({ children, className }: any) => <pre data-drawer-code-preview="true" className={className}>{children}</pre>,
  DrawerSection: ({ title, children }: any) => (
    <section data-drawer-section={title}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  ObservabilityStatusState: ({ title, copy }: any) => (
    <div data-observability-status-state="true">
      {title}
      {copy}
    </div>
  ),
  SelectableEvidenceList: ({ rows }: any) => (
    <div data-observability-selectable-evidence-list="true">
      {rows.map((row: any) => (
        <div key={row.key}>
          <div>{row.title}</div>
          {row.extra}
        </div>
      ))}
    </div>
  ),
  StageSection: ({ title, description, children }: any) => (
    <section data-stage-section={title}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  SummaryMetricGrid: ({ items }: any) => <div data-summary-metric-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  ToolbarField: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  ToolbarRow: ({ children }: any) => <div data-observability-toolbar-row="true">{children}</div>
}));

vi.mock('@/components/workbench/primitives', () => ({
  PayloadPreview: ({ children }: any) => <pre data-payload-preview="true">{children}</pre>,
  RailSection: ({ title, children }: any) => (
    <section data-rail-section="true">
      <h3>{title}</h3>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => (
    <div data-status-state="true">
      {title}
      {copy}
    </div>
  ),
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  ),
  WorkbenchStack: ({ children }: any) => <div data-workbench-stack="true">{children}</div>
}));

vi.mock('@/components/workbench/selectable-evidence-list', () => ({
  SelectableEvidenceList: ({ rows }: any) => (
    <div data-selectable-evidence-list="true">
      {rows.map((row: any) => (
        <div key={row.key}>
          <div>{row.title}</div>
          {row.extra}
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/workbench/toolbar', () => ({
  ToolbarField: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  ToolbarRow: ({ children }: any) => <div data-toolbar-row="true">{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  MetricGrid: ({ items }: any) => <div data-metric-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <div data-workbench-main="true">{main}</div>
      <div data-workbench-side="true">{side}</div>
    </div>
  )
}));

vi.mock('@/lib/monitor-manage/controller', () => ({
  buildExportAllMonitorsUrl: vi.fn(() => '/monitors/export/all?type=JSON'),
  buildExportMonitorsUrl: vi.fn(() => '/monitors/export?type=JSON'),
  buildImportMonitorsUrl: vi.fn(() => '/monitors/import'),
  copyMonitor: vi.fn(),
  deleteGrafanaDashboard: vi.fn(),
  deleteMonitors: vi.fn(),
  enableMonitor: vi.fn(),
  enableMonitors: vi.fn(),
  pauseMonitor: vi.fn(),
  pauseMonitors: vi.fn(),
  resolveDownloadFilename: vi.fn(() => 'monitors.json')
}));

vi.mock('@/lib/monitor-manage/display-mapping', () => ({
  buildLabelRows: (labels?: Record<string, string>) =>
    Object.entries(labels || {}).map(([key, value]) => ({
      title: key,
      copy: value,
      meta: 'label'
    })),
  statusLabel: (status: number) => (status === 2 ? 'Down' : status === 1 ? 'Up' : 'Paused')
}));

vi.mock('@/lib/monitor-manage/navigation', () => ({
  buildMonitorDetailHref: (monitorId: number, context?: any) =>
    context?.entityId ? `/monitors/${monitorId}?entityId=${context.entityId}` : `/monitors/${monitorId}`,
  buildMonitorEditHref: (monitorId: number, context?: any) =>
    context?.entityId ? `/monitors/${monitorId}/edit?entityId=${context.entityId}` : `/monitors/${monitorId}/edit`,
  buildMonitorEntityReturnHref: (context?: any) =>
    context?.returnTo?.startsWith('/') && !context.returnTo.startsWith('//')
      ? context.returnTo
      : context?.entityId
        ? `/entities/${context.entityId}`
        : '/entities',
  buildMonitorNewHref: (context?: any) =>
    context?.entityId ? `/monitors/new?entityId=${context.entityId}` : '/monitors/new',
  resolveMonitorCheckboxSelection: (checkedIds: number[], _selectedId: number | null, monitorId: number, checked: boolean) => ({
    checkedIds: checked ? Array.from(new Set([...checkedIds, monitorId])) : checkedIds.filter(id => id !== monitorId),
    selectedId: monitorId
  })
}));

vi.mock('@/lib/monitor-manage/query-state', async () => {
  const actual = await vi.importActual<typeof import('@/lib/monitor-manage/query-state')>('@/lib/monitor-manage/query-state');
  return actual;
});

vi.mock('@/lib/monitor-manage/view-model', () => ({
  buildMonitorMetrics: () => [
    { label: 'Current page up', value: '0' },
    { label: 'Current page down', value: '1' },
    { label: 'Current page paused', value: '0' }
  ],
  buildMonitorWorkbenchNarrative: ({
    entityContextActive,
    total,
    fellBackToAll
  }: {
    entityContextActive: boolean;
    total: number;
    fellBackToAll: boolean;
  }) => {
    if (!entityContextActive) return 'Monitor center subtitle';
    if (total === 0) return 'Entity monitor empty state';
    if (fellBackToAll) return 'Entity monitor fallback state';
    return 'Entity monitor down-first state';
  },
  buildSelectedMonitorRows: (selected: any) =>
    selected
      ? [
          { title: selected.name, copy: `${selected.app} · ${selected.instance}`, meta: 'Down' }
        ]
      : [{ title: 'No monitor selected', copy: 'Pick a monitor', meta: '-' }],
  shouldFallbackMonitorEntityWorkbench: ({
    entityContextActive,
    statusWasImplicit,
    status,
    totalElements,
    fellBackToAll
  }: {
    entityContextActive: boolean;
    statusWasImplicit: boolean;
    status: string;
    totalElements: number;
    fellBackToAll: boolean;
  }) => entityContextActive && statusWasImplicit && status === '2' && totalElements === 0 && !fellBackToAll
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  getAuthorizationToken: vi.fn(() => ''),
  getCurrentLocale: vi.fn(() => 'en-US')
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-19 09:00:00'
}));

beforeEach(() => {
  mockState.searchParams = new URLSearchParams();
  mockState.replace.mockReset();
  mockState.lastLoad = null;
  mockState.renderData = null;
  apiMessageGet.mockReset();
});

describe('monitors page', () => {
  it('defaults entity workbench routes to down monitors and swaps create/import for a return action', async () => {
    mockState.searchParams = new URLSearchParams(
      'app=website&entityId=42&entityName=Checkout%20Service&returnTo=%2Fentities%2F42%3FreturnLabel%3DReturn%2520to%2520entity&returnLabel=Return%20to%20entity'
    );
    apiMessageGet.mockResolvedValueOnce({
      content: [],
      pageIndex: 0,
      pageSize: 8,
      totalElements: 0
    });

    const { default: MonitorsPage } = await import('./page');
    const html = renderToStaticMarkup(<MonitorsPage />);
    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/monitors?pageIndex=0&pageSize=8&app=website&status=2&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(html).toContain('Checkout Service');
    expect(html).not.toContain('Return to entity');
    expect(html).toContain('href="/entities/42"');
    expect(html).not.toContain('New monitor');
    expect(html).not.toContain('Import');
  });

  it('keeps the entity return action on an internal entity route when returnTo is unsafe', async () => {
    mockState.searchParams = new URLSearchParams(
      'app=website&entityId=42&entityName=Checkout%20Service&returnTo=%2F%2Fevil.example%2Fsteal-session&returnLabel=Return%20to%20entity'
    );
    apiMessageGet.mockResolvedValueOnce({
      content: [],
      pageIndex: 0,
      pageSize: 8,
      totalElements: 0
    });

    const { default: MonitorsPage } = await import('./page');
    const html = renderToStaticMarkup(<MonitorsPage />);

    expect(html).toContain('Checkout Service');
    expect(html).not.toContain('Return to entity');
    expect(html).toContain('href="/entities/42"');
    expect(html).not.toContain('href="//evil.example/steal-session"');
  });

  it('falls back entity workbench routes from down-only mode to all monitors when the abnormal pass is empty', async () => {
    mockState.searchParams = new URLSearchParams(
      'app=website&entityId=42&entityName=Checkout%20Service&returnTo=%2Fentities%2F42%3FreturnLabel%3DReturn%2520to%2520entity&returnLabel=Return%20to%20entity'
    );
    apiMessageGet
      .mockResolvedValueOnce({
        content: [],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 0
      })
      .mockResolvedValueOnce({
        content: [
          {
            id: 99,
            name: 'checkout-healthy',
            app: 'http',
            instance: '10.0.0.99',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      });

    const { default: MonitorsPage } = await import('./page');
    renderToStaticMarkup(<MonitorsPage />);
    const loaded = await mockState.lastLoad?.();
    mockState.renderData = loaded;
    const html = renderToStaticMarkup(<MonitorsPage />);

    expect(apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/monitors?pageIndex=0&pageSize=8&app=website&status=2&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(apiMessageGet).toHaveBeenNthCalledWith(
      2,
      '/monitors?pageIndex=0&pageSize=8&app=website&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(loaded).toMatchObject({
      entityWorkbenchFallback: true,
      query: {
        status: ''
      },
      list: {
        totalElements: 1
      }
    });
    expect(html).toContain('Entity monitor fallback state');
  });

  it('renders stable list/detail selectors for monitor release-path browser smoke', async () => {
    mockState.searchParams = new URLSearchParams('search=checkout-http&app=website&status=2&pageIndex=0&pageSize=8');

    const { default: MonitorsPage } = await import('./page');
    const html = renderToStaticMarkup(<MonitorsPage />);

    expect(html).toContain('data-monitors-search-input="true"');
    expect(html).toContain('data-monitors-app-input="true"');
    expect(html).toContain('data-monitors-status-filter="true"');
    expect(html).toContain('data-monitors-open-detail-action="true"');
    expect(html).toContain('data-monitors-copy-action="true"');
    expect(html).toContain('data-monitors-pause-selected-action="true"');
    expect(html).toContain('data-monitors-row-select="42"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
  });

  it('routes the monitor workbench through observability owners', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const t = createTranslatorMock();
    const { default: MonitorsPage } = await import('./page');
    const html = renderToStaticMarkup(<MonitorsPage />);

    expect(html).toContain('data-summary-metric-grid="true"');
    expect(html).toContain(`data-stage-section="${t('monitors.section.list.title')}"`);
    expect(html).toContain(`data-drawer-section="${t('monitors.rail.selected')}"`);
    expect(html).toContain(`data-drawer-section="${t('monitors.rail.labels')}"`);
    expect(html).toContain(`data-drawer-section="${t('monitors.rail.controls')}"`);
    expect(html).toContain('data-drawer-code-preview="true"');
    expect(source).toContain("from '@/components/observability'");
    expect(source).toContain('SummaryMetricGrid');
    expect(source).toContain('StageSection');
    expect(source).toContain('DrawerSection');
    expect(source).toContain('DrawerCodePreview');
    expect(source).toContain('ObservabilityStatusState');
    expect(source).not.toContain("from '@/components/workbench/primitives'");
    expect(source).not.toContain("from '@/components/workbench/toolbar'");
    expect(source).not.toContain("from '@/components/workbench/selectable-evidence-list'");
  });

  it('uses the shared cold checkbox for monitor row selection instead of default checkbox chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');

    expect(source).toContain("import { Checkbox } from '@/components/ui/checkbox';");
    expect(source).toContain('<Checkbox');
    expect(source).toContain('data-monitors-row-select={String(item.id)}');
    expect(source).not.toContain('type="checkbox"');
  });

  it('canonicalizes display-only return labels out of the live monitor URL', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');

    expect(source).toContain("searchParams.has('returnLabel')");
    expect(source).toContain("searchParams.get('returnTo')?.includes('returnLabel')");
    expect(source).toContain('router.replace(canonicalRoute)');
  });

  it('routes selected monitor deletion through a cold modal instead of native confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');

    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).toContain('OverlayDialog');
    expect(source).toContain('data-monitors-delete-confirm-trigger="cold-modal"');
    expect(source).toContain('data-monitors-delete-confirm="cold-modal"');
    expect(source).toContain('确认删除监控');
    expect(source).toContain('确认删除');
    expect(source).toContain('取消');
  });
});
