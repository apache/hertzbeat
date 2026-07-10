// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EntityListPage from './entity-list-page';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildEntityTableRows } from '@/lib/entity-manage/view-model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let interactionContainer: HTMLDivElement | null = null;
let interactionRoot: Root | null = null;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  replace: vi.fn(),
  renderData: {
    list: {
      content: [],
      totalElements: 0
    }
  }
}));

const loadEntityList = vi.hoisted(() => vi.fn(async () => mockState.renderData.list));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingTitle,
    loadingCopy,
    loadingDelayMs
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingTitle?: string;
    loadingCopy?: string;
    loadingDelayMs?: number;
  }) => {
    mockState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-loading-title={loadingTitle}
        data-loading-copy={loadingCopy}
        data-loading-delay-ms={loadingDelayMs}
      >
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('@/components/observability', () => ({
  DrawerCodePreview: ({ children }: any) => <pre data-drawer-code-preview="true">{children}</pre>,
  DrawerSection: ({ title, children }: any) => (
    <section data-drawer-section={title}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  ObservabilityStatusState: ({ title, copy }: any) => (
    <div>
      {title}
      {copy}
    </div>
  ),
  StageSection: ({ title, children }: any) => (
    <section data-stage-section={title}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SelectableEvidenceList: ({ rows }: any) => <div>{rows.map((row: any) => row.title).join('|')}</div>,
  SummaryMetricGrid: ({ items }: any) => <div data-summary-metric-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  ToolbarField: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  ToolbarRow: ({ children }: any) => <div data-toolbar-row="true">{children}</div>
}));

vi.mock('@/components/workbench/primitives', () => ({
  WorkbenchStack: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div>{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      <div>{main}</div>
      <aside>{side}</aside>
    </main>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/lib/api-client', () => ({
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      list: vi.fn()
    }
  }
}));

vi.mock('@/lib/entity-manage/controller', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/entity-manage/controller')>();
  return {
    ...actual,
    loadEntityListFromFacade: loadEntityList
  };
});

vi.mock('@/lib/entity-manage/display-mapping', () => ({
  entityEnvironmentLabel: (value: string) => value,
  entityStatusLabel: (value: string) => value,
  entityTypeLabel: (value: string) => value
}));

vi.mock('@/lib/entity-manage/query-state', () => ({
  buildEntityListRouteUrl: (query: Record<string, string>) => {
    const queryString = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value)
    ).toString();
    return queryString ? `/entities?${queryString}` : '/entities';
  },
  buildEntityUrl: vi.fn(),
  normalizeEntityListPageIndex: (value?: string | number | null) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return String(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  },
  normalizeEntityListPageSize: (value?: string | number | null) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return ['8', '20', '50'].includes(String(parsed)) ? String(parsed) : '8';
  },
  isSupportedEntityListPageSize: (value?: string | number | null) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return ['8', '20', '50'].includes(String(parsed));
  },
  queryStateToQueryString: (query: Record<string, string>) =>
    new URLSearchParams(
      Object.entries(query).filter(([, value]) => value)
    ).toString()
}));

vi.mock('@/lib/entity-manage/view-model', () => ({
  isEntityHealthyStatus: (status: string | null | undefined) =>
    ['healthy', 'up', 'normal'].includes(String(status || '').toLowerCase().replace(/[\s-]+/g, '_')),
  isEntityPendingEvidenceStatus: (status: string | null | undefined) => {
    const normalized = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
    return !normalized || normalized === 'unknown' || normalized === 'paused';
  },
  isEntityAbnormalStatus: (status: string | null | undefined) =>
    ['abnormal', 'critical', 'degraded', 'down', 'offline', 'unhealthy', 'warning'].includes(String(status || '').toLowerCase().replace(/[\s-]+/g, '_')),
  buildEntityTableRows: vi.fn(() => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    return [
      {
        key: '1',
        name: 'checkout-service',
        type: t('entities.list.type.service'),
        environment: t('entities.list.environment.local'),
        status: 'healthy',
        monitorCount: '1',
        activeAlertCount: '0',
        relationCount: '2',
        updatedAt: 'now',
        href: '/entities/1',
        ownerHref: '/entities/1/edit',
        metricHref: '/ingestion/otlp/metrics?entityId=1',
        logHref: '/log/manage?entityId=1',
        traceHref: '/trace/manage?entityId=1'
      }
    ];
  })
}));

