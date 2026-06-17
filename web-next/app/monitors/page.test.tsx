// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const apiMessageGet = vi.fn();
const apiMessagePost = vi.fn();
const apiMessageDelete = vi.fn();
const apiDownload = vi.fn();

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const EMPTY_MONITOR_TEST_QUERY = {
  search: '',
  app: '',
  labels: '',
  status: '',
  pageIndex: '',
  pageSize: '',
  entityId: '',
  entityName: '',
  returnTo: ''
};

const mockState = vi.hoisted(() => ({
  initialQuery: {
    search: '',
    app: '',
    labels: '',
    status: '',
    pageIndex: '',
    pageSize: '',
    entityId: '',
    entityName: '',
    returnTo: ''
  },
  explicitStatus: '',
  replace: vi.fn(),
  push: vi.fn(),
  prefetch: vi.fn(),
  queryClient: {
    fetchQuery: vi.fn(async ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn()),
    invalidateQueries: vi.fn()
  },
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
    push: mockState.push,
    prefetch: mockState.prefetch
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockState.queryClient
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
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
        query: mockState.initialQuery,
        entityWorkbenchFallback: false
      };
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
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
    <label data-hz-checkbox-owner="hertzbeat-ui-checkbox">
      <input type="checkbox" data-hz-checkbox-control="native-hidden" {...props} />
      {label ? <span data-hz-checkbox-label="true">{label}</span> : null}
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
          <div data-monitor-row-copy={row.copy}>{row.copy}</div>
          <div data-monitor-row-meta={row.meta}>{row.meta}</div>
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
  RowList: ({ rows }: any) => (
    <div data-row-list="true">
      {rows.map((row: any) => (
        <div key={row.title} data-row-list-title={row.title} data-row-list-copy={row.copy} data-row-list-meta={row.meta}>
          {`${row.title}:${row.copy}:${row.meta}`}
        </div>
      ))}
    </div>
  ),
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
  buildCopyMonitorUrl: vi.fn((monitorId: number | string) => `/monitor/copy/${monitorId}`),
  buildDeleteGrafanaDashboardUrl: vi.fn((monitorId: number | string) => `/grafana/dashboard?monitorId=${monitorId}`),
  buildDeleteMonitorsUrl: vi.fn((ids: Array<number | string> = []) => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', String(id)));
    return `/monitors?${params.toString()}`;
  }),
  buildEnableMonitorsUrl: vi.fn((ids: Array<number | string> = []) => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', String(id)));
    return `/monitors/manage?${params.toString()}`;
  }),
  buildExportAllMonitorsUrl: vi.fn(() => '/monitors/export/all?type=JSON'),
  buildExportMonitorsUrl: vi.fn((ids: Array<number | string> = [], type: 'JSON' | 'EXCEL' = 'JSON') => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', String(id)));
    params.append('type', type);
    return `/monitors/export?${params.toString()}`;
  }),
  buildImportMonitorsUrl: vi.fn(() => '/monitors/import'),
  buildPauseMonitorsUrl: vi.fn((ids: Array<number | string> = []) => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', String(id)));
    params.append('type', 'JSON');
    return `/monitors/manage?${params.toString()}`;
  }),
  copyMonitor: vi.fn(),
  deleteGrafanaDashboard: vi.fn(),
  deleteMonitors: vi.fn(),
  enableMonitor: vi.fn(),
  enableMonitors: vi.fn(),
  importMonitorsFromFacade: vi.fn((writeImportMonitors: any, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return writeImportMonitors(formData);
  }),
  loadMonitorListFromFacade: vi.fn((readMonitorList: any, query: any) => readMonitorList(query)),
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
  monitorStatusTone: (status?: number) => (status === 2 ? 'critical' : status === 1 ? 'success' : 'neutral'),
  statusBadgeVariant: (status?: number) => (status === 2 ? 'danger' : status === 1 ? 'success' : 'default'),
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
    context?.app
      ? `/monitors/new?app=${context.app}`
      : context?.entityId
        ? `/monitors/new?entityId=${context.entityId}`
        : '/monitors/new',
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
  apiDownload,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  getAuthorizationToken: vi.fn(() => ''),
  getCurrentLocale: vi.fn(() => 'en-US')
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-19 09:00:00'
}));

beforeEach(() => {
  mockState.initialQuery = { ...EMPTY_MONITOR_TEST_QUERY };
  mockState.explicitStatus = '';
  mockState.replace.mockReset();
  mockState.push.mockReset();
  mockState.prefetch.mockReset();
  mockState.queryClient.fetchQuery.mockReset();
  mockState.queryClient.fetchQuery.mockImplementation(async ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn());
  mockState.queryClient.invalidateQueries.mockReset();
  mockState.lastLoad = null;
  mockState.renderData = null;
  apiMessageGet.mockReset();
  apiMessagePost.mockReset();
  apiMessagePost.mockResolvedValue(undefined);
  apiMessageDelete.mockReset();
  apiMessageDelete.mockResolvedValue(undefined);
  apiDownload.mockReset();
  apiDownload.mockImplementation((path: string) =>
    fetch(path.startsWith('/api') ? path : `/api${path}`, {
      headers: { 'Accept-Language': 'en-US' },
      credentials: 'same-origin',
      cache: 'no-store'
    })
  );
});

function buildMonitorTestQuery(overrides: Partial<typeof EMPTY_MONITOR_TEST_QUERY> = {}) {
  const query = { ...EMPTY_MONITOR_TEST_QUERY, ...overrides };
  if (!query.status && (query.entityId || query.entityName || query.returnTo)) {
    query.status = '2';
  }
  return query;
}

async function renderMonitorsPage(
  overrides: Partial<typeof EMPTY_MONITOR_TEST_QUERY> = {},
  explicitStatus = ''
) {
  mockState.initialQuery = buildMonitorTestQuery(overrides);
  mockState.explicitStatus = explicitStatus;
  const { default: MonitorsPage } = await import('./monitor-manage-page');
  const initialQuery = mockState.initialQuery;
  return renderToStaticMarkup(<MonitorsPage initialQuery={initialQuery} explicitStatus={explicitStatus} />);
}

