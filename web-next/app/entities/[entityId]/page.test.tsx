// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiMessageDelete } from '@/lib/api-client';
import EntityDetailPage, { buildEntityDetailDeleteReturnHref, buildEntityDetailDeleteSuccessHref } from './entity-detail-page';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    entity: {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service',
        status: 'healthy',
        owner: 'platform',
        environment: 'prod',
        system: 'payments',
        description: 'Checkout service'
      }
    },
    evidenceSummary: {
      downMonitorCount: 1
    },
    monitorSummary: {
      totalBoundMonitors: 2
    },
    logSummary: {
      hintCount: 3,
      preferredQueryTitle: 'checkout errors'
    },
    traceSummary: {
      recentTraceCount: 4,
      recentErrorTraceCount: 1
    },
    nextActions: [
      {
        title: 'Open monitors',
        summary: 'Inspect abnormal monitors first.',
        actionLabel: 'Open monitors'
      }
    ]
  },
  refresh: vi.fn(),
  push: vi.fn()
}));

const loadEntityDetail = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockState.refresh,
    push: mockState.push
  })
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
    loadingTitle,
    loadingCopy,
    loadTimeoutMs,
    loadingDelayMs
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingTitle?: string;
    loadingCopy?: string;
    loadTimeoutMs?: number;
    loadingDelayMs?: number;
  }) => {
    mockState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-loading-title={loadingTitle}
        data-loading-copy={loadingCopy}
        data-load-timeout-ms={loadTimeoutMs}
        data-loading-delay-ms={loadingDelayMs}
      >
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('@/components/pages/entity-detail-surface', () => ({
  EntityDetailSurface: ({ actionError, createdResult, detail, isPending, onDelete, routeContext }: any) => {
    const surfaceT = createTranslatorMock({ locale: 'zh-CN' });
    const entity = detail.entity?.entity || {};
    return (
      <main
        data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"
        data-entity-detail-style-baseline="hertzbeat-ui-matte"
        data-entity-detail-layout="full-width-workbench"
        data-entity-detail-route-monitor-id={routeContext?.monitorId || ''}
        data-entity-detail-route-time-range={routeContext?.timeRange || ''}
        data-entity-detail-route-return-to={routeContext?.returnTo || ''}
        data-entity-detail-created-result={createdResult ? 'true' : 'false'}
      >
        <header
          data-entity-detail-header="hertzbeat-ui-compact-header"
          data-entity-detail-header-nesting-contract="flat-page-introduction"
        >
          {surfaceT('entities.detail.header.badge')}
          {surfaceT('entities.detail.header.kicker')}
          <div data-entity-detail-command-row="standard-equal-buttons">
            <span data-href="/entities">{surfaceT('entities.detail.action.all-entities')}</span>
            <button>{surfaceT('common.refresh')}</button>
            <span data-href={`/entities/${entity.id}/definition`}>{surfaceT('entities.detail.action.edit-definition')}</span>
            <button
              data-entity-detail-delete-confirm-action="route-mock"
              disabled={isPending}
              onClick={() => onDelete?.(entity.id)}
            >
              {surfaceT('entities.detail.action.delete')}
            </button>
            <span data-href={`/entities/${entity.id}/edit`}>{surfaceT('entities.detail.action.edit')}</span>
          </div>
        </header>
        {actionError ? <div data-entity-detail-error="hertzbeat-ui-inline-error">{actionError}</div> : null}
        <div data-entity-detail-count-strip="hertzbeat-ui-inline-counts" />
        <div data-entity-detail-signal-grid="hertzbeat-ui-detail-grid">
          <section data-entity-detail-overview-panel="hertzbeat-ui-overview-panel">{surfaceT('entities.detail.panel.overview.title')}</section>
          <section data-entity-detail-related-panel="hertzbeat-ui-related-panel">{surfaceT('entities.detail.panel.related.title')}</section>
          <section data-entity-detail-next-panel="hertzbeat-ui-next-panel">{surfaceT('entities.detail.panel.next.title')}</section>
          <section data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel">{surfaceT('entities.detail.panel.drilldown.title')}</section>
        </div>
      </main>
    );
  }
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'btn'
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageDelete: vi.fn()
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      detail: vi.fn()
    }
  }
}));

vi.mock('@/lib/entity-detail/controller', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/entity-detail/controller')>();
  return {
    ...actual,
    loadEntityDetailFromFacade: loadEntityDetail
  };
});