vi.mock('@/lib/format', () => ({
  formatTime: vi.fn(() => 'now')
}));

describe('EntityListPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.replace.mockClear();
    loadEntityList.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  afterEach(() => {
    if (interactionRoot && interactionContainer) {
      act(() => {
        interactionRoot?.unmount();
      });
      interactionRoot = null;
      interactionContainer.remove();
      interactionContainer = null;
    }
  });

  it('keeps entity catalog remounts on a short settled cache window while refresh invalidates that cache', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');

    expect(source).toContain('ENTITY_LIST_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['entity-list', entityListUrl, refreshNonce].join(':')");
    expect(source).toContain('setRefreshNonce(current => current + 1)');
    expect(source).toContain('onRefresh={refreshQuery}');
    expect(source).toContain('cacheSettledTtlMs={ENTITY_LIST_SETTLED_CACHE_TTL_MS}');
  });

  it('loads the entity list through the shared controller contract', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');
    const initialQuery = { search: 'checkout', type: 'service', status: 'healthy', pageIndex: '2', pageSize: '20' };
    const html = renderToStaticMarkup(<EntityListPage initialQuery={initialQuery} />);

    expect(html).toContain(`data-loading-title="${expectedT('entities.list.loading.title')}"`);
    expect(html).toContain(`data-loading-copy="${expectedT('entities.list.loading.copy')}"`);
    expect(html).toContain('data-loading-delay-ms="150"');
    expect(html).toContain('data-entity-list-surface="otlp-hertzbeat-ui-entity-console"');
    expect(html).toContain('data-entity-list-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-list-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-list-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('data-entity-list-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-entity-list-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-list-toolbar="hertzbeat-ui-table-toolbar"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-hz-search-enter-submit="direct-input"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-entity-list-command-action="refresh"');
    expect(html).toContain('data-entity-list-command-action="clear-filters"');
    expect(html).toContain('data-entity-list-command-action="create"');
    expect(html).toContain('data-entity-list-command-action="discovery"');
    expect(html).toContain('data-entity-list-command-action="import"');
    expect(html).toContain('data-entity-list-refresh-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-clear-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-entity-list-table="hertzbeat-ui-entity-table"');
    expect(html).toContain('data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-entity-list-row-actions="hertzbeat-ui-inline-actions"');
    expect(html).toContain('data-entity-list-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-entity-list-action-help-style="icon-after-action"');
    expect(html).toContain('data-entity-list-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-list-action-help-icon="lucide-circle-help"');
    expect(html).toContain('data-entity-list-action-help="create"');
    expect(html).toContain('data-entity-list-action-help="row-actions"');
    expect(html).toContain('data-entity-list-row-action-help-contract="single-header-help"');
    expect(html).not.toContain('data-entity-list-action-help="row-owner"');
    expect(html).not.toContain('data-entity-list-action-help="row-metrics"');
    expect(html).not.toContain('data-entity-list-action-help="row-logs"');
    expect(html).not.toContain('data-entity-list-action-help="row-traces"');
    expect((html.match(/data-entity-list-action-help-trigger="hertzbeat-ui-action-help"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-style="icon-after-action"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-visual="circle-help-icon"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-icon="lucide-circle-help"/g) || []).length).toBe(7);
    expect(html).not.toContain('<span aria-hidden="true" class="text-[11px] font-semibold leading-none">?</span>');
    expect(html).toContain(expectedT('entities.list.action-help.create.body'));
    expect(html).toContain(expectedT('entities.list.action-help.row-metrics.body'));
    expect(html).toContain(expectedT('entities.list.action-help.row-logs.body'));
    expect(html).toContain(expectedT('entities.list.kicker'));
    expect(html).toContain(expectedT('entities.list.title'));
    expect(html).toContain(expectedT('entities.list.subtitle'));
    expect(html).toContain(expectedT('entities.list.metric.total'));
    expect(html).toContain(expectedT('entities.list.metric.pending-evidence'));
    expect(html).not.toContain(expectedT('entities.list.metric.abnormal'));
    expect(html).toContain(expectedT('entities.list.search.placeholder'));
    expect(html).toContain(expectedT('common.search'));
    expect(html).toContain(expectedT('common.refresh'));
    expect(html).toContain(expectedT('entities.list.action.create'));
    expect(html).toContain(expectedT('entities.list.action.discovery'));
    expect(html).toContain(expectedT('entities.list.action.import'));
    expect(html).toContain(expectedT('entities.list.column.object'));
    expect(html).toContain(expectedT('entities.list.column.owner'));
    expect(html).toContain(expectedT('entities.list.column.progress'));
    expect(html).toContain(expectedT('entities.list.column.evidence'));
    expect(html).toContain(expectedT('entities.list.column.next-action'));
    expect(html).toContain(expectedT('entities.list.column.status'));
    expect(html).toContain(expectedT('entities.list.row.evidence.alerts', { count: 0 }));
    expect(html).toContain(expectedT('entities.list.row.evidence.monitors', { count: 1 }));
    expect(html).toContain(expectedT('entities.list.row.action.owner'));
    expect(html).toContain(expectedT('entities.list.row.action.metrics'));
    expect(html).toContain(expectedT('entities.list.row.action.logs'));
    expect(html).toContain('data-entity-list-command-action="open-detail"');
    expect(html).toContain('data-entity-list-command-action="edit-owner"');
    expect(html).toContain('data-entity-list-command-action="open-metrics"');
    expect(html).toContain('data-entity-list-command-action="open-logs"');
    expect(html).toContain('data-entity-list-command-action="open-traces"');
    expect(html).toContain('checkout-service');
    expect(html).toContain('href="/entities/1"');
    expect(html).toContain('href="/entities/1/edit"');
    expect(html).not.toContain(expectedT('entities.editor.attribution.owner.missing-meta'));
    expect(html).not.toContain(`${expectedT('entities.list.environment.select')} · ${expectedT('entities.list.environment.all')}`);
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-list-rail=');
    expect(html).not.toContain('data-entity-list-action-panel=');
    expect(html).not.toContain('signoz-services-table');
    expect(html).not.toContain('signoz-services-rail');
    expect(html).not.toContain('angular-sidebar-flush');
    expect(source).toContain("components/pages/entity-list-surface");
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('DrawerCodePreview');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain("from '@/components/workbench/primitives'");
    expect(source).not.toContain("from '@/components/workbench/toolbar'");
    expect(source).not.toContain('signoz-services-table');
    expect(source).not.toContain('signoz-services-rail');
    expect(source).not.toContain('angular-sidebar-flush');
    expect(source).toContain("import { api } from '@/lib/api-facade';");
    expect(source).toContain('const list = await loadEntityListFromFacade(api.entities.list, query);');
    expect(source).toContain('contentTrim?: EntityListPageTrim');
    expect(source).toContain('const controllerPayloadTrim =');
    expect(source).toContain('const payloadTrim = controllerPayloadTrim ??');
    expect(source).not.toContain('const list = await loadEntityList(apiMessageGet, query);');

    await mockState.lastLoad?.();

    expect(loadEntityList).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout',
      type: 'service',
      status: 'healthy',
      pageIndex: '2',
      pageSize: '20'
    });
  });

  it('passes the current entity list route as row navigation return context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');

    expect(source).toContain("import { useRouter } from 'next/navigation';");
    expect(source).toContain('const router = useRouter();');
    expect(source).toContain('key={entityListCacheKey}');
    expect(source).toContain("loadingTitle={t('entities.list.loading.title')}");
    expect(source).toContain("loadingCopy={t('entities.list.loading.copy')}");
    expect(source).toContain('loadingDelayMs={150}');
    expect(source).toContain('router.replace(buildEntityListRouteUrl(normalizedQuery), { scroll: false });');
    expect(source).toContain('router.replace(buildEntityListRouteUrl(query), { scroll: false });');
    expect(source).toContain("const nextQuery = clearEntityListTransientFeedback({ ...draft, pageIndex: '0', pageSize: normalizeEntityListPageSize(pageSize) });");
    expect(source).toContain('function clearEntityListTransientFeedback');
    expect(source).toContain("return { ...query, deleteResult: '', deletedEntity: '' };");
    expect(source).toContain('effectiveEntityListRouteUrl');
    expect(source).toContain('returnTo: effectiveEntityListRouteUrl');
    expect(source).toContain('source: effectiveQuery.source');
    expect(source).toContain('monitorId: effectiveQuery.monitorId');
    expect(source).toContain('monitorName: effectiveQuery.monitorName');
    expect(source).toContain('monitorApp: effectiveQuery.monitorApp');
    expect(source).toContain('monitorInstance: effectiveQuery.monitorInstance');
    expect(source).toContain('onPageIndexChange={changePageIndex}');
    expect(source).toContain('onPageSizeChange={changePageSize}');
  });

  it('loads the last available page when a large entity catalog URL requests an out-of-range page', async () => {
    loadEntityList
      .mockResolvedValueOnce({
        content: [],
        totalElements: 1993,
        pageIndex: 999,
        pageSize: 50
      })
      .mockResolvedValueOnce({
        content: [
          {
            entity: {
              id: 1993,
              name: 'hb-mix-last-page',
              type: 'service',
              environment: 'prod',
              status: 'unknown'
            },
            identityCount: 1,
            monitorCount: 0,
            activeAlertCount: 0,
            relationCount: 0
          }
        ],
        totalElements: 1993,
        pageIndex: 39,
        pageSize: 50
      });

    renderToStaticMarkup(
      <EntityListPage
        initialQuery={{
          search: 'hb-mix',
          type: '',
          status: '',
          pageIndex: '999',
          source: 'product-design-1475',
          pageSize: '50'
        }}
      />
    );

    const result = await mockState.lastLoad?.();

    expect(loadEntityList).toHaveBeenNthCalledWith(1, expect.any(Function), {
      search: 'hb-mix',
      type: '',
      status: '',
      pageIndex: '999',
      source: 'product-design-1475',
      pageSize: '50'
    });
    expect(loadEntityList).toHaveBeenNthCalledWith(2, expect.any(Function), {
      search: 'hb-mix',
      type: '',
      status: '',
      pageIndex: '39',
      source: 'product-design-1475',
      pageSize: '50'
    });
    expect(result).toEqual({
      list: expect.objectContaining({
        pageIndex: 39,
        totalElements: 1993
      }),
      pageOutOfRange: {
        requestedPage: 1000,
        displayedPage: 40,
        totalPages: 40
      }
    });
  });

  it('normalizes unsupported page-size URLs before loading the entity catalog and explains the adjustment', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    mockState.renderData = {
      list: {
        content: [
          {
            entity: {
              id: 646566130001493,
              name: 'hb-mix-page-size-adjusted',
              type: 'service',
              environment: 'prod',
              status: 'unknown'
            },
            identityCount: 1,
            monitorCount: 0,
            activeAlertCount: 0,
            relationCount: 0
          }
        ],
        totalElements: 1993,
        pageIndex: 0,
        pageSize: 8
      }
    };

    const html = renderToStaticMarkup(
      <EntityListPage
        initialQuery={{
          search: 'hb-mix',
          type: '',
          status: '',
          pageIndex: '0',
          source: 'product-design-1493',
          pageSize: '100'
        }}
      />
    );
    await mockState.lastLoad?.();

    expect(loadEntityList).toHaveBeenCalledWith(expect.any(Function), {
      search: 'hb-mix',
      type: '',
      status: '',
      pageIndex: '0',
      source: 'product-design-1493',
      pageSize: '8'
    });
    expect(html).toContain('data-entity-list-page-size-adjusted="unsupported-page-size"');
    expect(html).toContain(expectedT('entities.list.pagination.page-size-adjusted.title', { requested: '100', applied: '8' }));
    expect(html).toContain(expectedT('entities.list.pagination.page-size-adjusted.description'));
    expect(html).toContain(expectedT('entities.list.pagination.summary', { page: 1, totalPages: 250, from: 1, to: 1, total: 1993 }));
  });

  it('caps oversized backend entity payloads to the selected page size before rendering rows', () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const oversizedContent = Array.from({ length: 75 }, (_, index) => ({
      entity: {
        id: 7000 + index,
        name: `hb-scale-${index}`,
        type: 'service',
        environment: 'prod',
        status: index % 2 === 0 ? 'unknown' : 'healthy'
      },
      identityCount: 1,
      monitorCount: 0,
      activeAlertCount: 0,
      relationCount: 0
    }));
    vi.mocked(buildEntityTableRows).mockImplementationOnce((items: any[]) =>
      items.map((item, index) => ({
        key: String(item.entity.id),
        name: item.entity.name,
        type: item.entity.type,
        environment: item.entity.environment,
        status: item.entity.status,
        statusTone: 'neutral',
        monitorCount: '0',
        activeAlertCount: '0',
        identityCount: '1',
        relationCount: '0',
        owner: 'platform',
        updatedAt: 'now',
        href: `/entities/${item.entity.id}`,
        ownerHref: `/entities/${item.entity.id}/edit`,
        metricHref: `/ingestion/otlp/metrics?entityId=${item.entity.id}`,
        logHref: `/log/manage?entityId=${item.entity.id}`,
        traceHref: `/trace/manage?entityId=${item.entity.id}`,
        ...(index === 0 ? { identityName: 'first-rendered' } : {})
      }))
    );
    mockState.renderData = {
      list: {
        content: oversizedContent,
        totalElements: 1993,
        pageIndex: 0,
        pageSize: 50
      }
    };

    const html = renderToStaticMarkup(
      <EntityListPage
        initialQuery={{
          search: 'hb-scale',
          type: '',
          status: '',
          pageIndex: '0',
          source: 'product-design-1679',
          pageSize: '50'
        }}
      />
    );

    expect(buildEntityTableRows).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ entity: expect.objectContaining({ name: 'hb-scale-0' }) })]),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        source: 'product-design-1679',
        returnTo: '/entities?search=hb-scale&pageIndex=0&source=product-design-1679&pageSize=50'
      })
    );
    expect(vi.mocked(buildEntityTableRows).mock.calls.at(-1)?.[0]).toHaveLength(50);
    expect(html).toContain('data-entity-list-payload-trimmed="page-size-guard"');
    expect(html).toContain('data-entity-list-payload-trimmed-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(expectedT('entities.list.pagination.payload-trimmed.title', { received: 75, rendered: 50 }));
    expect(html).toContain(expectedT('entities.list.pagination.payload-trimmed.description'));
    expect(html).toContain(expectedT('entities.list.table.range', { from: 1, to: 50, total: 1993 }));
    expect(html).toContain(expectedT('entities.list.pagination.summary', { page: 1, totalPages: 40, from: 1, to: 50, total: 1993 }));
    expect(html).toContain('hb-scale-49');
    expect(html).not.toContain('hb-scale-50');
    expect(html).not.toContain('hb-scale-74');
  });

  it('keeps a 5000-entity catalog page bounded to the current page payload', () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const currentPageContent = Array.from({ length: 50 }, (_, index) => ({
      entity: {
        id: 9000 + index,
        name: `hb-5k-${index}`,
        type: 'service',
        environment: 'prod',
        status: index === 0 ? 'warning' : 'unknown'
      },
      identityCount: index % 3,
      monitorCount: index % 5,
      activeAlertCount: index === 0 ? 2 : 0,
      relationCount: index % 7
    }));
    vi.mocked(buildEntityTableRows).mockImplementationOnce((items: any[]) =>
      items.map(item => ({
        key: String(item.entity.id),
        name: item.entity.name,
        type: item.entity.type,
        environment: item.entity.environment,
        status: item.entity.status,
        statusTone: item.entity.status === 'warning' ? 'warning' : 'neutral',
        monitorCount: String(item.monitorCount || 0),
        activeAlertCount: String(item.activeAlertCount || 0),
        identityCount: String(item.identityCount || 0),
        relationCount: String(item.relationCount || 0),
        owner: 'platform',
        updatedAt: 'now',
        href: `/entities/${item.entity.id}`,
        ownerHref: `/entities/${item.entity.id}/edit`,
        metricHref: `/ingestion/otlp/metrics?entityId=${item.entity.id}`,
        logHref: `/log/manage?entityId=${item.entity.id}`,
        traceHref: `/trace/manage?entityId=${item.entity.id}`
      }))
    );
    mockState.renderData = {
      list: {
        content: currentPageContent,
        totalElements: 5000,
        pageIndex: 2,
        pageSize: 50
      }
    };

    const html = renderToStaticMarkup(
      <EntityListPage
        initialQuery={{
          search: 'hb-5k',
          type: '',
          status: '',
          pageIndex: '2',
          source: 'product-design-1696',
          pageSize: '50'
        }}
      />
    );
    const renderedItems = vi.mocked(buildEntityTableRows).mock.calls.at(-1)?.[0] as unknown[] | undefined;

    expect(renderedItems).toHaveLength(50);
    expect(renderedItems?.[0]).toEqual(expect.objectContaining({ entity: expect.objectContaining({ name: 'hb-5k-0' }) }));
    expect(renderedItems?.at(-1)).toEqual(expect.objectContaining({ entity: expect.objectContaining({ name: 'hb-5k-49' }) }));
    expect(html).toContain(expectedT('entities.list.table.range', { from: 101, to: 150, total: 5000 }));
    expect(html).toContain(expectedT('entities.list.pagination.summary', { page: 3, totalPages: 100, from: 101, to: 150, total: 5000 }));
    expect(html).toContain('data-entity-list-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('hb-5k-49');
    expect(html).not.toContain('hb-5k-50');
    expect(html).not.toContain('data-entity-list-payload-trimmed="page-size-guard"');
  });

  it('uses the clamped out-of-range page for visible pagination even when the response omits page metadata', () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    mockState.renderData = {
      list: {
        content: [
          {
            entity: {
              id: 1993,
              name: 'hb-mix-last-page',
              type: 'service',
              environment: 'prod',
              status: 'unknown'
            },
            identityCount: 1,
            monitorCount: 0,
            activeAlertCount: 0,
            relationCount: 0
          }
        ],
        totalElements: 1993,
        pageSize: 50
      },
      pageOutOfRange: {
        requestedPage: 1000,
        displayedPage: 40,
        totalPages: 40
      }
    } as typeof mockState.renderData;

    const html = renderToStaticMarkup(
      <EntityListPage
        initialQuery={{
          search: 'hb-mix',
          type: '',
          status: '',
          pageIndex: '999',
          source: 'product-design-1475',
          pageSize: '50'
        }}
      />
    );

    expect(html).toContain(expectedT('entities.list.table.range', { from: 1951, to: 1951, total: 1993 }));
    expect(html).toContain(expectedT('entities.list.pagination.summary', { page: 40, totalPages: 40, from: 1951, to: 1951, total: 1993 }));
    expect(html).not.toContain(expectedT('entities.list.table.range', { from: 49951, to: 1993, total: 1993 }));
    expect(html).not.toContain(expectedT('entities.list.pagination.summary', { page: 1000, totalPages: 40, from: 49951, to: 1993, total: 1993 }));
  });

  it('submits the current Entity search input value through the shared SearchRow form', async () => {
    mockState.renderData = {
      list: {
        content: [
          {
            id: 646566130001992,
            name: 'hb-mix-1780329856-svc-11-164',
            type: 'service',
            environment: 'prod',
            status: 'warning',
            gmtUpdate: 1713200000000
          }
        ],
        pageIndex: 2,
        pageSize: 50,
        totalElements: 1993
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityListPage
          initialQuery={{
            search: '',
            type: 'service',
            status: '',
            pageIndex: '2',
            source: 'product-design-1388',
            pageSize: '50'
          }}
        />
      );
      await Promise.resolve();
    });

    const input = interactionContainer.querySelector('input[data-hz-search-input="fixed-width-direct"]') as HTMLInputElement | null;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    expect(input).not.toBeNull();
    expect(input?.getAttribute('data-hz-search-enter-submit')).toBe('direct-input');

    await act(async () => {
      valueSetter?.call(input, 'hb-mix-1780329856-svc-11-164');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledWith(
      '/entities?search=hb-mix-1780329856-svc-11-164&type=service&pageIndex=0&source=product-design-1388&pageSize=50',
      { scroll: false }
    );
  });
});