describe('monitors page', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the old Angular monitor type picker instead of defaulting new monitor to the selected row app', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 3,
        pageSize: 20,
        totalElements: 61
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' }} />
      );
      await Promise.resolve();
    });

    const rowCheckbox = interactionContainer.querySelector('input[data-monitors-row-select="501"]') as HTMLInputElement | null;
    const refreshButton = interactionContainer.querySelector(
      'button[data-monitor-manage-manual-refresh-action="sync"]'
    ) as HTMLButtonElement | null;
    expect(rowCheckbox).not.toBeNull();
    expect(refreshButton).not.toBeNull();
    expect(refreshButton?.getAttribute('data-monitor-manage-manual-refresh-owner')).toBe('hertzbeat-ui-icon-button');
    expect(refreshButton?.getAttribute('data-monitor-manage-manual-refresh-tick')).toBe('0');

    await act(async () => {
      rowCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(rowCheckbox?.checked).toBe(true);

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const refreshedButton = interactionContainer.querySelector(
      'button[data-monitor-manage-manual-refresh-action="sync"]'
    ) as HTMLButtonElement | null;
    expect(refreshedButton?.getAttribute('data-monitor-manage-manual-refresh-tick')).toBe('1');
    expect(rowCheckbox?.checked).toBe(false);
    expect(mockState.replace).not.toHaveBeenCalled();
  }, 15000);

  it('supports the old Angular simple pagination page index change workflow', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 1,
        pageSize: 20,
        totalElements: 61
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '1', pageSize: '20' },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '1', pageSize: '20' }} />
      );
      await Promise.resolve();
    });

    const pageJumpInput = interactionContainer.querySelector(
      'input[data-monitor-manage-pagination-action="page-jump"]'
    ) as HTMLInputElement | null;
    expect(pageJumpInput).not.toBeNull();
    expect(pageJumpInput?.getAttribute('data-hz-pagination-action')).toBe('page-jump');
    expect(pageJumpInput?.getAttribute('data-monitor-manage-pagination-page-jump-owner')).toBe('hertzbeat-ui-input');
    expect(pageJumpInput?.value).toBe('2');

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(pageJumpInput, '4');
      pageJumpInput?.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?search=prod&app=mysql&pageIndex=3&pageSize=20');
  }, 15000);

  it('wires compact row actions to detail/edit hrefs and copy mutation', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessageDelete.mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const detailLink = interactionContainer.querySelector(
      'a[data-monitors-open-detail-action="true"]'
    ) as HTMLAnchorElement | null;
    const editLink = interactionContainer.querySelector(
      'a[data-monitors-edit-action="true"]'
    ) as HTMLAnchorElement | null;
    const appFilterLink = interactionContainer.querySelector(
      'a[data-monitor-row-app-filter-link="angular-app-tag-link"]'
    ) as HTMLAnchorElement | null;
    const labelColorGroup = interactionContainer.querySelector(
      '[data-monitor-row-label-color="angular-render-label-color"]'
    ) as HTMLElement | null;
    const labelTag = interactionContainer.querySelector(
      '[data-monitor-row-label-color-token]'
    ) as HTMLElement | null;
    const copyButton = interactionContainer.querySelector(
      'button[data-monitors-copy-action="true"]'
    ) as HTMLButtonElement | null;
    const pauseButton = interactionContainer.querySelector(
      'button[data-monitor-row-response-action="pause"]'
    ) as HTMLButtonElement | null;
    const deleteButton = interactionContainer.querySelector(
      'button[data-monitor-row-delete-action="single"]'
    ) as HTMLButtonElement | null;
    expect(detailLink).not.toBeNull();
    expect(detailLink?.getAttribute('href')).toBe('/monitors/501');
    expect(editLink).not.toBeNull();
    expect(editLink?.getAttribute('href')).toBe('/monitors/501/edit');
    expect(appFilterLink).not.toBeNull();
    expect(appFilterLink?.getAttribute('href')).toBe('/monitors?app=mysql');
    expect(appFilterLink?.getAttribute('data-monitor-row-app-filter-target')).toBe('/monitors?app=mysql');
    expect(labelColorGroup).not.toBeNull();
    expect(labelColorGroup?.getAttribute('data-monitor-row-labels-owner')).toBe('hertzbeat-ui-label-tag');
    expect(labelTag?.getAttribute('data-hz-ui')).toBe('label-tag');
    expect(labelTag?.textContent).toBe('team:platform');
    expect(copyButton).not.toBeNull();
    expect(copyButton?.getAttribute('data-monitor-row-copy-lifecycle')).toBe('angular-copy-success-refresh-unavailable-refresh');
    expect(copyButton?.getAttribute('data-monitor-row-copy-lifecycle-owner')).toBe('hertzbeat-ui-table-row-action-button');
    expect(pauseButton).not.toBeNull();
    expect(deleteButton).not.toBeNull();

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledWith('/monitor/copy/501', null);

    await act(async () => {
      pauseButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessageDelete).not.toHaveBeenCalledWith('/monitors/manage?ids=501&type=JSON');
    expect(interactionContainer.querySelector('[data-monitor-row-response-confirm="angular-modal-confirm"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Please confirm whether to cancel monitor!');

    const rowConfirmButton = interactionContainer.querySelector(
      '[data-monitor-row-response-confirm="angular-modal-confirm"] button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      rowConfirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors/manage?ids=501&type=JSON');
    expect(interactionContainer.textContent).toContain('Paused successfully');

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"]')).not.toBeNull();
    expect(
      interactionContainer
        .querySelector('[data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"]')
        ?.getAttribute('data-monitor-delete-confirm-closable')
    ).toBe('angular-nz-closable-false');
    expect(
      interactionContainer
        .querySelector('[data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"]')
        ?.getAttribute('data-monitor-delete-confirm-ok')
    ).toBe('angular-nz-ok-danger-primary');
    expect(interactionContainer.textContent).toContain('1 monitors selected');

    const confirmDeleteButton = interactionContainer.querySelector(
      'button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      confirmDeleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors?ids=501');
    expect(apiMessageDelete).toHaveBeenCalledWith('/grafana/dashboard?monitorId=501');
  }, 15000);

  it('moves back from an emptied last page after Angular-style monitor delete success', async () => {
    mockState.initialQuery = buildMonitorTestQuery({ pageIndex: '1', pageSize: '8' });
    mockState.renderData = {
      list: {
        content: [
          {
            id: 909,
            name: 'last-page-monitor',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 1,
        pageSize: 8,
        totalElements: 9
      },
      query: mockState.initialQuery,
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessageDelete.mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...mockState.initialQuery }} />);
      await Promise.resolve();
    });

    const deleteButton = interactionContainer.querySelector(
      'button[data-monitor-row-delete-action="single"]'
    ) as HTMLButtonElement | null;
    expect(deleteButton).not.toBeNull();

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const confirmDeleteButton = interactionContainer.querySelector(
      'button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    expect(confirmDeleteButton).not.toBeNull();

    await act(async () => {
      confirmDeleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors?ids=909');
    expect(apiMessageDelete).toHaveBeenCalledWith('/grafana/dashboard?monitorId=909');
    expect(mockState.replace).toHaveBeenCalledWith('/monitors?pageIndex=0&pageSize=8');
    expect(interactionContainer.querySelector('[data-monitor-manage-auto-refresh-tick="1"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('0 Selected / 9');
  }, 15000);

  it('closes the delete confirmation but keeps selection and page when Angular-style monitor delete fails', async () => {
    mockState.initialQuery = buildMonitorTestQuery({ pageIndex: '1', pageSize: '8' });
    mockState.renderData = {
      list: {
        content: [
          {
            id: 909,
            name: 'last-page-monitor',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 1,
        pageSize: 8,
        totalElements: 9
      },
      query: mockState.initialQuery,
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessageDelete.mockClear();
    apiMessageDelete
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('backend refused delete'));
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...mockState.initialQuery }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(interactionContainer.textContent).toContain('1 Selected / 9');

    const deleteBatchButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="delete"]'
    ) as HTMLButtonElement | null;
    expect(deleteBatchButton).not.toBeNull();

    await act(async () => {
      deleteBatchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(interactionContainer.querySelector('[data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"]')).not.toBeNull();

    const confirmDeleteButton = interactionContainer.querySelector(
      'button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      confirmDeleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors?ids=909');
    expect(apiMessageDelete).toHaveBeenCalledWith('/grafana/dashboard?monitorId=909');
    expect(interactionContainer.querySelector('[data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"]')).toBeNull();
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="critical"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Delete Failed!');
    expect(interactionContainer.textContent).toContain('backend refused delete');
    expect(interactionContainer.textContent).toContain('1 Selected / 9');
    expect(interactionContainer.querySelector('[data-monitor-manage-auto-refresh-tick="0"]')).not.toBeNull();
    expect(mockState.replace).not.toHaveBeenCalled();
  }, 15000);

  it('prewarms the edit route and monitor editor draft before the operator clicks edit', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    apiMessageGet.mockImplementation(async (url: string) => {
      if (url === '/monitor/501') {
        return {
          monitor: {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            scrape: 'static',
            status: 1
          },
          params: [],
          collector: null
        };
      }
      if (url === '/collector') {
        return { content: [] };
      }
      if (url === '/apps/mysql/params') {
        return [];
      }
      return { content: [], pageIndex: 0, pageSize: 8, totalElements: 0 };
    });
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const editLink = interactionContainer.querySelector(
      'a[data-monitors-edit-action="true"]'
    ) as HTMLAnchorElement | null;
    expect(editLink).not.toBeNull();

    await act(async () => {
      editLink?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.prefetch).toHaveBeenCalledWith('/monitors/501/edit');
    expect(apiMessageGet).toHaveBeenCalledWith('/monitor/501');
    expect(apiMessageGet).toHaveBeenCalledWith('/collector');
    expect(apiMessageGet).toHaveBeenCalledWith('/apps/mysql/params');
  }, 15000);

  it('shows an optimistic copied row immediately while the backend copy request is still pending', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    let resolveCopy: ((value: unknown) => void) | null = null;
    apiMessagePost.mockImplementationOnce(
      () => new Promise(resolve => {
        resolveCopy = resolve;
      })
    );
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const copyButton = interactionContainer.querySelector(
      'button[data-monitors-copy-action="true"]'
    ) as HTMLButtonElement | null;
    expect(copyButton).not.toBeNull();

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('mysql-production_copy');
    expect(interactionContainer.querySelector('[data-monitor-row-optimistic-copy="true"]')).not.toBeNull();
    expect(copyButton?.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      resolveCopy?.({ id: 777 });
      await Promise.resolve();
    });
  }, 15000);

  it('copies the static monitor host from the row-level Angular host affordance', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const hostCopyButton = interactionContainer.querySelector(
      'button[data-monitor-row-instance-copy="angular-host-copy"]'
    ) as HTMLButtonElement | null;
    expect(hostCopyButton).not.toBeNull();
    expect(hostCopyButton?.getAttribute('data-monitor-row-instance-copy-owner')).toBe('hertzbeat-ui-icon-button');
    expect(hostCopyButton?.getAttribute('data-monitor-row-instance-copy-target')).toBe('db.internal:3306');

    await act(async () => {
      hostCopyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('db.internal:3306');
    expect(interactionContainer.textContent).toContain('Copy Success!');
  }, 15000);

  it('renders dynamic service-discovery scrape rows with Angular scrape type text instead of copying instance', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 502,
            name: 'discovered-http',
            app: 'website',
            instance: 'http-sd-target.internal:9100',
            status: 1,
            scrape: 'http_sd',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };

    const html = await renderMonitorsPage();

    expect(html).toContain('data-monitor-row-copy="Http Service Discovery"');
    expect(html).toContain('data-monitor-row-scrape-display="angular-service-discovery"');
    expect(html).toContain('data-monitor-row-scrape-display-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-monitor-row-scrape-value="http_sd"');
    expect(html).toContain('data-monitor-row-scrape-icon="partition"');
    expect(html).not.toContain('data-monitor-row-copy="http-sd-target.internal:9100"');
    expect(html).not.toContain('data-monitor-row-instance-copy="angular-host-copy"');
  });

  it('refreshes the monitor list when Angular-style copy receives unavailable item errors', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessagePost.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 3 }));
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(interactionContainer.textContent).toContain('1 Selected / 1');

    const copyButton = interactionContainer.querySelector(
      'button[data-monitors-copy-action="true"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledWith('/monitor/copy/501', null);
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="warning"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('This monitor item is no longer available, the list will refresh automatically');
    expect(interactionContainer.textContent).toContain('0 Selected / 1');
    expect(interactionContainer.textContent).not.toContain('mysql-production_copy');
    expect(interactionContainer.querySelector('[data-monitor-manage-auto-refresh-tick="1"]')).not.toBeNull();
  }, 15000);

  it('uses one batch action feedback path for missing selections instead of inert batch buttons', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const missingSelectionActions = [
      ['enable', 'Select monitors before enabling'],
      ['pause', 'Select monitors before pausing'],
      ['export-selected', 'No monitors selected for export'],
      ['delete', 'Select monitors before deleting']
    ] as const;

    for (const [actionId, message] of missingSelectionActions) {
      const actionButton = interactionContainer.querySelector(
        `button[data-hz-batch-action="${actionId}"]`
      ) as HTMLButtonElement | null;
      expect(actionButton).not.toBeNull();
      expect(actionButton?.disabled).toBe(false);

      await act(async () => {
        actionButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      expect(interactionContainer.querySelector('[data-monitor-action-feedback="warning"]')).not.toBeNull();
      expect(
        interactionContainer.querySelector(
          '[data-monitor-action-feedback-owner="hertzbeat-ui-inline-feedback"]'
        )
      ).not.toBeNull();
      expect(interactionContainer.textContent).toContain(message);
      expect(interactionContainer.querySelector('[data-overlay-dialog="true"]')).toBeNull();
    }
  }, 15000);

  it('routes selected batch enable and pause through the Angular modal confirmation contract', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const rowCheckbox = interactionContainer.querySelector('input[data-monitors-row-select="501"]') as HTMLInputElement | null;
    const pauseButton = interactionContainer.querySelector('button[data-hz-batch-action="pause"]') as HTMLButtonElement | null;
    expect(rowCheckbox).not.toBeNull();
    expect(pauseButton).not.toBeNull();

    await act(async () => {
      rowCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(rowCheckbox?.checked).toBe(true);

    await act(async () => {
      pauseButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessageDelete).not.toHaveBeenCalledWith('/monitors/manage?ids=501&type=JSON');
    const batchDialog = interactionContainer.querySelector('[data-monitor-batch-response-confirm="angular-modal-confirm"]');
    expect(batchDialog).not.toBeNull();
    expect(batchDialog?.getAttribute('data-monitor-batch-response-confirm-closable')).toBe('angular-nz-closable-false');
    expect(batchDialog?.getAttribute('data-monitor-batch-response-confirm-ok')).toBe('angular-nz-ok-danger-primary');
    expect(batchDialog?.getAttribute('data-hz-confirm-closable')).toBe('false');
    expect(batchDialog?.getAttribute('data-hz-confirm-ok-danger')).toBe('true');
    expect(batchDialog?.getAttribute('data-hz-confirm-ok-type')).toBe('primary');
    expect(interactionContainer.textContent).toContain('Please confirm whether to cancel monitor in batches!');
    expect(interactionContainer.textContent).toContain('1 monitors selected');

    const batchConfirmButton = interactionContainer.querySelector(
      '[data-monitor-batch-response-confirm="angular-modal-confirm"] button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      batchConfirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors/manage?ids=501&type=JSON');
    expect(interactionContainer.textContent).toContain('Paused successfully');
  }, 15000);

  it('filters selected batch enable and pause ids by the old Angular monitor status predicates', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-active',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          },
          {
            id: 502,
            name: 'mysql-paused',
            app: 'mysql',
            instance: 'db.internal:3307',
            status: 0,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000001
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 2
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessageDelete.mockClear();
    apiMessageGet.mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('2 Selected / 2');
    expect(interactionContainer.innerHTML).toContain('data-monitor-batch-response-filter="angular-status-filtered-selection"');
    expect(interactionContainer.innerHTML).toContain('data-monitor-batch-response-eligible-status="paused"');
    expect(interactionContainer.innerHTML).toContain('data-monitor-batch-response-eligible-status="active"');

    const pauseButton = interactionContainer.querySelector('button[data-hz-batch-action="pause"]') as HTMLButtonElement | null;
    await act(async () => {
      pauseButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('1 monitors selected');
    const pauseConfirmButton = interactionContainer.querySelector(
      '[data-monitor-batch-response-confirm="angular-modal-confirm"] button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      pauseConfirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(apiMessageDelete).toHaveBeenCalledWith('/monitors/manage?ids=501&type=JSON');

    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const enableButton = interactionContainer.querySelector('button[data-hz-batch-action="enable"]') as HTMLButtonElement | null;
    await act(async () => {
      enableButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('1 monitors selected');
    const enableConfirmButton = interactionContainer.querySelector(
      '[data-monitor-batch-response-confirm="angular-modal-confirm"] button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      enableConfirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(apiMessageGet).toHaveBeenCalledWith('/monitors/manage?ids=502');
  }, 15000);

  it('refreshes the monitor list when Angular-style enable receives unavailable item errors', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 0,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const controller = await import('@/lib/monitor-manage/controller');
    apiMessageGet.mockClear();
    apiMessageGet.mockRejectedValueOnce(Object.assign(new Error('gone'), { status: 404 }));
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('1 Selected / 1');

    const enableButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="enable"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      enableButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiMessageGet).not.toHaveBeenCalledWith('/monitors/manage?ids=501');
    expect(interactionContainer.querySelector('[data-monitor-batch-response-confirm="angular-modal-confirm"]')).not.toBeNull();

    const batchConfirmButton = interactionContainer.querySelector(
      '[data-monitor-batch-response-confirm="angular-modal-confirm"] button[data-hz-confirm-action="confirm"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      batchConfirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageGet).toHaveBeenCalledWith('/monitors/manage?ids=501');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="warning"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('This monitor item is no longer available, the list will refresh automatically');
    expect(interactionContainer.textContent).toContain('0 Selected / 1');
    expect(
      interactionContainer.querySelector('[data-monitor-manage-auto-refresh-tick="1"]')
    ).not.toBeNull();
  }, 15000);

  it('marks batch actions busy immediately while export is preparing', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    vi.mocked(controller.buildExportAllMonitorsUrl).mockClear();
    vi.mocked(controller.buildExportMonitorsUrl).mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const exportTypeButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="selected"]'
    ) as HTMLButtonElement | null;
    expect(exportTypeButton?.disabled).toBe(false);

    await act(async () => {
      exportTypeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const exportButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    expect(exportButton).not.toBeNull();

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(controller.buildExportMonitorsUrl).toHaveBeenCalledWith([501], 'JSON');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export?ids=501&type=JSON',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' })
    );
    expect(exportButton?.getAttribute('aria-busy')).toBe('true');
    expect(exportButton?.getAttribute('data-hz-export-type-busy')).toBe('true');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="info"]')).not.toBeNull();
    expect(
      interactionContainer.querySelector('[data-monitor-action-feedback-owner="hertzbeat-ui-inline-feedback"]')
    ).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Preparing export');
  }, 15000);

  it('opens the shared Angular export type chooser before exporting selected monitors', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    vi.mocked(controller.buildExportAllMonitorsUrl).mockClear();
    vi.mocked(controller.buildExportMonitorsUrl).mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const exportTypeButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="selected"]'
    ) as HTMLButtonElement | null;
    expect(exportTypeButton).not.toBeNull();
    expect(exportTypeButton?.getAttribute('data-monitor-export-type-trigger-owner')).toBe('hertzbeat-ui-batch-toolbar');

    await act(async () => {
      exportTypeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const dialog = interactionContainer.querySelector('[data-hz-ui="export-type-dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('data-hz-export-scope')).toBe('selected');
    expect(dialog?.getAttribute('data-hz-export-selected-count')).toBe('1');
    expect(dialog?.getAttribute('data-monitor-export-type-dialog-owner')).toBe('hertzbeat-ui-export-type-dialog');
    expect(dialog?.getAttribute('data-monitors-export-type-dialog')).toBe('selected');

    const jsonOption = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    const excelOption = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="excel"]'
    ) as HTMLButtonElement | null;
    expect(jsonOption).not.toBeNull();
    expect(jsonOption?.getAttribute('data-hz-export-type-option')).toBe('JSON');
    expect(jsonOption?.getAttribute('data-monitor-export-type-option-owner')).toBe('hertzbeat-ui-export-type-dialog');
    expect(excelOption).not.toBeNull();
    expect(excelOption?.getAttribute('data-hz-export-type-option')).toBe('EXCEL');

    await act(async () => {
      jsonOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(controller.buildExportMonitorsUrl).toHaveBeenCalledWith([501], 'JSON');
    expect(controller.buildExportAllMonitorsUrl).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export?ids=501&type=JSON',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' })
    );
    expect(jsonOption?.getAttribute('aria-busy')).toBe('true');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="info"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Preparing export');
  }, 15000);

  it('keeps the shared export type chooser open when the selected export returns an Angular JSON error body', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 1, msg: 'export denied' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    vi.mocked(controller.buildExportAllMonitorsUrl).mockClear();
    vi.mocked(controller.buildExportMonitorsUrl).mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const exportTypeButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="selected"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      exportTypeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const jsonOption = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      jsonOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(controller.buildExportMonitorsUrl).toHaveBeenCalledWith([501], 'JSON');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export?ids=501&type=JSON',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' })
    );
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="critical"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Export failed');
    const dialog = interactionContainer.querySelector('[data-hz-ui="export-type-dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('data-monitors-export-type-dialog')).toBe('selected');
    expect(dialog?.getAttribute('data-hz-export-scope')).toBe('selected');
    expect(jsonOption?.getAttribute('aria-busy')).not.toBe('true');
  }, 15000);

  it('keeps Angular export-all actions available without requiring a selected monitor', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    vi.mocked(controller.buildExportAllMonitorsUrl).mockClear();
    vi.mocked(controller.buildExportMonitorsUrl).mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('0 Selected / 1');
    const exportAllButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="all"]'
    ) as HTMLButtonElement | null;
    expect(exportAllButton).not.toBeNull();
    expect(exportAllButton?.disabled).toBe(false);

    await act(async () => {
      exportAllButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const jsonOption = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    expect(jsonOption).not.toBeNull();

    await act(async () => {
      jsonOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(controller.buildExportAllMonitorsUrl).toHaveBeenCalledWith('JSON');
    expect(controller.buildExportMonitorsUrl).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export/all?type=JSON',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' })
    );
    expect(jsonOption?.getAttribute('aria-busy')).toBe('true');
    expect(jsonOption?.getAttribute('data-hz-export-type-busy')).toBe('true');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="info"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Preparing export');
  }, 15000);

  it('opens the shared Angular export type chooser for all monitors without a selection', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    vi.mocked(controller.buildExportAllMonitorsUrl).mockClear();
    vi.mocked(controller.buildExportMonitorsUrl).mockClear();
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('0 Selected / 1');
    const exportTypeButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="all"]'
    ) as HTMLButtonElement | null;
    expect(exportTypeButton).not.toBeNull();
    expect(exportTypeButton?.getAttribute('data-monitor-export-type-trigger-owner')).toBe('hertzbeat-ui-batch-toolbar');

    await act(async () => {
      exportTypeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const dialog = interactionContainer.querySelector('[data-hz-ui="export-type-dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('data-hz-export-scope')).toBe('all');
    expect(dialog?.getAttribute('data-hz-export-selected-count')).toBe('0');
    expect(dialog?.getAttribute('data-monitor-export-type-dialog-owner')).toBe('hertzbeat-ui-export-type-dialog');
    expect(dialog?.getAttribute('data-monitors-export-type-dialog')).toBe('all');

    const jsonOption = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    expect(jsonOption).not.toBeNull();

    await act(async () => {
      jsonOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(controller.buildExportAllMonitorsUrl).toHaveBeenCalledWith('JSON');
    expect(controller.buildExportMonitorsUrl).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export/all?type=JSON',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' })
    );
    expect(jsonOption?.getAttribute('aria-busy')).toBe('true');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="info"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Preparing export');
  }, 15000);

  it('keeps Angular monitor import feedback tied to the uploaded file name', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    let resolveImport: (value?: unknown) => void = () => {};
    apiMessagePost.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveImport = resolve;
        })
    );
    const controller = await import('@/lib/monitor-manage/controller');
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(interactionContainer.textContent).toContain('1 Selected / 1');

    const importButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="import"]'
    ) as HTMLButtonElement | null;
    const importInput = interactionContainer.querySelector(
      'input[data-monitors-import-file-input="true"]'
    ) as HTMLInputElement | null;
    expect(importButton).not.toBeNull();
    expect(importInput).not.toBeNull();

    await act(async () => {
      importButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const importFile = new File(['name: mysql-production'], 'monitors-prod.yml', { type: 'application/x-yaml' });
    Object.defineProperty(importInput, 'files', { value: [importFile], configurable: true });
    await act(async () => {
      importInput?.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(controller.buildImportMonitorsUrl).toHaveBeenCalled();
    expect(apiMessagePost).toHaveBeenCalledWith('/monitors/import', expect.any(FormData));
    expect(importButton?.getAttribute('aria-busy')).toBe('true');
    expect(interactionContainer.querySelector('[data-monitor-action-feedback="info"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Import [monitors-prod.yml] submitted');

    await act(async () => {
      resolveImport(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-monitor-action-feedback="success"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Import [monitors-prod.yml] Success!');
    expect(interactionContainer.textContent).toContain('0 Selected / 1');
  }, 15000);

  it('keeps the current selection and page when Angular-style monitor import returns a non-zero code', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };
    let rejectImport: (error: Error) => void = () => {};
    apiMessagePost.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectImport = reject;
        })
    );
    const controller = await import('@/lib/monitor-manage/controller');
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(interactionContainer.textContent).toContain('1 Selected / 1');

    const importInput = interactionContainer.querySelector(
      'input[data-monitors-import-file-input="true"]'
    ) as HTMLInputElement | null;
    expect(importInput).not.toBeNull();

    const importFile = new File(['invalid: true'], 'bad-monitors.yml', { type: 'application/x-yaml' });
    Object.defineProperty(importInput, 'files', { value: [importFile], configurable: true });
    await act(async () => {
      importInput?.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(controller.buildImportMonitorsUrl).toHaveBeenCalled();
    expect(apiMessagePost).toHaveBeenCalledWith('/monitors/import', expect.any(FormData));
    expect(interactionContainer.textContent).toContain('Import [bad-monitors.yml] submitted');

    await act(async () => {
      rejectImport(new Error('invalid yaml'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-monitor-action-feedback="critical"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('Import [bad-monitors.yml] Failed: Import failed');
    expect(interactionContainer.textContent).toContain('invalid yaml');
    expect(interactionContainer.textContent).toContain('1 Selected / 1');
    expect(interactionContainer.querySelector('[data-monitor-manage-auto-refresh-tick="0"]')).not.toBeNull();
    expect(mockState.replace).not.toHaveBeenCalled();
  }, 15000);

  it('applies the Angular status filter immediately when the operator changes the select value', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 2,
        pageSize: 20,
        totalElements: 41
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '2', pageSize: '20' },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '2', pageSize: '20' }} />
      );
      await Promise.resolve();
    });

    const statusSelect = interactionContainer.querySelector(
      '[data-monitors-status-filter="true"]'
    ) as HTMLElement | null;
    expect(statusSelect).not.toBeNull();
    expect(statusSelect?.getAttribute('data-monitors-status-filter-autosubmit')).toBe('true');
    expect(statusSelect?.getAttribute('data-monitor-status-filter-autosubmit-owner')).toBe('hertzbeat-ui-select');
    const statusTrigger = statusSelect?.querySelector('button[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
    expect(statusTrigger).not.toBeNull();

    await act(async () => {
      statusTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const downOption = Array.from(interactionContainer.querySelectorAll('button[role="option"]')).find(button =>
      button.textContent?.includes('Down')
    ) as HTMLButtonElement | undefined;
    expect(downOption).toBeDefined();

    await act(async () => {
      downOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?search=prod&app=mysql&status=2&pageIndex=0&pageSize=20');
  }, 15000);

  it('keeps the old Angular label filter as an operator-visible query field', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 3,
        pageSize: 20,
        totalElements: 61
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' }} />
      );
      await Promise.resolve();
    });

    const labelInput = interactionContainer.querySelector(
      'input[data-monitors-label-filter-input="true"]'
    ) as HTMLInputElement | null;
    const applyButton = interactionContainer.querySelector(
      'button[data-monitor-manage-filter-action="apply"]'
    ) as HTMLButtonElement | null;
    expect(labelInput).not.toBeNull();
    expect(labelInput?.getAttribute('data-monitor-manage-label-filter-input-owner')).toBe('hertzbeat-ui-input');
    expect(labelInput?.getAttribute('data-hz-monitor-filter-field')).toBe('labels');
    expect(applyButton).not.toBeNull();

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(labelInput, 'team=platform');
      labelInput?.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?search=prod&app=mysql&labels=team%3Dplatform&pageIndex=0&pageSize=20');
  }, 15000);

  it('submits search and label filters with the old Angular Enter-key workflow', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 3,
        pageSize: 20,
        totalElements: 61
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, search: 'prod', app: 'mysql', pageIndex: '3', pageSize: '20' }} />
      );
      await Promise.resolve();
    });

    const searchInput = interactionContainer.querySelector(
      'input[data-monitors-search-input="true"]'
    ) as HTMLInputElement | null;
    const labelInput = interactionContainer.querySelector(
      'input[data-monitors-label-filter-input="true"]'
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();
    expect(labelInput).not.toBeNull();
    expect(searchInput?.getAttribute('data-hz-monitor-filter-enter-submit')).toBe('search');
    expect(labelInput?.getAttribute('data-hz-monitor-filter-enter-submit')).toBe('labels');
    expect(searchInput?.getAttribute('data-monitors-filter-enter-submit')).toBe('search');
    expect(labelInput?.getAttribute('data-monitors-filter-enter-submit')).toBe('labels');

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(searchInput, 'checkout');
      searchInput?.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
      searchInput?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?search=checkout&app=mysql&pageIndex=0&pageSize=20');
    mockState.replace.mockClear();

    await act(async () => {
      valueSetter?.call(labelInput, 'team=platform');
      labelInput?.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
      labelInput?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith(
      '/monitors?search=checkout&app=mysql&labels=team%3Dplatform&pageIndex=0&pageSize=20'
    );
  }, 15000);

  it('submits search and label filters when the operator uses the old Angular clear trigger', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: { team: 'platform' },
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 3,
        pageSize: 20,
        totalElements: 61
      },
      query: {
        ...EMPTY_MONITOR_TEST_QUERY,
        search: 'prod',
        app: 'mysql',
        labels: 'team=platform',
        pageIndex: '3',
        pageSize: '20'
      },
      entityWorkbenchFallback: false
    };
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <MonitorsPage
          initialQuery={{
            ...EMPTY_MONITOR_TEST_QUERY,
            search: 'prod',
            app: 'mysql',
            labels: 'team=platform',
            pageIndex: '3',
            pageSize: '20'
          }}
        />
      );
      await Promise.resolve();
    });

    const searchClearButton = interactionContainer.querySelector(
      'button[data-monitors-filter-clear-action="search"]'
    ) as HTMLButtonElement | null;
    const labelClearButton = interactionContainer.querySelector(
      'button[data-monitors-filter-clear-action="labels"]'
    ) as HTMLButtonElement | null;
    expect(searchClearButton).not.toBeNull();
    expect(labelClearButton).not.toBeNull();
    expect(searchClearButton?.getAttribute('data-hz-monitor-filter-clear-action')).toBe('search');
    expect(labelClearButton?.getAttribute('data-hz-monitor-filter-clear-action')).toBe('labels');
    expect(searchClearButton?.getAttribute('data-monitor-filter-clear-action-owner')).toBe('hertzbeat-ui-icon-button');
    expect(labelClearButton?.getAttribute('data-monitor-label-filter-clear-action-owner')).toBe('hertzbeat-ui-icon-button');

    await act(async () => {
      searchClearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?app=mysql&labels=team%3Dplatform&pageIndex=0&pageSize=20');
    mockState.replace.mockClear();

    const refreshedLabelClearButton = interactionContainer.querySelector(
      'button[data-monitors-filter-clear-action="labels"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      refreshedLabelClearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith('/monitors?app=mysql&pageIndex=0&pageSize=20');
  }, 15000);

  it('selects all monitor results across pages before running batch actions', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 1,
        totalElements: 2
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY, pageSize: '1' },
      entityWorkbenchFallback: false
    };
    apiMessageGet.mockResolvedValueOnce({
      content: [
        {
          id: 501,
          name: 'mysql-production',
          app: 'mysql',
          instance: 'db.internal:3306',
          status: 1,
          scrape: 'static',
          labels: {},
          gmtUpdate: 1713200000000
        },
        {
          id: 502,
          name: 'redis-production',
          app: 'redis',
          instance: 'redis.internal:6379',
          status: 1,
          scrape: 'static',
          labels: {},
          gmtUpdate: 1713200000000
        }
      ],
      pageIndex: 0,
      pageSize: 2,
      totalElements: 2
    });
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = await import('@/lib/monitor-manage/controller');
    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY, pageSize: '1' }} />);
      await Promise.resolve();
    });

    const selectAllButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-all-results"]'
    ) as HTMLButtonElement | null;
    expect(selectAllButton).not.toBeNull();
    expect(selectAllButton?.textContent).toContain('Select all');

    await act(async () => {
      selectAllButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageGet).toHaveBeenCalledWith('/monitors?pageIndex=0&pageSize=2');
    expect(interactionContainer.textContent).toContain('2 Selected / 2');

    const exportTypeButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-trigger="selected"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      exportTypeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const exportButton = interactionContainer.querySelector(
      'button[data-monitors-export-type-option="json"]'
    ) as HTMLButtonElement | null;
    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(controller.buildExportMonitorsUrl).toHaveBeenCalledWith([501, 502], 'JSON');
  }, 15000);

  it('defaults entity workbench routes to down monitors and swaps create/import for a return action', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        content: [],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 0
      })
      .mockResolvedValueOnce({
        content: [],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 0
      });

    const html = await renderMonitorsPage({
      app: 'website',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '/entities/42'
    });
    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/monitors?pageIndex=0&pageSize=8&app=website&status=2&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(html).toContain('Checkout Service');
    expect(html).not.toContain('Return to entity');
    expect(html).toContain('href="/entities/42"');
    expect(html).not.toContain('New monitor');
    expect(html).not.toContain('Import');
  }, 15000);

  it('keeps the entity return action on an internal entity route when returnTo is unsafe', async () => {
    apiMessageGet.mockResolvedValueOnce({
      content: [],
      pageIndex: 0,
      pageSize: 8,
      totalElements: 0
    });

    const html = await renderMonitorsPage({
      app: 'website',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '//evil.example/steal-session'
    });

    expect(html).toContain('Checkout Service');
    expect(html).not.toContain('Return to entity');
    expect(html).toContain('href="/entities/42"');
    expect(html).not.toContain('href="//evil.example/steal-session"');
  }, 15000);

  it('falls back entity workbench routes from down-only mode to all monitors when the abnormal pass is empty', async () => {
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

    await renderMonitorsPage({
      app: 'website',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '/entities/42'
    });
    const loaded = await mockState.lastLoad?.();
    mockState.renderData = loaded;
    const html = await renderMonitorsPage({
      app: 'website',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '/entities/42'
    });

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
  }, 15000);

  it('renders stable list/detail selectors for monitor release-path browser smoke', async () => {
    const html = await renderMonitorsPage(
      { search: 'checkout-http', app: 'website', status: '2', pageIndex: '0', pageSize: '8' },
      '2'
    );

    expect(html).toContain('data-loading-copy="Loading monitor center"');
    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"');
    expect(html).toContain('data-monitor-manage-auto-refresh-owner="react-interval"');
    expect(html).toContain('data-monitor-manage-auto-refresh-interval-ms="120000"');
    expect(html).toContain('data-monitor-manage-auto-refresh-tick="0"');
    expect(html).toContain('data-monitor-manage-manual-refresh-owner="hertzbeat-ui-icon-button"');
    expect(html).toContain('data-monitor-manage-manual-refresh-action="sync"');
    expect(html).toContain('data-monitor-manage-manual-refresh-tick="0"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).toContain('data-monitors-search-input="true"');
    expect(html).toContain('data-monitor-manage-filter-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-monitor-filter-enter-submit="search"');
    expect(html).toContain('data-monitors-filter-enter-submit="search"');
    expect(html).toContain('data-monitor-filter-enter-submit-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-monitor-filter-clearable-field="search"');
    expect(html).toContain('data-monitors-label-filter-input="true"');
    expect(html).toContain('data-monitor-manage-label-filter-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-monitor-filter-enter-submit="labels"');
    expect(html).toContain('data-monitors-filter-enter-submit="labels"');
    expect(html).toContain('data-monitors-export-type-trigger="selected"');
    expect(html).toContain('data-monitors-export-type-trigger="all"');
    expect(html).toContain('data-monitor-export-type-trigger-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-monitor-label-filter-enter-submit-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-monitor-filter-clearable-field="labels"');
    expect(html).not.toContain('data-monitors-app-input="true"');
    expect(html).toContain('data-monitor-type-filter="true"');
    expect(html).toContain('data-monitor-manage-filter-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-monitor-manage-filter-select="type"');
    expect(html).toContain('data-monitors-app-filter-autosubmit="true"');
    expect(html).toContain('data-monitor-app-filter-autosubmit-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-monitor-filter-field="type-picker"');
    expect(html).toContain('data-monitors-filter-app-picker-trigger="true"');
    expect(html).toContain('data-monitor-manage-filter-action="app-picker"');
    expect(html).toContain('data-monitors-status-filter="true"');
    expect(html).toContain('data-monitor-manage-filter-select="status"');
    expect(html).toContain('data-monitors-status-filter-autosubmit="true"');
    expect(html).toContain('data-monitor-status-filter-autosubmit-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-monitor-manage-filter-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-manage-filter-action="apply"');
    expect(html).toContain('data-monitor-manage-filter-action="clear"');
    expect(html).toContain('data-monitors-open-detail-action="true"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-monitor-manage-list-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-monitor-manage-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-monitor-manage-pagination-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-hz-pagination-action="page-jump"');
    expect(html).toContain('data-monitor-manage-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-monitor-manage-pagination-action="page-jump"');
    expect(html).toContain('data-monitor-manage-pagination-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-manage-pagination-action="previous"');
    expect(html).toContain('data-monitor-manage-pagination-action="next"');
    expect(html).toContain('Previous page');
    expect(html).toContain('Next page');
    expect(html).not.toContain('Previous</button>');
    expect(html).not.toContain('Next</button>');
    expect(html).toContain('data-hz-row-clickable="true"');
    expect(html).toContain('href="/monitors/42/edit"');
    expect(html).toContain('data-monitors-copy-action="true"');
    expect(html).toContain('data-monitors-pause-selected-action="true"');
    expect(html).toContain('data-monitors-row-select="42"');
    expect(html).toContain('data-monitor-row-type="http"');
    expect(html).toContain('data-monitor-row-name-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-monitor-row-copy-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-monitor-row-type-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-monitor-row-updated-owner="hertzbeat-ui-data-cell-text"');
    expect(html).not.toContain('Collection mode static');
    expect(html).not.toContain('scrape static');
    expect(html).toContain('data-hz-batch-action="select-all-results"');
    expect(html).toContain('data-monitor-batch-more-menu-contract="angular-toolbar-ellipsis-menu"');
    expect(html).toContain('data-monitor-batch-more-menu-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-hz-batch-overflow-mode="angular-ellipsis-menu"');
    expect(html).toContain('data-hz-batch-overflow-trigger="angular-ellipsis-menu"');
    expect(html).toContain('data-monitor-batch-more-menu-trigger="angular-ellipsis-menu"');
    expect(html).toContain('data-hz-batch-overflow-panel="angular-nz-dropdown-menu"');
    expect(html).toContain('data-monitor-batch-more-menu-panel="angular-nz-dropdown-menu"');
    expect(html).toContain('data-monitor-batch-more-menu-clearance="floating-overlay-no-table-crop"');
    expect(html).toContain('data-hz-batch-action-presentation="inline"');
    expect(html).toContain('data-hz-batch-action-presentation="menu"');
    expect(html).toContain('data-monitor-batch-more-menu-action="enable"');
    expect(html).toContain('data-monitor-batch-more-menu-action="pause"');
    expect(html).toContain('data-monitor-batch-more-menu-action="delete"');
    expect(html).toContain('Select all');
    expect(html).toContain('Select page');
    expect(html).toContain('data-monitor-manage-selection-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).not.toContain('data-hz-checkbox-owner');
  }, 15000);

  it('keeps monitor row updated cells as timestamp-only table values', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-monitor-row-meta={updatedTime}');
    expect(source).not.toContain("t('monitors.updated-at'");

    const html = await renderMonitorsPage();

    expect(html).toContain('data-monitor-row-meta="2026-04-19 09:00:00"');
    expect(html).not.toContain('Updated 2026-04-19 09:00:00');
    expect(html).not.toContain(`${expectedT('common.edit-time')} 2026-04-19 09:00:00`);
  });

  it('keeps monitor row status badges on the shared badge density without page-local sizing overrides', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzStatusBadge');
    expect(source).toContain('data-monitor-manage-status-tone={statusBadgeVariant(item.status)}');
    expect(source).not.toContain('className="min-h-5 px-1.5 leading-4"');

    const html = await renderMonitorsPage();

    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('data-monitor-manage-status-tone="danger"');
    expect(html).toContain('min-h-6');
    expect(html).not.toContain('min-h-5');
  });

  it('renders Angular entity workbench triage reasons on monitor rows', async () => {
    const entityQuery = buildMonitorTestQuery({
      entityId: '42',
      entityName: 'checkout-api',
      returnTo: '/entities/42?tab=monitors'
    });
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'checkout-http',
            app: 'website',
            instance: '127.0.0.1:80',
            status: 2,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: entityQuery,
      entityWorkbenchFallback: false
    };

    const html = await renderMonitorsPage({
      entityId: '42',
      entityName: 'checkout-api',
      returnTo: '/entities/42?tab=monitors'
    });

    expect(html).toContain('data-monitor-row-entity-triage="angular-entity-reason"');
    expect(html).toContain('data-monitor-row-entity-triage-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-monitor-row-entity-triage-status="down"');
    expect(html).toContain('data-monitor-row-entity-response-action="angular-inline-host-action"');
    expect(html).toContain('data-monitor-row-entity-response-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-row-response-action="pause"');
    expect(html).toContain('data-monitor-row-entity-support-actions="angular-platform-support-action-bar"');
    expect(html).toContain('data-monitor-row-entity-support-actions-owner="hertzbeat-ui-button-link"');
    expect(html).toContain('data-monitor-row-entity-support-action="related-logs"');
    expect(html).toContain('data-monitor-row-entity-support-action="related-traces"');
    expect(html).toContain('data-monitor-row-entity-support-action="code"');
    expect(html).toContain('data-monitor-row-entity-support-disabled="missing-code-navigation"');
    expect(html).toContain('Open related logs');
    expect(html).toContain('Open related traces');
    expect(html).toContain('data-monitor-row-actions-entity-context="detail-edit-copy-only"');
    expect(html).toContain('This monitor is unhealthy. Check it first.');
    expect(html).not.toContain('data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).not.toContain('data-monitor-row-delete-action="single"');
  });

  it('renders missing monitor row identity with the localized empty fallback', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 77,
            name: 'unassigned-monitor',
            app: '',
            instance: '',
            status: 0,
            scrape: '',
            labels: {},
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 1
      },
      query: {
        search: '',
        app: '',
        labels: '',
        status: '',
        pageIndex: '',
        pageSize: '',
        entityId: '',
        entityName: '',
        returnTo: ''
      },
      entityWorkbenchFallback: false
    };

    const html = await renderMonitorsPage();

    expect(html).toContain('data-monitor-row-copy="None"');
    expect(html).toContain('data-monitor-row-type="None"');
    expect(html).toContain('data-monitors-row-select="77"');
    expect(html).not.toContain('data-monitor-row-instance-copy="angular-host-copy"');
    expect(html).not.toContain('unassigned-monitor</div><div data-monitor-row-copy="-');
  });

  it('renders empty monitor results through the shared HzEmptyState', async () => {
    mockState.renderData = {
      list: {
        content: [],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 0
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };

    const html = await renderMonitorsPage();

    expect(html).toContain('data-hz-ui="empty-state"');
    expect(html).toContain('data-monitor-manage-empty-owner="hertzbeat-ui-empty-state"');
    expect(html).toContain('No Matching Monitors');
    expect(html).not.toContain('data-observability-status-state="true"');
  }, 15000);

  it('keeps labels as row evidence instead of a right-side detail rail on the monitor list', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('labelEntries');
    expect(source).toContain('Object.entries(item.labels || {})');
    expect(source).toContain('HzLabelTag');
    expect(source).toContain('renderAngularLabelColor(key)');
    expect(source).toContain('data-monitor-row-label-color="angular-render-label-color"');
    expect(source).toContain('data-monitor-row-labels-owner="hertzbeat-ui-label-tag"');
    expect(source).not.toContain('data-monitor-manage-detail-rail');
    expect(source).not.toContain("t('monitors.rail.labels')");
    expect(source).not.toContain('RowList');
  });

  it('loads monitor list pages through the monitor domain facade instead of raw getters', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain("import { api } from '@/lib/monitor-api-facade';");
    expect(source).toContain('queryClient.fetchQuery');
    expect(source).toContain('queryKeys.monitors.list');
    expect(source).toContain('queryFn: () => loadMonitorListFromFacade(api.monitors.page, nextQuery)');
    expect(source).toContain('readMonitorListWithQuery(query)');
    expect(source).toContain('readMonitorListWithQuery(fallbackQuery)');
    expect(source).toContain('readMonitorListWithQuery(selectAllQuery)');
    expect(source).not.toContain('apiMessageGet<PageResult<Monitor>>(monitorListUrl)');
    expect(source).not.toContain('apiMessageGet<PageResult<Monitor>>(buildMonitorUrl(fallbackQuery))');
    expect(source).not.toContain('apiMessageGet<PageResult<Monitor>>(buildMonitorUrl(selectAllQuery))');
  });

  it('invalidates monitor React Query data after monitor mutations', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('useQueryClient');
    expect(source).toContain('queryClient.invalidateQueries({ queryKey: queryKeys.monitors.all })');
    expect(source).toContain('refreshMonitorWorkbench');
    expect(source).toContain('api.monitors.copy(item.id)');
    expect(source).toContain('api.monitors.delete(targetIds)');
    expect(source).toContain('api.monitors.enable(selectedIds)');
    expect(source).toContain('api.monitors.pause(selectedIds)');
    expect(source).toContain('api.monitors.enable([item.id])');
    expect(source).toContain('api.monitors.pause([item.id])');
    expect(source).not.toContain('copyMonitor(apiMessagePost as any');
    expect(source).not.toContain('deleteMonitors(apiMessageDelete as any');
    expect(source).not.toContain('enableMonitors(apiMessageGet as any');
    expect(source).not.toContain('pauseMonitors(apiMessageDelete as any');
  });

  it('prewarms monitor editor drafts through the monitor domain facade instead of a raw getter', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('loadMonitorEditorDraftFromFacade(');
    expect(source).toContain('readMonitorDetail: api.monitors.editorDetail');
    expect(source).toContain('readCollectors: api.monitors.editorCollectors');
    expect(source).toContain('readParamDefines: api.monitors.editorParamDefines');
    expect(source).not.toContain('loadMonitorEditorDraft(apiMessageGet');
  });

  it('routes the monitor workbench through the shared HertzBeat UI shell owners', () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzExplorerFrame');
    expect(source).toContain('HzMonitorFilterBar');
    expect(source).toContain('HzBatchToolbar');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"');
    expect(source).toContain('data-monitor-manage-filter-owner="hertzbeat-ui-monitor-filter-bar"');
    expect(source).toContain('data-monitor-manage-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('handlePageJumpChange');
    expect(source).toContain('pageJumpLabel={t(\'common.page\')}');
    expect(source).toContain('data-monitor-manage-pagination-page-jump-owner');
    expect(source).toContain("'data-monitor-manage-pagination-action': 'page-jump'");
    expect(source).toContain('MONITOR_MANAGE_AUTO_REFRESH_MS = 120_000');
    expect(source).toContain('window.setInterval');
    expect(source).toContain('setReloadKey(prev => prev + 1)');
    expect(source).toContain('data-monitor-manage-auto-refresh-owner="react-interval"');
    expect(source).toContain('data-monitor-manage-auto-refresh-interval-ms');
    expect(source).toContain('data-monitor-manage-auto-refresh-tick');
    expect(source).toContain('handleManualRefresh');
    expect(source).toContain('data-monitor-manage-manual-refresh-owner="hertzbeat-ui-icon-button"');
    expect(source).toContain('data-monitor-manage-manual-refresh-action="sync"');
    expect(source).toContain('data-monitor-manage-manual-refresh-tick');
    expect(source).toContain('<HzMonitorFilterBar');
    expect(source).not.toContain('data-monitor-manage-filter-owner="hertzbeat-ui-light-toolbar"');
    expect(source).not.toContain('<HzToolbar');
    expect(source).toContain('<HzBatchToolbar');
    expect(source).toContain('<HzPaginationBar');
    expect(source).toContain("previousLabel={t('common.previous-page')}");
    expect(source).toContain("nextLabel={t('common.next-page')}");
    expect(source).not.toContain("previousLabel={t('common.previous')}");
    expect(source).not.toContain("nextLabel={t('common.next')}");
    expect(source).not.toContain('flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hz-ui-line-soft)] px-3 py-2.5');
    expect(source).toContain('data-monitor-manage-primary-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-monitor-manage-primary-action="new-monitor-link"');
    expect(source).toContain('data-monitor-manage-primary-action="new-monitor-picker"');
    expect(source).toContain('data-monitor-manage-primary-action="entity-return"');
    expect(source).not.toContain('HzField');
    expect(source).not.toContain('data-monitors-app-input');
    expect(source).toContain("'data-monitor-type-filter': 'true'");
    expect(source).toContain('handleTypeFilterChange');
    expect(source).toContain("'data-monitors-app-filter-autosubmit': 'true'");
    expect(source).toContain("'data-monitor-app-filter-autosubmit-owner': 'hertzbeat-ui-select'");
    expect(source).toContain("'data-monitors-filter-app-picker-trigger': 'true'");
    expect(source).toContain("openAppPicker('filter')");
    expect(source).toContain('searchInputProps');
    expect(source).toContain("'data-monitor-app-picker-search-owner': 'hertzbeat-ui-input'");
    expect(source).toContain("'data-monitor-app-picker-search-action': 'filter'");
    expect(source).toContain("'data-monitors-app-picker-search-input': 'true'");
    expect(source).toContain('handleStatusFilterChange');
    expect(source).toContain("'data-monitors-status-filter-autosubmit': 'true'");
    expect(source).toContain("appPickerMode === 'filter'");
    expect(source).toContain("key: 'type'");
    expect(source).toContain('data-monitor-row-type');
    expect(source).toContain('HzDataCellText');
    expect(source).toContain('data-monitor-row-name-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-monitor-row-copy-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-monitor-row-instance-copy="angular-host-copy"');
    expect(source).toContain('data-monitor-row-instance-copy-owner="hertzbeat-ui-icon-button"');
    expect(source).toContain('data-monitor-row-instance-copy-target={item.instance}');
    expect(source).toContain('data-monitor-copy-lifecycle-contract="angular-copy-success-refresh-unavailable-refresh"');
    expect(source).toContain('data-monitor-copy-lifecycle-owner="route-copy-contract"');
    expect(source).toContain('data-monitor-row-copy-lifecycle="angular-copy-success-refresh-unavailable-refresh"');
    expect(source).toContain('data-monitor-row-copy-lifecycle-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain("navigator.clipboard?.writeText(copyValue)");
    expect(source).toContain("setActionFeedback({ tone: 'success', title: t('common.notify.copy-success') })");
    expect(source).toContain("t(`monitor.scrape.type.${item.scrape}`)");
    expect(source).toContain("data-monitor-row-scrape-display={isDynamicScrape ? 'angular-service-discovery' : undefined}");
    expect(source).toContain("data-monitor-row-scrape-display-owner={isDynamicScrape ? 'hertzbeat-ui-data-cell-text' : undefined}");
    expect(source).toContain('data-monitor-row-scrape-value={isDynamicScrape ? item.scrape : undefined}');
    expect(source).toContain('data-monitor-row-scrape-icon="partition"');
    expect(source).toContain('entityTriageReason');
    expect(source).toContain("t('entity.monitor.workbench.reason.down')");
    expect(source).toContain("t('entity.monitor.workbench.reason.fallback')");
    expect(source).toContain("t('entity.monitor.workbench.reason.paused')");
    expect(source).toContain("t('entity.monitor.workbench.reason.default')");
    expect(source).toContain('data-monitor-row-entity-triage="angular-entity-reason"');
    expect(source).toContain('data-monitor-row-entity-triage-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-monitor-row-entity-response-action="angular-inline-host-action"');
    expect(source).toContain('data-monitor-row-entity-response-owner="hertzbeat-ui-button"');
    expect(source).toContain('buildMonitorRowSignalHref');
    expect(source).toContain("buildMonitorRowSignalHref('logs', item, data.query)");
    expect(source).toContain("buildMonitorRowSignalHref('traces', item, data.query)");
    expect(source).toContain('buildMonitorRowCodeHref(item)');
    expect(source).toContain('data-monitor-row-entity-support-actions="angular-platform-support-action-bar"');
    expect(source).toContain('data-monitor-row-entity-support-actions-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-monitor-row-entity-support-action="related-logs"');
    expect(source).toContain('data-monitor-row-entity-support-action="related-traces"');
    expect(source).toContain('data-monitor-row-entity-support-disabled="missing-code-navigation"');
    expect(source).toContain("data-monitor-row-actions-entity-context={entityContextActive ? 'detail-edit-copy-only' : undefined}");
    expect(source).toContain('!entityContextActive && item.status === 0');
    expect(source).toContain('data-monitor-row-labels-owner="hertzbeat-ui-label-tag"');
    expect(source).toContain("labelFilterLabel={t('monitor.search.label')}");
    expect(source).toContain('labelFilterValue={draft.labels}');
    expect(source).toContain('data-monitors-label-filter-input');
    expect(source).toContain("'data-monitors-filter-enter-submit': 'search'");
    expect(source).toContain("'data-monitors-filter-enter-submit': 'labels'");
    expect(source).toContain("'data-monitor-filter-enter-submit-owner': 'hertzbeat-ui-input'");
    expect(source).toContain("'data-monitor-label-filter-enter-submit-owner': 'hertzbeat-ui-input'");
    expect(source).toContain('clearSearchFilter');
    expect(source).toContain('clearLabelFilter');
    expect(source).toContain("'data-monitors-filter-clear-action': 'search'");
    expect(source).toContain("'data-monitors-filter-clear-action': 'labels'");
    expect(source).toContain("'data-monitor-filter-clear-action-owner': 'hertzbeat-ui-icon-button'");
    expect(source).toContain("'data-monitor-label-filter-clear-action-owner': 'hertzbeat-ui-icon-button'");
    expect(source).toContain('data-monitor-row-type-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('data-monitor-row-updated-owner="hertzbeat-ui-data-cell-text"');
    expect(source).toContain('display="block"');
    expect(source).toContain('spacing="stack-tight"');
    expect(source).toContain('HzLabelTag');
    expect(source).toContain('renderAngularLabelColor(key)');
    expect(source).not.toContain('className="block"');
    expect(source).not.toContain('className="mt-0.5 block"');
    expect(source).not.toContain('className="mt-1 block"');
    expect(source).not.toContain('truncate text-[13px] font-semibold text-[#f3f6fb]');
    expect(source).not.toContain('mt-0.5 truncate font-mono text-[11px] text-[#8f99ab]');
    expect(source).not.toContain('mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[#727b8c]');
    expect(source).not.toContain('font-mono text-[11px] uppercase tracking-[0.14em] text-[#8f99ab]');
    expect(source).not.toContain('text-[11px] text-[#8f99ab]');
    expect(source).not.toContain('scrapeLabel');
    expect(source).not.toContain(expectedT('monitor.scrape'));
    expect(source).toContain("id: 'import'");
    expect(source).toContain('onSelect: handleImportClick');
    expect(source).toContain('importMonitorsFromFacade(api.monitors.import, file)');
    expect(source).toContain("t('common.notify.import-submitted', { taskName: file.name })");
    expect(source).toContain("t('common.notify.import-success-detail', { taskName: file.name })");
    expect(source).toContain("t('common.notify.import-fail-detail'");
    expect(source).not.toContain('fetch(`/api${buildImportMonitorsUrl()}`');
    expect(source).toContain('HzExportTypeDialog');
    expect(source).toContain('openExportDialog');
    expect(source).toContain('handleExportDialogSelect');
    expect(source).toContain("id: 'export-selected'");
    expect(source).toContain("id: 'export-all'");
    expect(source).toContain("'data-monitors-export-type-trigger': 'selected'");
    expect(source).toContain("'data-monitors-export-type-trigger': 'all'");
    expect(source).toContain("'data-monitor-export-type-trigger-owner': 'hertzbeat-ui-batch-toolbar'");
    expect(source).toContain('data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"');
    expect(source).toContain('data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"');
    expect(source).toContain('data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"');
    expect(source).toContain('data-monitors-export-type-dialog={exportDialogScope ?? \'closed\'}');
    expect(source).toContain("'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog'");
    expect(source).toContain("'data-monitors-export-type-option': 'json'");
    expect(source).toContain("'data-monitors-export-type-option': 'excel'");
    expect(source).toContain('api.monitors.exportResponse(selectedIds, type)');
    expect(source).toContain('api.monitors.exportAllResponse(type)');
    expect(source).not.toContain('const response = await fetch');
    expect(source).not.toContain("id: 'export-all-json'");
    expect(source).not.toContain("id: 'export-all-excel'");
    expect(source).not.toContain("id: 'export-json'");
    expect(source).not.toContain("id: 'export-excel'");
    expect(source).not.toContain("'data-monitors-export-all-action': 'json'");
    expect(source).not.toContain("'data-monitors-export-all-action': 'excel'");
    expect(source).not.toContain('<HzButton size="sm" onClick={handleImportClick}>');
    expect(source).toContain("id: 'enable'");
    expect(source).toContain('data-monitor-batch-more-menu-contract="angular-toolbar-ellipsis-menu"');
    expect(source).toContain('data-monitor-batch-more-menu-owner="hertzbeat-ui-batch-toolbar"');
    expect(source).toContain("overflowLabel={t('monitors.controls.more-actions')}");
    expect(source).toContain("'data-monitor-batch-more-menu-trigger': 'angular-ellipsis-menu'");
    expect(source).toContain("'data-monitor-batch-more-menu-panel': 'angular-nz-dropdown-menu'");
    expect(source).toContain("'data-monitor-batch-more-menu-clearance': 'floating-overlay-no-table-crop'");
    expect(source).toContain("presentation: 'menu'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'enable'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'pause'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'import'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'export-selected'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'export-all'");
    expect(source).toContain("'data-monitor-batch-more-menu-action': 'delete'");
    expect(source).not.toContain("id: 'enable',\n                            label: t('monitors.controls.enable-selected'),\n                            busy: pendingActionId === 'enable',\n                            busyLabel: t('common.notify.enable-pending'),\n                            tone: 'info'");
    expect(source).toContain("key: 'actions'");
    expect(source).toContain('data-monitor-row-actions="angular-ellipsis-dropdown"');
    expect(source).toContain('data-monitor-row-actions-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-monitor-row-action-menu="angular-ellipsis-dropdown"');
    expect(source).toContain('data-monitor-row-action-menu-layer="overlay-visible-above-table"');
    expect(source).toContain('data-monitor-row-action-menu-clearance="floating-overlay-no-table-crop"');
    expect(source).toContain('data-monitor-row-action-menu-trigger="angular-ellipsis-dropdown"');
    expect(source).toContain('data-monitor-row-action-menu-panel="angular-nz-dropdown-menu"');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('component={Link}');
    expect(source).toContain('HzIconButton');
    expect(source).toContain('data-monitor-row-action-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-monitor-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-monitor-row-action="detail"');
    expect(source).toContain('data-monitor-row-action="edit"');
    expect(source).toContain('data-monitor-row-action="copy"');
    expect(source).toContain('data-monitor-row-response-action="pause"');
    expect(source).toContain('data-monitor-row-response-action="enable"');
    expect(source).toContain('data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-monitor-row-delete-action="single"');
    expect(source).toContain('data-monitor-row-delete-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('{!entityContextActive ? (');
    expect(source).toContain("openRowResponseConfirm(item, 'pause')");
    expect(source).toContain("openRowResponseConfirm(item, 'enable')");
    expect(source).toContain('handleConfirmRowResponse');
    expect(source).toContain('openDeleteDialog([item.id])');
    expect(source).toContain('api.monitors.deleteGrafanaDashboard(id)');
    expect(source).toContain('PauseCircle');
    expect(source).toContain('PlayCircle');
    expect(source).toContain('Trash2');
    expect(source).not.toContain('data-monitor-row-actions="compact-icons"');
    expect(source).not.toContain('className="flex flex-nowrap items-center gap-1.5"');
    expect(source).toContain('Pencil');
    expect(source).toContain('BarChart3');
    expect(source).toContain('CopyIcon');
    expect(source).toContain('type MonitorBatchResponseConfirm');
    expect(source).toContain('const [batchResponseConfirm, setBatchResponseConfirm]');
    expect(source).toContain("onSelect: () => openBatchResponseConfirm('enable')");
    expect(source).toContain("onSelect: () => openBatchResponseConfirm('pause')");
    expect(source).toContain('data-monitor-batch-response-confirm="angular-modal-confirm"');
    expect(source).toContain('data-monitor-batch-response-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("title={batchResponseConfirm?.action === 'enable' ? t('common.confirm.enable-batch') : t('common.confirm.cancel-batch')}");
    expect(source).not.toContain('router.push(buildMonitorEditHref');
    expect(source).not.toContain("eyebrow={t('monitors.kicker')}");
    expect(source).toContain('data-monitors-open-detail-action="true"');
    expect(source).not.toContain('HzFilterWorkbench');
    expect(source).not.toContain('HzQueryBar');
    expect(source).not.toContain('HzResultControls');
    expect(source).not.toContain('HzMetricStrip');
    expect(source).not.toContain('HzWorkbenchSurface');
    expect(source).not.toContain('buildSelectedMonitorRows');
    expect(source).not.toContain('buildLabelRows');
    expect(source).not.toContain('metricStrip=');
    expect(source).not.toContain('data-monitor-manage-detail-rail');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_');
    expect(source).not.toContain("t('monitors.rail.");
    expect(source).not.toContain('DrawerCodePreview');
    expect(source).not.toContain('JSON.stringify(selected');
    expect(source).not.toContain('grid gap-3 p-3');
    expect(source).not.toContain('<WorkbenchPage');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).toContain('HzEmptyState');
    expect(source).toContain('data-monitor-manage-empty-owner="hertzbeat-ui-empty-state"');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain("from '@/components/workbench/primitives'");
    expect(source).not.toContain("from '@/components/workbench/toolbar'");
    expect(source).not.toContain("from '@/components/workbench/selectable-evidence-list'");
  });

  it('keeps monitor batch toolbar buttons on the shared flat/solid button baseline', async () => {
    const html = await renderMonitorsPage();
    const batchToolbar = html.match(/<div[^>]*data-hz-ui="batch-toolbar"[\s\S]*?<\/div><\/div>/)?.[0] ?? '';
    const batchButtons = html.match(/<button[^>]*data-hz-batch-action="[^"]+"[^>]*>/g) ?? [];
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"');
    expect(source).toContain('variant="embedded"');
    expect(source).not.toContain('className="border-x-0 border-t-0"');
    expect(html).toContain('data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-hz-batch-toolbar-surface="transparent-lined"');
    expect(html).toContain('data-hz-batch-toolbar-variant="embedded"');
    expect(source).not.toContain('flex items-center justify-between border-b border-[var(--hz-ui-line-soft)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#727b8c]');
    expect(source).not.toContain("t('monitors.section.list.head')");
    expect(html).not.toContain('Current results');
    expect(batchToolbar).not.toContain('bg-[var(--hz-ui-active-soft)]');
    expect(batchButtons.length).toBeGreaterThan(0);
    for (const button of batchButtons) {
      expect(button).toContain('data-hz-ui="button"');
      expect(button).toContain('data-hz-control-height="28"');
      expect(button).toMatch(/data-hz-control-edge="(?:flat|solid)"/);
      expect(button).toMatch(/data-hz-button-tier="(?:flat-neutral|solid-danger)"/);
      expect(button).toContain('data-hz-batch-action-owner="hertzbeat-ui-button"');
      expect(button).toContain('data-monitor-manage-batch-action-owner="hertzbeat-ui-button"');
      expect(button).toContain('data-monitor-manage-batch-action=');
    }
    expect(html).toContain('data-monitor-manage-batch-action="select-all-results"');
    expect(html).toContain('data-monitor-manage-batch-action="select-page"');
    expect(html).toContain('data-monitor-manage-batch-action="export-selected"');
    expect(html).toContain('data-monitor-manage-batch-action="export-all"');
    expect(html).toContain('data-monitor-manage-batch-action="delete"');
  });

  it('routes the main monitor results through the shared HzDataTable instead of an evidence-list card surrogate', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzDataTable,');
    expect(source).toContain('data-monitor-manage-list-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('data-monitor-manage-list-variant="embedded"');
    expect(source).toContain('<HzDataTable');
    expect(source).toContain('variant="embedded"');
    expect(source).not.toContain('className="border-t-0"');
    expect(source).not.toContain('<SelectableEvidenceList');
  });

  it('uses the shared HertzBeat UI checkbox for monitor row selection instead of page-local checkbox chrome', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzCheckbox');
    expect(source).toContain('<HzCheckbox');
    expect(source).toContain('data-monitor-manage-selection-owner="hertzbeat-ui-checkbox"');
    expect(source).toContain('data-monitors-row-select={String(item.id)}');
    expect(source).toContain('data-monitor-manage-selection-disabled={isMonitorDisabled(item) ? \'disappeared\' : undefined}');
    expect(source).toContain("aria-label={t('common.select')}");
    expect(source).toContain('disabled={isMonitorDisabled(item)}');
    expect(source).not.toContain('containerClassName="text-[11px] text-[var(--ops-text-secondary)]"');
    expect(source).not.toMatch(/\slabel=\{t\('common\.select'\)\}/);
    expect(source).not.toContain("from '@/components/ui/checkbox'");
    expect(source).not.toContain('<Checkbox');
    expect(source).not.toContain('type="checkbox"');

    const html = await renderMonitorsPage();
    expect(html).toContain('data-monitor-manage-selection-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('data-hz-control-edge="lined"');
    expect(html).toContain('aria-label="Select"');
    expect(html).not.toContain('data-hz-checkbox-label="true">Select</span>');
    expect(html).not.toContain('data-hz-checkbox-owner');
  });

  it('excludes disappeared monitors from Angular-style page selection and disables their row actions', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 501,
            name: 'mysql-production',
            app: 'mysql',
            instance: 'db.internal:3306',
            status: 1,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000
          },
          {
            id: 502,
            name: 'redis-disappeared',
            app: 'redis',
            instance: 'cache.internal:6379',
            status: 2,
            scrape: 'static',
            labels: {},
            gmtUpdate: 1713200000000,
            _displayStatus: 'DISAPPEARED'
          }
        ],
        pageIndex: 0,
        pageSize: 8,
        totalElements: 2
      },
      query: { ...EMPTY_MONITOR_TEST_QUERY },
      entityWorkbenchFallback: false
    };

    const { default: MonitorsPage } = await import('./monitor-manage-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<MonitorsPage initialQuery={{ ...EMPTY_MONITOR_TEST_QUERY }} />);
      await Promise.resolve();
    });

    const activeCheckbox = interactionContainer.querySelector(
      'input[data-monitors-row-select="501"]'
    ) as HTMLInputElement | null;
    const disappearedCheckbox = interactionContainer.querySelector(
      'input[data-monitors-row-select="502"]'
    ) as HTMLInputElement | null;
    const selectPageButton = interactionContainer.querySelector(
      'button[data-hz-batch-action="select-page"]'
    ) as HTMLButtonElement | null;

    expect(activeCheckbox?.disabled).toBe(false);
    expect(disappearedCheckbox?.disabled).toBe(true);
    expect(disappearedCheckbox?.getAttribute('data-monitor-manage-selection-disabled')).toBe('disappeared');
    expect(interactionContainer.querySelector('tr[data-monitor-row-disabled="disappeared"]')).not.toBeNull();
    expect(
      interactionContainer.querySelectorAll('button[data-monitor-row-action-disabled="disappeared"]')
        .length
    ).toBeGreaterThanOrEqual(4);

    await act(async () => {
      selectPageButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const batchToolbar = interactionContainer.querySelector('[data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"]');
    expect(batchToolbar?.getAttribute('data-hz-batch-selection-count')).toBe('1');
    expect(activeCheckbox?.checked).toBe(true);
    expect(disappearedCheckbox?.checked).toBe(false);
  }, 15000);

  it('uses the shared HertzBeat UI file input for monitor import instead of page-local file input chrome', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzFileInput');
    expect(source).toContain('<HzFileInput');
    expect(source).toContain('data-monitor-manage-import-input-owner="hertzbeat-ui-file-input"');
    expect(source).toContain('data-monitors-import-file-input="true"');
    expect(source).not.toContain("from '@/components/ui/file-input'");
    expect(source).not.toContain('<FileInput');
    expect(source).not.toContain('data-cold-file-input-owner');

    const html = await renderMonitorsPage();
    expect(html).toContain('data-monitor-manage-import-input-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-hz-ui="file-input"');
    expect(html).toContain('data-hz-file-input-control="native-hidden-file"');
    expect(html).not.toContain('data-cold-file-input-owner');
  });

  it('canonicalizes display-only return labels out of the live monitor URL', () => {
    const routeSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const queryStateSource = readFileSync(resolve(process.cwd(), 'lib/monitor-manage/query-state.ts'), 'utf8');

    expect(routeSource).toContain('redirect(routeState.canonicalRoute)');
    expect(queryStateSource).toContain('shouldRedirect: hasDisplayLabelParam(searchParams)');
    expect(queryStateSource).toContain("firstParam(searchParams.returnTo)?.includes('returnLabel')");
  });

  it('keeps monitor manage remounts on a short settled cache window while monitor mutations invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('MONITOR_MANAGE_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['monitor-manage', monitorListUrl, explicitStatus || 'implicit-status', reloadKey].join('|')");
    expect(source).toContain('[explicitStatus, monitorListUrl, reloadKey]');
    expect(source).toContain('setReloadKey(prev => prev + 1)');
    expect(source).toContain('cacheSettledTtlMs={MONITOR_MANAGE_SETTLED_CACHE_TTL_MS}');
  });

  it('routes selected monitor deletion through a cold modal instead of native confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('OverlayDialog');
    expect(source).not.toContain("from '@/components/workbench/overlay-dialog'");
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('data-monitor-delete-confirm-closable-contract="angular-nz-closable-false"');
    expect(source).toContain('data-monitor-delete-confirm-ok-contract="angular-nz-ok-danger-primary"');
    expect(source).toContain('data-monitor-delete-confirm-modal-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-monitor-delete-confirm-closable="angular-nz-closable-false"');
    expect(source).toContain('data-monitor-delete-confirm-ok="angular-nz-ok-danger-primary"');
    expect(source).toContain('bodyRhythm="stack"');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('data-monitor-delete-confirm-selected-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-monitors-delete-confirm-trigger');
    expect(source).toContain('data-monitors-delete-confirm="hertzbeat-ui-modal"');
    expect(source).toContain("t('monitors.delete.title')");
    expect(source).toContain("t('monitors.delete.copy')");
    expect(source).toContain("t('monitors.delete.confirm')");
    expect(source).toContain("t('monitors.delete.selected', { count: deleteDialogCount })");
    expect(source).toContain("t('common.button.cancel')");
    expect(source).not.toContain('className="space-y-3"');
    expect(source).not.toContain('border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] px-3 py-2 font-semibold text-[#f3f6fb]');
  });

  it('routes single-row enable and pause through the Angular modal confirmation contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');

    expect(source).toContain('type MonitorRowResponseConfirm');
    expect(source).toContain('const [rowResponseConfirm, setRowResponseConfirm]');
    expect(source).toContain('openRowResponseConfirm(item, item.status === 0 ?');
    expect(source).toContain("openRowResponseConfirm(item, 'enable')");
    expect(source).toContain("openRowResponseConfirm(item, 'pause')");
    expect(source).toContain('data-monitor-row-response-confirm="angular-modal-confirm"');
    expect(source).toContain('data-monitor-row-response-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("data-monitor-row-response-confirm-action={rowResponseConfirm?.action ?? 'closed'}");
    expect(source).toContain('data-monitor-response-confirm-closable-contract="angular-nz-closable-false"');
    expect(source).toContain('data-monitor-response-confirm-ok-contract="angular-nz-ok-danger-primary"');
    expect(source).toContain('data-monitor-response-confirm-modal-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-monitor-row-response-confirm-closable="angular-nz-closable-false"');
    expect(source).toContain('data-monitor-row-response-confirm-ok="angular-nz-ok-danger-primary"');
    expect(source).toContain('data-monitor-batch-response-confirm-closable="angular-nz-closable-false"');
    expect(source).toContain('data-monitor-batch-response-confirm-ok="angular-nz-ok-danger-primary"');
    expect(source).toContain("title={rowResponseConfirm?.action === 'enable' ? t('common.confirm.enable') : t('common.confirm.cancel')}");
    expect(source).toContain("confirmLabel={t('common.button.ok')}");
    expect(source).toContain("cancelLabel={t('common.button.cancel')}");
    expect(source).toContain('data-monitor-row-response-confirm-selected-owner="hertzbeat-ui-inline-feedback"');
    expect(source).not.toContain('onClick={() => void handleEnableRow(item)}');
    expect(source).not.toContain('onClick={() => void handlePauseRow(item)}');
  });
});
