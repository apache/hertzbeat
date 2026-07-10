// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { EntityListSurface } from './entity-list-surface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/search-row', async () => {
  const actual = await vi.importActual<typeof import('../ui/search-row')>('../ui/search-row');
  return actual;
});

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('EntityListSurface', () => {
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
  });

  it('owns the OTLP cold-matte entity admin/list shell without a copied right rail', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-list-surface.tsx'), 'utf8');
    const visualSource = readFileSync(resolve(process.cwd(), 'lib/hz-ops-visual.ts'), 'utf8');
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: '1',
            name: 'Checkout Service',
            identityName: 'checkout-api',
            type: 'Service',
            environment: 'Local',
            status: 'Healthy',
            statusTone: 'success',
            health: {
              score: 84,
              scoreText: '84 / 100',
              label: 'Health score 84',
              copy: 'Collected 4 / 4 healthy',
              meta: 'Alerts 2 · exceptions 0',
              tone: 'warning'
            },
            monitorCount: '1',
            activeAlertCount: '0',
            identityCount: '3',
            relationCount: '2',
            owner: 'checkout-oncall',
            updatedAt: 'now',
            href: '/entities/1',
            ownerHref: '/entities/1/edit',
            metricHref: '/ingestion/otlp/metrics?entityId=1',
            logHref: '/log/manage?entityId=1',
            traceHref: '/trace/manage?entityId=1'
          }
        ]}
        draft={{ search: 'checkout', type: 'service', status: 'healthy' }}
        total={1}
        rangeFrom={1}
        rangeTo={1}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        alertingCount={0}
        linkedCount={1}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-surface="otlp-hertzbeat-ui-entity-console"');
    expect(html).toContain('data-entity-list-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('w-full');
    expect(html).toContain('min-w-0');
    expect(html).toContain('data-entity-list-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-list-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-entity-list-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-list-command-row-mobile="two-column-wrap"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list" class="w-full min-w-0 space-y-5"');
    expect(html).toContain('data-entity-list-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-list-toolbar="hertzbeat-ui-table-toolbar"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-entity-list-command-action="refresh"');
    expect(html).toContain('data-entity-list-command-action="clear-filters"');
    expect(html).toContain('data-entity-list-command-action="create"');
    expect(html).toContain('data-entity-list-command-action="discovery"');
    expect(html).toContain('data-entity-list-command-action="import"');
    expect(html).toContain('data-entity-list-refresh-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-clear-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-active-filters="visible-url-filters"');
    expect(html).toContain('data-entity-list-active-filters-owner="hertzbeat-ui-filter-scope"');
    expect(html).toContain('data-entity-list-active-filter-chip="type"');
    expect(html).toContain('data-entity-list-active-filter-chip="status"');
    expect(html).toContain(t('entities.list.active-filter.title'));
    expect(html).toContain(t('entities.list.active-filter.copy'));
    expect(html).toContain(t('entities.list.active-filter.type', { value: t('entities.list.type.service') }));
    expect(html).toContain(t('entities.list.active-filter.status', { value: t('entities.list.status.healthy') }));
    expect(html).toContain('data-entity-list-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-entity-list-table="hertzbeat-ui-entity-table"');
    expect(html).toContain('data-entity-list-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-entity-list-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-entity-list-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-entity-list-row-actions="hertzbeat-ui-inline-actions"');
    expect(html).toContain(t('entities.list.row.evidence.relations', { count: '2' }));
    expect(html).toContain('data-entity-list-row-compact-evidence="first-column-narrow-viewport"');
    expect(html).toContain('data-entity-list-row-compact-actions="first-column-narrow-viewport"');
    expect(html).toContain('data-entity-list-row-compact-owner-action="first-column"');
    expect(html).toContain('data-entity-list-row-compact-metric-action="first-column"');
    expect(html).toContain('data-entity-list-row-compact-log-action="first-column"');
    expect(html).toContain('data-entity-list-row-compact-trace-action="first-column"');
    expect(html).toContain('data-entity-list-command-action="open-detail"');
    expect(html).toContain('data-entity-list-command-action="edit-owner"');
    expect(html).toContain('data-entity-list-command-action="open-metrics"');
    expect(html).toContain('data-entity-list-command-action="open-logs"');
    expect(html).toContain('data-entity-list-command-action="open-traces"');
    expect(html).toContain('xl:hidden');
    expect(html).toContain('data-entity-list-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-entity-list-action-help-style="icon-after-action"');
    expect(html).toContain('data-entity-list-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-list-action-help-icon="lucide-circle-help"');
    expect(html).toContain('data-entity-list-action-help="refresh"');
    expect(html).toContain('data-entity-list-action-help="create"');
    expect(html).toContain('data-entity-list-action-help="discovery"');
    expect(html).toContain('data-entity-list-action-help="import"');
    expect(html).toContain('data-entity-list-action-help="filter-refresh"');
    expect(html).toContain('data-entity-list-action-help="clear"');
    expect(html).toContain('data-entity-list-action-help="row-actions"');
    expect(html).toContain('data-entity-list-row-action-help-contract="single-header-help"');
    expect(html).not.toContain('data-entity-list-action-help="row-owner"');
    expect(html).not.toContain('data-entity-list-action-help="row-metrics"');
    expect(html).not.toContain('data-entity-list-action-help="row-logs"');
    expect(html).not.toContain('data-entity-list-action-help="row-traces"');
    expect((html.match(/data-entity-list-action-help-style="icon-after-action"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-visual="circle-help-icon"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-icon="lucide-circle-help"/g) || []).length).toBe(7);
    expect((html.match(/data-entity-list-action-help-trigger="hertzbeat-ui-action-help"/g) || []).length).toBe(7);
    expect(html).not.toContain('<span aria-hidden="true" class="text-[11px] font-semibold leading-none">?</span>');
    expect(html).toContain(t('entities.list.action-help.create.body'));
    expect(html).toContain(t('entities.list.action-help.row-owner.body'));
    expect(html).toContain('data-entity-list-health-affordance="lightweight-service-health"');
    expect(html).toContain('data-entity-health-score="84"');
    expect(html).toContain(t('entities.list.title'));
    expect(html).toContain(t('entities.list.kicker'));
    expect(html).toContain(t('entities.list.metric.total'));
    expect(html).toContain(t('entities.list.metric.pending-evidence'));
    expect(html).not.toContain(t('entities.list.metric.abnormal'));
    expect(html).toContain(t('entities.list.search.placeholder'));
    expect(html).toContain(t('entities.list.row.action.owner'));
    expect(html).toContain(t('entities.list.row.action.metrics'));
    expect(html).toContain('checkout-oncall');
    expect(html).toContain('data-entity-list-row-identity-name="service-name"');
    expect(html).toContain(t('entities.list.row.identity-name', { name: 'checkout-api' }));
    expect(html).toContain(t('entities.list.row.evidence.identities', { count: '3' }));
    expect(html).not.toContain(t('entities.list.row.owner.unset'));
    expect(html).toContain(t('entities.list.action.create'));
    expect(html).toContain(t('entities.list.action.discovery'));
    expect(html).toContain(t('entities.list.action.import'));
    expect(html).toContain(t('entities.list.table.range', { from: 1, to: 1, total: 1 }));
    expect(html).toContain(t('entities.list.pagination.summary', { page: 1, totalPages: 1, from: 1, to: 1, total: 1 }));
    expect(html).toContain('Checkout Service');
    expect(html).toContain('Health score 84');
    expect(html).toContain('Collected 4 / 4 healthy');
    expect(html).not.toContain('\u8865\u8d1f\u8d23\u4eba');
    expect(html).not.toContain('\u9009\u62e9\u73af\u5883 \u00b7 \u5168\u90e8\u73af\u5883');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-list-rail=');
    expect(html).not.toContain('data-entity-list-action-panel=');
    expect(html).not.toContain('signoz-services-table');
    expect(html).not.toContain('angular-sidebar-flush');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("import { cn } from '../../lib/utils'");
    expect(source).toContain("cn(coldEntityVisual.canvas.root, 'w-full min-w-0')");
    expect(source).toContain("cn(coldEntityVisual.layout.pageSection, 'w-full min-w-0')");
    expect(source).toContain('mx-auto w-full max-w-[1480px] min-w-0');
    expect(source).toContain('data-entity-list-admin-layout="full-width-admin-list" className="w-full min-w-0 space-y-5"');
    expect(source).toContain('className="w-full min-w-0 overflow-hidden rounded-[4px]');
    expect(source).toContain('data-entity-list-command-row-mobile="two-column-wrap"');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("import { HzInlineFeedback, HzPaginationBar } from '@hertzbeat/ui'");
    expect(source).toContain('data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('inputWidthClassName="w-full sm:w-[420px]"');
    expect(visualSource).toContain("pageSection: 'relative bg-[#0b0c0e] px-4 py-6 sm:px-6 lg:px-8'");
    expect(source).toContain('rounded-[4px]');
    expect(source).toContain('rounded-[3px]');
    expect(source).toContain('min-w-[104px]');
    expect(source).toContain('data-entity-list-row-owner-action="text-only"');
    expect(source).toContain('function EntityListCompactRowEvidence');
    expect(source).toContain('data-entity-list-row-compact-evidence="first-column-narrow-viewport"');
    expect(source).toContain('function EntityListCompactRowActions');
    expect(source).toContain('data-entity-list-row-compact-actions="first-column-narrow-viewport"');
    expect(source).toContain('data-entity-list-row-compact-owner-action="first-column"');
    expect(source).toContain('data-entity-list-row-compact-metric-action="first-column"');
    expect(source).toContain('data-entity-list-row-compact-log-action="first-column"');
    expect(source).toContain('data-entity-list-row-compact-trace-action="first-column"');
    expect(source).toContain('data-entity-list-health-affordance="lightweight-service-health"');
    expect(source).toContain('data-entity-list-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-entity-list-action-help-style="icon-after-action"');
    expect(source).toContain('data-entity-list-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-list-action-help-icon="lucide-circle-help"');
    expect(source).toContain('function EntityListActionHelp');
    expect(source).toContain('function EntityListActionLink');
    expect(source).toContain('data-entity-list-row-action-help-contract="single-header-help"');
    expect(source).toContain('data-entity-list-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('text-white');
    expect(source).not.toContain('bg-white');
    expect(source).not.toContain('className={coldEntityVisual.panel.hero}');
    expect(source).toContain('CircleHelp');
    expect(source).not.toContain('HelpCircle');
    expect(source).not.toContain('<span aria-hidden="true" className="text-[11px] font-semibold leading-none">');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldEntityVisual.search.row');
    expect(source).not.toContain('coldEntityVisual.search.input');
    expect(source).not.toContain('\u8865\u8d1f\u8d23\u4eba');
    expect(source).not.toContain('\u9009\u62e9\u73af\u5883 \u00b7');
    expect(source).not.toContain('UserPlus');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('from \'../workbench/primitives\'');
    expect(source).not.toContain('signoz');
    expect(source).not.toContain('angular-');
    expect(source).not.toContain('data-entity-list-rail');
    expect(source).not.toContain('data-entity-list-action-panel');
  });

  it('keeps per-row relationship counts visible for high-relation entity scanning', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: 'large-rel',
            name: 'Checkout Mesh',
            identityName: 'checkout-mesh',
            type: 'Service',
            environment: 'prod',
            status: 'Unknown',
            statusTone: 'neutral',
            monitorCount: '17',
            activeAlertCount: '3',
            identityCount: '8',
            relationCount: '127',
            owner: 'platform',
            updatedAt: 'now',
            href: '/entities/large-rel',
            ownerHref: '/entities/large-rel/edit',
            metricHref: '/ingestion/otlp/metrics?entityId=large-rel',
            logHref: '/log/manage?entityId=large-rel',
            traceHref: '/trace/manage?entityId=large-rel'
          }
        ]}
        draft={{ search: 'checkout', type: '', status: '' }}
        total={1}
        rangeFrom={1}
        rangeTo={1}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={1}
        alertingCount={1}
        linkedCount={1}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain(t('entities.list.row.evidence.monitors', { count: '17' }));
    expect(html).toContain(t('entities.list.row.evidence.alerts', { count: '3' }));
    expect(html).toContain(t('entities.list.row.evidence.identities', { count: '8' }));
    expect(html).toContain(t('entities.list.row.evidence.relations', { count: '127' }));
    expect(html).toContain('data-entity-list-row-compact-evidence="first-column-narrow-viewport"');
  });

  it('does not show the URL filter scope when the entity directory is not narrowed by hidden filters', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: '', type: '', status: '' }}
        total={0}
        rangeFrom={0}
        rangeTo={0}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).not.toContain('data-entity-list-active-filters="visible-url-filters"');
    expect(html).not.toContain('data-entity-list-active-filter-chip=');
  });

  it('labels non-total count-strip metrics as current-page counts', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: 'codex-pd-1450-volume', type: '', status: '' }}
        total={500}
        rangeFrom={1}
        rangeTo={50}
        pageIndex={0}
        pageSize={50}
        abnormalCount={50}
        healthPendingCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain(t('entities.list.metric.total'));
    expect(html).toContain(t('entities.list.metric.abnormal'));
    expect(html).toContain(t('entities.list.metric.alerting'));
    expect(html).toContain(t('entities.list.metric.linked'));
    expect(html).toContain('data-entity-list-scale-scope="paged-catalog"');
    expect(html).toContain('data-entity-list-scale-scope-owner="hertzbeat-ui-inline-scope"');
    expect(html).toContain(t('entities.list.scale-scope.title'));
    expect(html).toContain(t('entities.list.scale-scope.copy', { from: 1, to: 50, total: 500 }));
    expect(html).toContain('data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar" data-entity-list-pagination-placement="top"');
    expect(html).toContain('data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar" data-entity-list-pagination-placement="bottom"');
    expect(html).toContain('500');
    expect(html).toContain('50');
  });

  it('keeps 5000-entity pagination jumps bounded for novice scale browsing', async () => {
    const onPageIndexChange = vi.fn();

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityListSurface
          t={t}
          rows={Array.from({ length: 50 }, (_, index) => ({
            key: `hb-5k-${index}`,
            name: `hb-5k-${index}`,
            type: 'service',
            environment: 'prod',
            status: index === 0 ? 'warning' : 'unknown',
            statusTone: index === 0 ? 'warning' : 'neutral',
            monitorCount: String(index % 5),
            activeAlertCount: index === 0 ? '2' : '0',
            identityCount: String(index % 3),
            relationCount: String(index % 7),
            owner: 'platform',
            updatedAt: 'now',
            href: `/entities/${9000 + index}`,
            ownerHref: `/entities/${9000 + index}/edit`,
            metricHref: `/ingestion/otlp/metrics?entityId=${9000 + index}`,
            logHref: `/log/manage?entityId=${9000 + index}`,
            traceHref: `/trace/manage?entityId=${9000 + index}`
          }))}
          draft={{ search: 'hb-5k', type: '', status: '', pageIndex: '2', pageSize: '50' }}
          total={5000}
          rangeFrom={101}
          rangeTo={150}
          pageIndex={2}
          pageSize={50}
          abnormalCount={0}
          healthPendingCount={49}
          alertingCount={1}
          linkedCount={42}
          onDraftChange={() => undefined}
          onSearch={() => undefined}
          onRefresh={() => undefined}
          onReset={() => undefined}
          onPageIndexChange={onPageIndexChange}
          onPageSizeChange={() => undefined}
        />
      );
      await Promise.resolve();
    });

    const pageJump = interactionContainer.querySelector(
      'input[data-entity-list-pagination-page-jump-owner="hertzbeat-ui-input"]'
    ) as HTMLInputElement | null;
    const nextButton = interactionContainer.querySelector(
      'button[data-entity-list-pagination-next-owner="hertzbeat-ui-button"]'
    ) as HTMLButtonElement | null;
    const previousButton = interactionContainer.querySelector(
      'button[data-entity-list-pagination-previous-owner="hertzbeat-ui-button"]'
    ) as HTMLButtonElement | null;
    const topPagination = interactionContainer.querySelector(
      '[data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"][data-entity-list-pagination-placement="top"]'
    );
    const bottomPagination = interactionContainer.querySelector(
      '[data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"][data-entity-list-pagination-placement="bottom"]'
    );

    expect(topPagination).not.toBeNull();
    expect(bottomPagination).not.toBeNull();
    expect(pageJump).not.toBeNull();
    expect(pageJump?.value).toBe('3');
    expect(pageJump?.max).toBe('100');
    expect(nextButton?.disabled).toBe(false);
    expect(previousButton?.disabled).toBe(false);
    expect(interactionContainer.textContent).toContain(t('entities.list.scale-scope.copy', { from: 101, to: 150, total: 5000 }));
    expect(interactionContainer.textContent).toContain(t('entities.list.pagination.summary', { page: 3, totalPages: 100, from: 101, to: 150, total: 5000 }));

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const changePageJump = async (value: string) => {
      await act(async () => {
        valueSetter?.call(pageJump, value);
        pageJump?.dispatchEvent(new Event('input', { bubbles: true }));
        pageJump?.dispatchEvent(new Event('change', { bubbles: true }));
        await Promise.resolve();
      });
    };

    await changePageJump('100');
    expect(onPageIndexChange).toHaveBeenLastCalledWith(99);

    await changePageJump('999');
    expect(onPageIndexChange).toHaveBeenLastCalledWith(99);

    await changePageJump('0');
    expect(onPageIndexChange).toHaveBeenLastCalledWith(0);

    await act(async () => {
      nextButton?.click();
      await Promise.resolve();
    });
    expect(onPageIndexChange).toHaveBeenLastCalledWith(3);

    await act(async () => {
      previousButton?.click();
      await Promise.resolve();
    });
    expect(onPageIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('shows pending evidence instead of abnormal when the current page is unscored at scale', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: 'hb-mix-1780329856', type: '', status: '' }}
        total={1993}
        rangeFrom={1}
        rangeTo={50}
        pageIndex={0}
        pageSize={50}
        abnormalCount={0}
        healthPendingCount={50}
        alertingCount={0}
        linkedCount={50}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-count-metric="pending-evidence"');
    expect(html).toContain(t('entities.list.metric.pending-evidence'));
    expect(html).not.toContain(t('entities.list.metric.abnormal'));
    expect(html).toContain('1993');
    expect(html).toContain('50');
  });

  it('explains out-of-range large catalog pagination and keeps the table inspectable', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: 'last-row',
            name: 'hb-mix-last-page',
            type: 'Service',
            environment: 'prod',
            status: 'Unknown',
            statusTone: 'neutral',
            monitorCount: '0',
            activeAlertCount: '0',
            identityCount: '1',
            relationCount: '0',
            owner: 'local-scale-proof',
            updatedAt: 'now',
            href: '/entities/1993',
            ownerHref: '/entities/1993/edit',
            metricHref: '/ingestion/otlp/metrics?entityId=1993',
            logHref: '/log/manage?entityId=1993',
            traceHref: '/trace/manage?entityId=1993'
          }
        ]}
        draft={{ search: 'hb-mix', type: '', status: '', pageIndex: '999', pageSize: '50' }}
        total={1993}
        rangeFrom={1951}
        rangeTo={1993}
        pageIndex={39}
        pageSize={50}
        abnormalCount={0}
        healthPendingCount={1}
        alertingCount={0}
        linkedCount={1}
        pageOutOfRange={{ requestedPage: 1000, displayedPage: 40, totalPages: 40 }}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-page-out-of-range="showing-last-page"');
    expect(html).toContain('data-entity-list-page-out-of-range-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(t('entities.list.pagination.out-of-range.title', { requestedPage: 1000, totalPages: 40 }));
    expect(html).toContain(t('entities.list.pagination.out-of-range.description', { displayedPage: 40, totalPages: 40 }));
    expect(html).toContain(t('entities.list.table.range', { from: 1951, to: 1993, total: 1993 }));
    expect(html).toContain(t('entities.list.pagination.summary', { page: 40, totalPages: 40, from: 1951, to: 1993, total: 1993 }));
    expect(html).toContain('hb-mix-last-page');
    expect(html).not.toContain(t('entities.list.table.range', { from: 49951, to: 1993, total: 1993 }));
    expect(html).not.toContain(t('entities.list.pagination.summary', { page: 1000, totalPages: 40, from: 49951, to: 1993, total: 1993 }));
  });

  it('explains unsupported page-size URLs before showing the normalized catalog page', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: 'hb-mix', type: '', status: '', pageIndex: '0', pageSize: '8' }}
        total={1993}
        rangeFrom={1}
        rangeTo={8}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={8}
        alertingCount={0}
        linkedCount={8}
        pageSizeAdjustment={{ requested: '100', applied: '8' }}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-page-size-adjusted="unsupported-page-size"');
    expect(html).toContain('data-entity-list-page-size-adjusted-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(t('entities.list.pagination.page-size-adjusted.title', { requested: '100', applied: '8' }));
    expect(html).toContain(t('entities.list.pagination.page-size-adjusted.description'));
    expect(html).toContain(t('entities.list.pagination.summary', { page: 1, totalPages: 250, from: 1, to: 8, total: 1993 }));
  });

  it('turns oversized backend payload feedback into refresh and clear recovery actions', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: 'hb-scale', type: '', status: '', pageIndex: '0', pageSize: '50' }}
        total={1993}
        rangeFrom={1}
        rangeTo={50}
        pageIndex={0}
        pageSize={50}
        abnormalCount={0}
        healthPendingCount={50}
        alertingCount={0}
        linkedCount={50}
        payloadTrim={{ received: 75, rendered: 50 }}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-payload-trimmed="page-size-guard"');
    expect(html).toContain('data-entity-list-payload-trimmed-actions="refresh-clear"');
    expect(html).toContain('data-entity-list-payload-trimmed-refresh="table-reload"');
    expect(html).toContain('data-entity-list-payload-trimmed-clear="reset-filters"');
    expect(html).toContain(t('entities.list.pagination.payload-trimmed.title', { received: 75, rendered: 50 }));
    expect(html).toContain(t('entities.list.pagination.payload-trimmed.description'));
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('common.clear'));
  });

  it('lets operators recover from oversized backend payload feedback with refresh and clear actions', async () => {
    const onRefresh = vi.fn();
    const onReset = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityListSurface
          t={t}
          rows={[]}
          draft={{ search: 'hb-scale', type: 'service', status: 'unknown', pageIndex: '0', pageSize: '50' }}
          total={1993}
          rangeFrom={1}
          rangeTo={50}
          pageIndex={0}
          pageSize={50}
          abnormalCount={0}
          healthPendingCount={50}
          alertingCount={0}
          linkedCount={50}
          payloadTrim={{ received: 75, rendered: 50 }}
          onDraftChange={() => undefined}
          onSearch={() => undefined}
          onRefresh={onRefresh}
          onReset={onReset}
          onPageIndexChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      );
      await Promise.resolve();
    });

    const refreshAction = interactionContainer.querySelector(
      'button[data-entity-list-payload-trimmed-refresh="table-reload"]'
    ) as HTMLButtonElement | null;
    const clearAction = interactionContainer.querySelector(
      'button[data-entity-list-payload-trimmed-clear="reset-filters"]'
    ) as HTMLButtonElement | null;

    expect(interactionContainer.querySelector('[data-entity-list-payload-trimmed="page-size-guard"]')).not.toBeNull();
    expect(refreshAction?.textContent).toContain(t('common.refresh'));
    expect(clearAction?.textContent).toContain(t('common.clear'));

    await act(async () => {
      refreshAction?.click();
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();

    await act(async () => {
      clearAction?.click();
      await Promise.resolve();
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows a compact delete success feedback after returning from entity detail delete', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: '', type: '', status: '', deleteResult: 'success', deletedEntity: '42' }}
        total={0}
        rangeFrom={0}
        rangeTo={0}
        pageIndex={0}
        pageSize={50}
        abnormalCount={0}
        healthPendingCount={0}
        alertingCount={0}
        linkedCount={0}
        deleteSuccess
        deletedEntity="42"
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-delete-success="entity-delete-confirmed"');
    expect(html).toContain('data-entity-list-delete-success-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-entity-list-delete-success-id="42"');
    expect(html).toContain(t('common.notify.delete-success'));
    expect(html).toContain(t('entities.list.delete-success.description', { id: '42' }));
  });

  it('shows an evidence lifecycle reason beside unknown entity status', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: '42',
            name: 'Codex PD Entity',
            type: 'Service',
            environment: 'Local',
            status: t('entities.list.status.unknown'),
            statusReason: t('entities.list.row.status.no-live-evidence'),
            statusTone: 'neutral',
            monitorCount: '0',
            activeAlertCount: '0',
            identityCount: '1',
            relationCount: '0',
            owner: 'platform',
            updatedAt: 'now',
            href: '/entities/42',
            ownerHref: '/entities/42/edit',
            metricHref: '/ingestion/otlp/metrics?entityId=42',
            logHref: '/log/manage?entityId=42',
            traceHref: '/trace/manage?entityId=42'
          }
        ]}
        draft={{ search: '', type: '', status: '' }}
        total={1}
        rangeFrom={1}
        rangeTo={1}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={1}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-row-status-reason="evidence-lifecycle"');
    expect(html).toContain(t('entities.list.row.status.no-live-evidence'));
  });

  it('shows discovery candidate monitor context before a user binds an existing entity', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[
          {
            key: '42',
            name: 'Checkout Service',
            identityName: 'checkout-api',
            type: 'Service',
            environment: 'Local',
            status: 'Unknown',
            statusTone: 'neutral',
            monitorCount: '0',
            activeAlertCount: '0',
            identityCount: '1',
            relationCount: '0',
            owner: 'None',
            updatedAt: 'now',
            href: '/entities/42?source=discovery-candidate',
            ownerHref: '/entities/42/edit?source=discovery-candidate',
            metricHref: '/ingestion/otlp/metrics?entityId=42',
            logHref: '/log/manage?entityId=42',
            traceHref: '/trace/manage?entityId=42',
            discoveryCandidateMode: true
          }
        ]}
        draft={{
          search: 'website',
          type: '',
          status: '',
          source: 'discovery-candidate',
          returnTo: '/entities/discovery?search=checkout-http',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443'
        }}
        total={1}
        rangeFrom={1}
        rangeTo={1}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-discovery-candidate-context="monitor-candidate"');
    expect(html).toContain('data-entity-list-discovery-candidate-monitor="current-monitor"');
    expect(html).toContain('checkout-http');
    expect(html).toContain(t('entities.list.discovery-candidate.monitor-meta', { app: 'website', instance: 'example.com:443' }));
    expect(html).toContain(t('entities.list.discovery-candidate.copy'));
    expect(html).toContain('href="/entities/discovery?search=checkout-http"');
    expect(html).toContain('href="/monitors/632051474676992"');
    expect(html).toContain('data-entity-list-create-action="discovery-candidate-monitor-draft"');
    expect(html).toContain('data-entity-list-command-action="create"');
    expect(html).toContain('data-entity-list-command-action="bind-monitor"');
    expect(html).toContain(
      'href="/entities/new?source=discovery-candidate&amp;monitorId=632051474676992&amp;monitorName=checkout-http&amp;monitorApp=website&amp;monitorInstance=example.com%3A443&amp;returnTo=%2Fentities%3Fsearch%3Dwebsite%26source%3Ddiscovery-candidate%26returnTo%3D%252Fentities%252Fdiscovery%253Fsearch%253Dcheckout-http%26monitorId%3D632051474676992%26monitorName%3Dcheckout-http%26monitorApp%3Dwebsite%26monitorInstance%3Dexample.com%253A443"'
    );
    expect(html).toContain(t('entities.list.row.action.bind-monitor'));
    expect(html).toContain('data-entity-list-action-help="row-actions"');
    expect(html).not.toContain('data-entity-list-action-help="row-bind-monitor"');
    expect(html).not.toContain('data-entity-list-action-help="row-owner"');
  });

  it('turns discovery candidate empty search into a clear create-draft next step', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{
          search: 'example.com:443',
          type: '',
          status: '',
          source: 'discovery-candidate',
          returnTo: '/entities/discovery?search=checkout-http',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443'
        }}
        total={0}
        rangeFrom={0}
        rangeTo={0}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain(t('entities.list.empty.discovery-candidate.title'));
    expect(html).toContain(t('entities.list.empty.discovery-candidate.copy'));
    expect(html).toContain(t('entities.list.empty.discovery-candidate.action'));
    expect(html).toContain('data-entity-list-empty-create-action="discovery-candidate-monitor-draft"');
    expect(html).toContain('data-entity-list-command-action="create-entity-draft"');
    expect(html).toContain(
      'href="/entities/new?source=discovery-candidate&amp;monitorId=632051474676992&amp;monitorName=checkout-http&amp;monitorApp=website&amp;monitorInstance=example.com%3A443&amp;returnTo=%2Fentities%3Fsearch%3Dexample.com%253A443%26source%3Ddiscovery-candidate%26returnTo%3D%252Fentities%252Fdiscovery%253Fsearch%253Dcheckout-http%26monitorId%3D632051474676992%26monitorName%3Dcheckout-http%26monitorApp%3Dwebsite%26monitorInstance%3Dexample.com%253A443"'
    );
    expect(html).not.toContain(t('entities.list.empty.title'));
    expect(html).not.toContain(t('entities.list.empty.copy'));
  });

  it('explains filtered empty results without implying the object directory is empty', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: 'codex-no-entity-1575', type: '', status: '' }}
        total={0}
        rangeFrom={0}
        rangeTo={0}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-empty-mode="filtered"');
    expect(html).toContain('data-entity-list-empty-title="filtered"');
    expect(html).toContain('data-entity-list-empty-copy="filtered"');
    expect(html).toContain('data-entity-list-empty-filtered-actions="clear-refresh"');
    expect(html).toContain('data-entity-list-empty-filtered-clear="reset-filters"');
    expect(html).toContain('data-entity-list-empty-filtered-refresh="reload-results"');
    expect(html).toContain('data-entity-list-command-action="clear-filters"');
    expect(html).toContain('data-entity-list-command-action="refresh"');
    expect(html).toContain(t('entities.list.empty.filtered.title'));
    expect(html).toContain(t('entities.list.empty.filtered.copy'));
    expect(html).toContain(t('common.clear'));
    expect(html).toContain(t('common.refresh'));
    expect(html).not.toContain(t('entities.list.empty.title'));
    expect(html).not.toContain(t('entities.list.empty.copy'));
    expect(html).not.toContain('data-entity-list-empty-create-action="discovery-candidate-monitor-draft"');
    expect(html).not.toContain('data-entity-list-empty-actions="first-run-entity-paths"');
  });

  it('lets novice users recover from filtered empty results without leaving the entity table', async () => {
    const onRefresh = vi.fn();
    const onReset = vi.fn();

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <EntityListSurface
          t={t}
          rows={[]}
          draft={{ search: 'codex-no-entity-1729', type: 'service', status: 'unknown' }}
          total={0}
          rangeFrom={0}
          rangeTo={0}
          pageIndex={0}
          pageSize={8}
          abnormalCount={0}
          healthPendingCount={0}
          alertingCount={0}
          linkedCount={0}
          onDraftChange={() => undefined}
          onSearch={() => undefined}
          onRefresh={onRefresh}
          onReset={onReset}
          onPageIndexChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      );
      await Promise.resolve();
    });

    const clearAction = interactionContainer.querySelector(
      'button[data-entity-list-empty-filtered-clear="reset-filters"]'
    ) as HTMLButtonElement | null;
    const refreshAction = interactionContainer.querySelector(
      'button[data-entity-list-empty-filtered-refresh="reload-results"]'
    ) as HTMLButtonElement | null;

    expect(interactionContainer.querySelector('[data-entity-list-empty-mode="filtered"]')).not.toBeNull();
    expect(clearAction?.textContent).toContain(t('common.clear'));
    expect(refreshAction?.textContent).toContain(t('common.refresh'));

    await act(async () => {
      clearAction?.click();
      await Promise.resolve();
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();

    await act(async () => {
      refreshAction?.click();
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('gives first-time users direct empty-directory actions before any entity exists', () => {
    const html = renderToStaticMarkup(
      <EntityListSurface
        t={t}
        rows={[]}
        draft={{ search: '', type: '', status: '' }}
        total={0}
        rangeFrom={0}
        rangeTo={0}
        pageIndex={0}
        pageSize={8}
        abnormalCount={0}
        healthPendingCount={0}
        alertingCount={0}
        linkedCount={0}
        onDraftChange={() => undefined}
        onSearch={() => undefined}
        onRefresh={() => undefined}
        onReset={() => undefined}
        onPageIndexChange={() => undefined}
        onPageSizeChange={() => undefined}
      />
    );

    expect(html).toContain('data-entity-list-empty-mode="plain"');
    expect(html).toContain(t('entities.list.empty.title'));
    expect(html).toContain(t('entities.list.empty.copy'));
    expect(html).toContain('data-entity-list-empty-action="create"');
    expect(html).toContain('data-entity-list-empty-action="discovery"');
    expect(html).toContain('data-entity-list-empty-action="import"');
    expect(html).toContain('data-entity-list-command-action="create"');
    expect(html).toContain('data-entity-list-command-action="discovery"');
    expect(html).toContain('data-entity-list-command-action="import"');
    expect(html).toContain('href="/entities/new"');
    expect(html).toContain('href="/entities/discovery"');
    expect(html).toContain('href="/entities/import"');
    expect(html).toContain(t('entities.list.empty.action.create'));
    expect(html).toContain(t('entities.list.empty.action.discovery'));
    expect(html).toContain(t('entities.list.empty.action.import'));
  });
});