describe('EntityDetailPage', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.refresh.mockReset();
    mockState.push.mockReset();
    loadEntityDetail.mockClear().mockResolvedValue(mockState.renderData);
    vi.mocked(apiMessageDelete).mockReset();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  it('renders the cold full-width entity detail workbench without old Workbench side panels', async () => {
    const loadingT = createTranslatorMock();
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/entity-detail-page.tsx'), 'utf8');
    const html = renderToStaticMarkup(<EntityDetailPage entityId="42" />);

    expect(html).toContain(`data-loading-title="${loadingT('entities.detail.loading.title')}"`);
    expect(html).toContain(`data-loading-copy="${loadingT('entities.detail.loading.copy')}"`);
    expect(html).toContain('data-load-timeout-ms="15000"');
    expect(html).toContain('data-loading-delay-ms="150"');
    expect(html).toContain('data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"');
    expect(html).toContain('data-entity-detail-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(html).toContain('data-entity-detail-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-detail-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-detail-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"');
    expect(html).toContain('data-entity-detail-overview-panel="hertzbeat-ui-overview-panel"');
    expect(html).toContain('data-entity-detail-related-panel="hertzbeat-ui-related-panel"');
    expect(html).toContain('data-entity-detail-next-panel="hertzbeat-ui-next-panel"');
    expect(html).toContain('data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel"');
    expect(html).toContain(expectedT('entities.detail.header.badge'));
    expect(html).toContain(expectedT('entities.detail.header.kicker'));
    expect(html).toContain(expectedT('entities.detail.action.all-entities'));
    expect(html).toContain(expectedT('common.refresh'));
    expect(html).toContain(expectedT('entities.detail.action.edit-definition'));
    expect(html).toContain(expectedT('entities.detail.action.delete'));
    expect(html).toContain(expectedT('entities.detail.action.edit'));
    expect(html).toContain(expectedT('entities.detail.panel.overview.title'));
    expect(html).toContain(expectedT('entities.detail.panel.related.title'));
    expect(html).toContain(expectedT('entities.detail.panel.next.title'));
    expect(html).toContain(expectedT('entities.detail.panel.drilldown.title'));
    expect(html).toContain('/entities/42/definition');
    expect(html).not.toContain('Refresh');
    expect(html).not.toContain('Edit definition');
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('Review the summary first');
    expect(html).not.toContain('data-workbench-actions');
    expect(html).not.toContain('data-stage-section');
    expect(html).not.toContain('data-drawer-section');

    expect(source).toContain("from '@/components/pages/entity-detail-surface'");
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain("from '@/components/workbench/workbench-page'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).not.toContain("from '@/components/workbench/primitives'");

    await mockState.lastLoad?.();

    expect(loadEntityDetail).toHaveBeenCalledWith(expect.any(Function), '42', expect.any(Function));
  });

  it('passes inherited time and monitor context into the entity detail surface', () => {
    const routeContext = {
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443'
    };

    const html = renderToStaticMarkup(<EntityDetailPage entityId="42" routeContext={routeContext} />);

    expect(html).toContain('data-entity-detail-route-monitor-id="632051474676992"');
    expect(html).toContain('data-entity-detail-route-time-range="last-45m"');
  });

  it('passes post-create result into the entity detail surface without requiring a route context source', () => {
    const html = renderToStaticMarkup(<EntityDetailPage entityId="42" createdResult />);

    expect(html).toContain('data-entity-detail-created-result="true"');
  });

  it('keeps the novice post-create detail route tied to the originating entity list context', () => {
    const html = renderToStaticMarkup(
      <EntityDetailPage
        entityId="42"
        createdResult
        routeContext={{
          returnTo: '/entities?search=checkout&pageSize=50&source=product-design-1719',
          source: 'product-design-1719'
        }}
      />
    );

    expect(html).toContain('data-entity-detail-created-result="true"');
    expect(html).toContain(
      'data-entity-detail-route-return-to="/entities?search=checkout&amp;pageSize=50&amp;source=product-design-1719"'
    );
    expect(html).toContain('data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"');
  });

  it('returns to the safe entity list context after delete instead of dropping query parameters', () => {
    expect(
      buildEntityDetailDeleteReturnHref({
        returnTo: '/entities?search=checkout&source=entity-create-return&pageSize=8',
        source: 'entity-create-return'
      }, '42')
    ).toBe('/entities?search=checkout&source=entity-create-return&pageSize=8');

    expect(
      buildEntityDetailDeleteReturnHref({
        returnTo: 'https://example.invalid/entities',
        timeRange: 'last-30m',
        source: 'monitor'
      }, '42')
    ).toBe('/entities?timeRange=last-30m&source=monitor');

    expect(
      buildEntityDetailDeleteReturnHref({
        returnTo: '/entities/42?source=entity-edit-return',
        timeRange: 'last-30m',
        source: 'entity-edit-return'
      }, '42')
    ).toBe('/entities?timeRange=last-30m&source=entity-edit-return');

    expect(
      buildEntityDetailDeleteReturnHref({
        returnTo: '/entities/42/edit?source=entity-edit-return',
        timeRange: 'last-30m',
        source: 'entity-edit-return'
      }, 42)
    ).toBe('/entities?timeRange=last-30m&source=entity-edit-return');
  });

  it('adds a list-visible success result to the post-delete return URL', () => {
    expect(buildEntityDetailDeleteSuccessHref('/entities?source=entity-delete-return&pageSize=8', '42')).toBe(
      '/entities?source=entity-delete-return&pageSize=8&deleteResult=success&deletedEntity=42'
    );
    expect(buildEntityDetailDeleteSuccessHref('/entities', null)).toBe('/entities?deleteResult=success');
  });

  it('keeps novice entity detail recoverable when delete fails', async () => {
    vi.mocked(apiMessageDelete).mockRejectedValueOnce(new Error('delete denied by relation guard'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <EntityDetailPage
          entityId="42"
          routeContext={{
            returnTo: '/entities?search=checkout&pageSize=50&source=product-design-delete-failure',
            source: 'product-design-delete-failure'
          }}
        />
      );
    });

    const deleteButton = container.querySelector<HTMLButtonElement>('[data-entity-detail-delete-confirm-action="route-mock"]');
    expect(deleteButton).not.toBeNull();

    await act(async () => {
      deleteButton?.click();
    });

    expect(apiMessageDelete).toHaveBeenCalledTimes(1);
    expect(apiMessageDelete).toHaveBeenCalledWith('/entities/42');
    expect(container.innerHTML).toContain('data-entity-detail-error="hertzbeat-ui-inline-error"');
    expect(container.textContent).toContain('delete denied by relation guard');
    expect(container.innerHTML).toContain('data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"');
    expect(container.innerHTML).toContain('data-entity-detail-route-return-to="/entities?search=checkout&amp;pageSize=50&amp;source=product-design-delete-failure"');
    expect(mockState.push).not.toHaveBeenCalled();
    expect(mockState.refresh).not.toHaveBeenCalled();
  });

  it('keeps entity detail remounts on a short settled cache window with refresh invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/entity-detail-page.tsx'), 'utf8');

    expect(source).toContain('ENTITY_DETAIL_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('ENTITY_DETAIL_LOAD_TIMEOUT_MS = 15_000');
    expect(source).toContain('key={entityDetailCacheKey}');
    expect(source).toContain("loadingTitle={t('entities.detail.loading.title')}");
    expect(source).toContain("loadingCopy={t('entities.detail.loading.copy')}");
    expect(source).toContain('loadTimeoutMs={ENTITY_DETAIL_LOAD_TIMEOUT_MS}');
    expect(source).toContain('loadingDelayMs={150}');
    expect(source).toContain('const [reloadNonce, setReloadNonce] = useState(0)');
    expect(source).toContain("['entity-detail', entityDetailUrl, reloadNonce].join(':')");
    expect(source).toContain('[entityDetailUrl, reloadNonce]');
    expect(source).toContain('void reloadNonce');
    expect(source).toContain("import { api } from '@/lib/api-facade';");
    expect(source).toContain('return loadEntityDetailFromFacade(api.entities.detail, entityId, t);');
    expect(source).toContain("import { resetWorkbenchLoadCache } from '@/lib/workbench-load-cache';");
    expect(source).toContain('resetWorkbenchLoadCache();');
    expect(source).toContain('router.push(buildEntityDetailDeleteSuccessHref(deleteReturnHref, entityId));');
    expect(source).not.toContain('return loadEntityDetail(apiMessageGet, entityId, t);');
    expect(source).toContain('setReloadNonce(current => current + 1)');
    expect(source).toContain('router.refresh();');
    expect(source).toContain('cacheKey={entityDetailCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ENTITY_DETAIL_SETTLED_CACHE_TTL_MS}');
  });
});
