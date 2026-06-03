// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertCenterSurface } from './alert-center-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ kicker, title, subtitle, facts, factsVariant, main, side }: any) => (
    <main data-workbench-page="true" data-has-side={side ? 'true' : 'false'}>
      <div data-kicker="true">{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-facts="true" data-facts-variant={factsVariant ?? 'grid'}>{facts.map((fact: any) => `${fact.label}:${fact.value}`).join('|')}</div>
      <div data-main="true">{main}</div>
      {side ? <aside data-side="true">{side}</aside> : null}
    </main>
  )
}));

vi.mock('../observability', () => ({
  CodePane: ({ children }: any) => <pre>{children}</pre>,
  ObservabilityStatGrid: ({ items }: any) => <div data-observability-stat-grid="pills">{items.map((item: any) => item.label).join('|')}</div>,
  SelectableEvidenceList: ({ rows }: any) => <div data-evidence-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  ToolbarField: ({ label, children }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToolbarRow: ({ children, ...props }: any) => <div data-toolbar-row="true" {...props}>{children}</div>
}));

vi.mock('../workbench/primitives', () => ({
  SurfaceSection: ({ title, children }: any) => (
    <section data-panel="true">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  RailSection: ({ title, children }: any) => (
    <section data-rail="true">
      <h3>{title}</h3>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
  WorkbenchToolbarAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  WorkbenchValuePill: ({ children }: any) => <span data-value-pill="true">{children}</span>
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('../../lib/format', () => ({
  formatTime: () => '2026-04-19 20:00:00'
}));

describe('AlertCenterSurface', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;
  const t = createTranslatorMock();
  const zh = createTranslatorMock({ locale: 'zh-CN' });
  const summary = {
    total: 3,
    dealNum: 1,
    rate: 33,
    priorityWarningNum: 1,
    priorityCriticalNum: 1,
    priorityEmergencyNum: 0
  };
  const groupAlerts = {
    content: [
      {
        id: 7,
        status: 'firing',
        groupLabels: { service: 'checkout', severity: 'critical' },
        alerts: [
          {
            id: 701,
            content: 'CPU high',
            fingerprint: 'fp-1',
            creator: 'ops',
            labels: { service: 'checkout', severity: 'critical', alertname: 'HighCPU' },
            annotations: { summary: 'CPU has been high for two intervals' },
            status: 'firing',
            triggerTimes: 2,
            gmtUpdate: 1713200000000,
            gmtCreate: 1713190000000,
            startAt: 1713190000000,
            activeAt: 1713200000000
          }
        ],
        gmtUpdate: 1713200000000
      }
    ],
    totalElements: 1,
    pageIndex: 0,
    pageSize: 8
  };

  const renderSurface = (
    props: Partial<React.ComponentProps<typeof AlertCenterSurface>> = {},
    translator = zh
  ) => renderToStaticMarkup(
    <AlertCenterSurface
      t={translator}
      data={{ summary, groupAlerts } as any}
      draft={{ search: '', status: '', severity: '' }}
      onDraftChange={vi.fn()}
      onRefresh={vi.fn()}
      onClearFilters={vi.fn()}
      {...props}
    />
  );

  afterEach(() => {
    if (interactionRoot) {
      act(() => {
        interactionRoot?.unmount();
      });
    }
    interactionContainer?.remove();
    interactionRoot = null;
    interactionContainer = null;
  });

  it('renders the OTLP cold-matte alert-center zh-CN header and single query contract', () => {
    const html = renderSurface();

    expect(html).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(html).toContain('data-alert-center-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-center-sse-contract="angular-alert-event-refresh"');
    expect(html).toContain('data-alert-center-sse-event-count="0"');
    expect(html).toContain('data-alert-center-sse-highlight="angular-new-alert"');
    expect(html).toContain('data-alert-center-sse-highlight-ids=""');
    expect(html).toContain('data-alert-center-header="cold-compact-header"');
    expect(html).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-center-facts-strip="angular-platform-facts-strip"');
    expect(html).toContain('data-alert-center-facts-strip-owner="hertzbeat-ui-stat-strip"');
    expect(html).toContain('data-alert-center-fact="total"');
    expect(html).toContain('data-alert-center-fact="firing"');
    expect(html).toContain('data-alert-center-fact="acknowledged"');
    expect(html).toContain('data-alert-center-fact="resolved"');
    expect(html).toContain('data-alert-center-fact-owner="hertzbeat-ui-stat-cell"');
    expect(html).toContain('data-alert-center-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(html).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(html).not.toContain('data-alert-center-summary-rail=');
    expect(html).toContain(zh('alert.workbench.kicker'));
    expect(html).toContain(zh('alert.workbench.title'));
    expect(html).toContain(zh('alert.workbench.copy'));
    expect(html).toContain(zh('alert.workbench.firing'));
    expect(html).toContain(zh('alert.workbench.acknowledged'));
    expect(html).toContain(zh('alert.workbench.resolved'));
    expect(html).toContain(zh('alert.center.search'));
    expect(html).toContain(zh('alert.center.filter-status'));
    expect(html).toContain(zh('entity.response.context.severity'));
    expect((html.match(new RegExp(`>${zh('alert.workbench.action.refresh')}<`, 'g')) ?? []).length).toBe(1);
    expect(html).not.toContain('alert.center.kicker');
    expect(html).not.toContain('alert.center.title');
    expect(html).not.toContain('Alert Center');
    expect(html).not.toContain('SESSION');
    expect(html).not.toContain('Restoring');
  });

  it('renders a cold dense empty state instead of the old inline state', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any
    });

    expect(html).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(html).toContain('data-alert-center-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-center-empty-icon="cold-empty-box"');
    expect(html).toContain(zh('alert.workbench.empty.title'));
    expect(html).toContain(zh('alert.workbench.empty.copy'));
    expect(html).not.toContain('data-alert-center-empty-action="refresh"');
    expect(html).not.toContain('alert.center.empty.action');
    expect(html).not.toContain('data-alert-center-empty-state="angular-inline"');
    expect(html).not.toContain('alert.center.empty.title');
    expect(html).not.toContain('alert.center.empty.copy');
  });

  it('drops the WorkbenchPage and single-panel contract for the shared cold visual owner', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any
    });
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-alert-center-workbench-panel="angular-single-panel"');
    expect(html).not.toContain('data-alert-center-workbench-body="angular-list-region"');
    expect(html).not.toContain('data-alert-center-toolbar="angular-density"');
    expect(html).not.toContain('data-observability-stat-grid="pills"');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-alert-center-admin-layout="full-width-admin-list"');
    expect(source).not.toContain('data-alert-center-summary-rail');
    expect(source).not.toContain('coldCenterVisual.layout.heroGrid');
    expect(source).not.toContain('coldCenterVisual.layout.railGrid');
    expect(source).not.toContain('coldCenterVisual.signal.band');
    expect(source).not.toContain('coldCenterVisual.panel.rail');
    expect(source).not.toContain("from '../workbench/workbench-page'");
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('AlertSurfaceEmptyState');
    expect(source).not.toContain('ToolbarRow');
  });

  it('uses the cold compact toolbar density with low-radius controls and no stacked field labels', () => {
    const html = renderSurface({
      draft: { search: 'checkout', status: 'acknowledged', severity: 'warning' }
    });
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-center-search-row="shared-compact"');
    expect(html).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-filter-slot="inline-before-submit"');
    expect(html).toContain('data-alert-center-query-filters="inline-before-submit"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-center-select="status"');
    expect(html).toContain('data-alert-center-select="severity"');
    expect(html).toContain('data-alert-center-clear-filters="true"');
    expect(html.indexOf('data-cold-search-input="fixed-width-direct"')).toBeLessThan(
      html.indexOf('data-alert-center-select="status"')
    );
    expect(html.indexOf('data-alert-center-select="severity"')).toBeLessThan(
      html.indexOf('data-cold-search-action="submit"')
    );
    expect(html).not.toContain('data-alert-center-refresh-slot="right"');
    expect(html).not.toContain(`<span>${zh('alert.center.search')}</span>`);
    expect(html).not.toContain(`<span>${zh('alert.center.filter-status')}</span>`);
    expect(html).not.toContain(`<span>${zh('entity.response.context.severity')}</span>`);
    expect(source).toContain('rounded-[4px]');
    expect(source).toContain('rounded-[3px]');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).not.toContain('data-alert-center-search-field="cold-leading-icon"');
    expect(source).not.toContain('coldCenterVisual.search.input');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('min-h-[596px]');
  });

  it('renders Angular-style alert center pagination through the shared HzPaginationBar owner', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          ...groupAlerts,
          totalElements: 31,
          pageIndex: 1,
          pageSize: 8
        }
      } as any,
      draft: { search: 'checkout', status: 'firing', severity: 'critical', pageIndex: 1, pageSize: 8 }
    }, zh);
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).toContain('data-alert-center-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-center-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-center-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-center-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain(zh('alert.center.pagination.summary', { page: 2, totalPages: 4, from: 9, to: 9, total: 31 }));
    expect(html).toContain(zh('alert.center.pagination.page-size'));
    expect(html).toContain(zh('alert.center.pagination.page'));
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('data-alert-center-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('onPageIndexChange?.(Math.max(currentPageIndex - 1, 0))');
    expect(source).toContain('onPageSizeChange?.(Number.parseInt(value, 10))');
  });

  it('marks SSE-refreshed alert groups with the Angular new-alert highlight contract', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          ...groupAlerts,
          totalElements: 2,
          content: [
            groupAlerts.content[0],
            { ...groupAlerts.content[0], id: 8, groupLabels: { service: 'cart', severity: 'warning' } }
          ]
        }
      } as any,
      realtimeEventCount: 2,
      realtimeGroupIds: [7]
    }, zh);

    expect(html).toContain('data-alert-center-sse-event-count="2"');
    expect(html).toContain('data-alert-center-sse-highlight-ids="7"');
    expect(html).toContain('data-alert-group-card="7"');
    expect(html).toContain('data-alert-group-realtime-state="new"');
    expect(html).toContain('data-alert-group-realtime-owner="angular-new-alert"');
    expect(html).toContain('border-l-[3px]');
    expect(html).toContain('data-alert-group-card="8"');
    expect(html).not.toContain('data-alert-group-card="8" data-alert-group-realtime-state="new"');
  });

  it('hides the clear-filters action when no filters are active', () => {
    const html = renderSurface({}, t);

    expect((html.match(/>Refresh</g) ?? []).length).toBe(1);
    expect(html).not.toContain('Clear Filters');
    expect(html).not.toContain('data-alert-center-clear-filters="true"');
  });

  it('fires alert center pagination callbacks without replacing the query toolbar contract', async () => {
    const onPageIndexChange = vi.fn();
    const onPageSizeChange = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{
            summary,
            groupAlerts: {
              ...groupAlerts,
              totalElements: 31,
              pageIndex: 1,
              pageSize: 8
            }
          } as any}
          draft={{ search: 'checkout', status: 'firing', severity: 'critical', pageIndex: 1, pageSize: 8 }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onPageIndexChange={onPageIndexChange}
          onPageSizeChange={onPageSizeChange}
        />
      );
      await Promise.resolve();
    });

    const pageJump = interactionContainer.querySelector(
      'input[data-alert-center-pagination-page-jump-owner="hertzbeat-ui-input"]'
    ) as HTMLInputElement | null;
    const pageSize = interactionContainer.querySelector('[data-alert-center-pagination-page-size-owner="hertzbeat-ui-select"]');
    const next = interactionContainer.querySelector('button[data-hz-pagination-action="next"]') as HTMLButtonElement | null;
    const toolbar = interactionContainer.querySelector('[data-alert-center-query-toolbar="single-query-form"]');

    expect(pageJump?.getAttribute('data-hz-pagination-action')).toBe('page-jump');
    expect(pageSize).not.toBeNull();
    expect(toolbar).not.toBeNull();

    await act(async () => {
      pageJump?.dispatchEvent(new Event('change', { bubbles: true }));
      pageJump!.value = '3';
      pageJump?.dispatchEvent(new Event('input', { bubbles: true }));
      next?.click();
    });

    expect(onPageIndexChange).toHaveBeenCalledWith(2);
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('renders the entity-context batch selection toolbar with shared UI owners', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [
            groupAlerts.content[0],
            { ...groupAlerts.content[0], id: 8, status: 'acknowledged', groupLabels: { service: 'cart', severity: 'warning' } },
            { ...groupAlerts.content[0], id: 9, status: 'resolved', groupLabels: { service: 'payment', severity: 'info' } }
          ],
          totalElements: 3,
          pageIndex: 0,
          pageSize: 8
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42'
      },
      selectedGroupIds: [7, 8]
    }, zh);
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).toContain('data-alert-center-entity-batch="angular-selected-groups"');
    expect(html).toContain('data-alert-center-entity-batch-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-alert-center-delete-page-clamp="angular-update-page-index"');
    expect(html).toContain('data-alert-center-delete-page-clamp-owner="route-state-contract"');
    expect(html).toContain('data-alert-center-rule-create-feedback="angular-new-notify"');
    expect(html).toContain('data-alert-center-rule-create-feedback-owner="route-state-contract"');
    expect(html).toContain('data-alert-center-rule-selection-count="angular-group-count"');
    expect(html).toContain('data-alert-center-rule-selection-count-owner="route-state-contract"');
    expect(html).toContain('data-alert-center-inhibit-defaults="angular-drop-severity-equal-allowlist"');
    expect(html).toContain('data-alert-center-inhibit-defaults-owner="route-state-contract"');
    expect(html).toContain('data-alert-center-batch-confirm="angular-status-confirm"');
    expect(html).toContain('data-alert-center-batch-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-alert-center-row-delete-confirm="angular-single-delete-confirm"');
    expect(html).toContain('data-alert-center-row-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-alert-center-batch-select-page="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-center-batch-toolbar="selected-entity-alerts"');
    expect(html).toContain('data-hz-ui="batch-toolbar"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-alert-center-group-select="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-center-batch-action="acknowledge-selected"');
    expect(html).toContain('data-alert-center-batch-action="unacknowledge-selected"');
    expect(html).toContain('data-alert-center-batch-action="resolve-selected"');
    expect(html).toContain('data-alert-center-batch-action="reopen-selected"');
    expect(html).toContain('data-alert-center-batch-action="silence-selected"');
    expect(html).toContain('data-alert-center-batch-action="inhibit-selected"');
    expect(html).toContain('data-alert-center-batch-dialog-source="selected-groups"');
    expect(html).toContain('data-hz-batch-selection-count="2"');
    expect(html).toContain(zh('alert.center.batch.selection-label'));
    expect(html).toContain(zh('alert.center.batch.acknowledge-selected', { count: 1 }));
    expect(html).toContain(zh('alert.center.batch.unacknowledge-selected', { count: 1 }));
    expect(html).toContain(zh('alert.center.batch.resolve-selected', { count: 1 }));
    expect(html).toContain(zh('alert.center.batch.silence-selected', { count: 2 }));
    expect(html).toContain(zh('alert.center.batch.inhibit-selected', { count: 2 }));
    expect(source).toContain('HzBatchToolbar');
    expect(source).toContain('HzCheckbox');
    expect(source).toContain('SELECTED_BATCH_DIALOG_GROUP_KEY');
    expect(source).toContain('buildSelectedBatchRuleGroup');
    expect(source).toContain('data-alert-center-entity-batch-owner="hertzbeat-ui-batch-toolbar"');
  });

  it('prefills selected alert silence and inhibit dialogs from shared group labels', () => {
    const data = {
      summary,
      groupAlerts: {
        content: [
          groupAlerts.content[0],
          { ...groupAlerts.content[0], id: 8, groupLabels: { service: 'checkout', severity: 'warning' } }
        ],
        totalElements: 2,
        pageIndex: 0,
        pageSize: 8
      }
    } as any;
    const silenceHtml = renderSurface({
      data,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42'
      },
      selectedGroupIds: [7, 8],
      initialDialogState: { groupKey: '__selected_batch__', mode: 'silence' },
      onRuleQuickCreate: vi.fn(async () => undefined)
    }, zh);
    const inhibitHtml = renderSurface({
      data,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42'
      },
      selectedGroupIds: [7, 8],
      initialDialogState: { groupKey: '__selected_batch__', mode: 'inhibit' },
      onRuleQuickCreate: vi.fn(async () => undefined)
    }, zh);

    expect(silenceHtml).toContain('data-alert-rule-dialog="silence"');
    expect(silenceHtml).toContain('data-alert-rule-dialog-submit="silence"');
    expect(silenceHtml).toContain('data-alert-rule-dialog-submit-owner="alert-center-quick-dialog"');
    expect(silenceHtml).toContain(zh('entity.alert.workbench.silence.selection', { count: 2 }));
    expect(silenceHtml).toContain('service:checkout');
    expect(silenceHtml).toContain('name="silence_labels" value="service:checkout"');
    expect(inhibitHtml).toContain('data-alert-rule-dialog="inhibit"');
    expect(inhibitHtml).toContain('data-alert-rule-dialog-submit="inhibit"');
    expect(inhibitHtml).toContain('data-alert-rule-dialog-submit-owner="alert-center-quick-dialog"');
    expect(inhibitHtml).toContain(zh('entity.alert.workbench.inhibit.selection', { count: 2 }));
    expect(inhibitHtml).toContain('service:checkout');
    expect(inhibitHtml).toContain('name="inhibit_source_labels" value="service:checkout"');
    expect(inhibitHtml).toContain('name="inhibit_target_labels" value="service:checkout"');
    expect(inhibitHtml).toContain('name="inhibit_equal_labels" value="service"');
  });

  it('updates selected entity alert groups and fires status-scoped batch operations', async () => {
    const onSelectedGroupIdsChange = vi.fn();
    const onClosureAction = vi.fn();
    const onRuleQuickCreate = vi.fn(async () => undefined);
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{
            summary,
            groupAlerts: {
              content: [
                groupAlerts.content[0],
                { ...groupAlerts.content[0], id: 8, status: 'acknowledged', groupLabels: { service: 'cart', severity: 'warning' } },
                { ...groupAlerts.content[0], id: 9, status: 'resolved', groupLabels: { service: 'payment', severity: 'info' } }
              ],
              totalElements: 3,
              pageIndex: 0,
              pageSize: 8
            }
          } as any}
          draft={{
            search: '',
            status: 'firing',
            severity: '',
            entityId: '42',
            entityName: 'Checkout API',
            returnTo: '/entities/42'
          }}
          selectedGroupIds={[7, 8, 9]}
          onSelectedGroupIdsChange={onSelectedGroupIdsChange}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
          onRuleQuickCreate={onRuleQuickCreate}
        />
      );
      await Promise.resolve();
    });

    const selectPage = interactionContainer.querySelector(
      'input[data-alert-center-batch-select-page="hertzbeat-ui-checkbox"]'
    ) as HTMLInputElement | null;
    const selectGroup = interactionContainer.querySelector(
      'input[data-alert-center-group-select-id="7"]'
    ) as HTMLInputElement | null;
    const acknowledge = interactionContainer.querySelector(
      'button[data-alert-center-batch-action="acknowledge-selected"]'
    ) as HTMLButtonElement | null;
    const unacknowledge = interactionContainer.querySelector(
      'button[data-alert-center-batch-action="unacknowledge-selected"]'
    ) as HTMLButtonElement | null;
    const resolve = interactionContainer.querySelector(
      'button[data-alert-center-batch-action="resolve-selected"]'
    ) as HTMLButtonElement | null;
    const reopen = interactionContainer.querySelector('button[data-alert-center-batch-action="reopen-selected"]') as HTMLButtonElement | null;
    const silence = interactionContainer.querySelector('button[data-alert-center-batch-action="silence-selected"]') as HTMLButtonElement | null;
    const inhibit = interactionContainer.querySelector('button[data-alert-center-batch-action="inhibit-selected"]') as HTMLButtonElement | null;

    expect(selectPage).not.toBeNull();
    expect(selectGroup).not.toBeNull();
    expect(acknowledge).not.toBeNull();
    expect(unacknowledge).not.toBeNull();
    expect(resolve).not.toBeNull();
    expect(reopen).not.toBeNull();
    expect(silence).not.toBeNull();
    expect(inhibit).not.toBeNull();

    await act(async () => {
      selectPage?.click();
      selectGroup?.click();
      acknowledge?.click();
    });

    expect(onClosureAction).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm="angular-status-confirm"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm-action="acknowledge"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm-count="1"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain(zh('entity.alert.workbench.confirm.acknowledge-selected'));

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-center-batch-status-confirm-ok="angular-status-confirm"]'
      ) as HTMLButtonElement | null)?.click();
    });

    await act(async () => {
      unacknowledge?.click();
    });
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm-action="unacknowledge"]')).not.toBeNull();

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-center-batch-status-confirm-ok="angular-status-confirm"]'
      ) as HTMLButtonElement | null)?.click();
    });

    await act(async () => {
      resolve?.click();
    });
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm-action="resolve"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain(zh('alert.center.confirm.mark-done-batch'));

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-center-batch-status-confirm-ok="angular-status-confirm"]'
      ) as HTMLButtonElement | null)?.click();
    });

    await act(async () => {
      reopen?.click();
    });
    expect(interactionContainer.querySelector('[data-alert-center-batch-status-confirm-action="reopen"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain(zh('alert.center.confirm.mark-no-batch'));

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-center-batch-status-confirm-ok="angular-status-confirm"]'
      ) as HTMLButtonElement | null)?.click();
    });

    await act(async () => {
      silence?.click();
    });

    expect(onSelectedGroupIdsChange).toHaveBeenNthCalledWith(1, []);
    expect(onSelectedGroupIdsChange).toHaveBeenNthCalledWith(2, [8, 9]);
    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'acknowledge', [7]);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'unacknowledge', [8]);
    expect(onClosureAction).toHaveBeenNthCalledWith(3, 'resolve', [7]);
    expect(onClosureAction).toHaveBeenNthCalledWith(4, 'reopen', [9]);
    expect(interactionContainer.querySelector('[data-alert-rule-dialog="silence"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-rule-dialog-submit="silence"]')).not.toBeNull();
  });

  it('submits selected alert quick-rule drafts through the alert center create callback', async () => {
    const onRuleQuickCreate = vi.fn(async () => undefined);
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{
            summary,
            groupAlerts: {
              content: [
                groupAlerts.content[0],
                { ...groupAlerts.content[0], id: 8, groupLabels: { service: 'checkout', severity: 'warning' } }
              ],
              totalElements: 2,
              pageIndex: 0,
              pageSize: 8
            }
          } as any}
          draft={{
            search: '',
            status: 'firing',
            severity: '',
            entityId: '42',
            entityName: 'Checkout API',
            returnTo: '/entities/42'
          }}
          selectedGroupIds={[7, 8]}
          onSelectedGroupIdsChange={vi.fn()}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={vi.fn()}
          onRuleQuickCreate={onRuleQuickCreate}
        />
      );
      await Promise.resolve();
    });

    const silence = interactionContainer.querySelector(
      'button[data-alert-center-batch-action="silence-selected"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      silence?.click();
      await Promise.resolve();
    });

    const silenceSubmit = interactionContainer.querySelector(
      'button[data-alert-rule-dialog-submit="silence"]'
    ) as HTMLButtonElement | null;
    const silenceName = interactionContainer.querySelector('input[name="silence_name"]') as HTMLInputElement | null;

    expect(silenceSubmit).not.toBeNull();
    expect(silenceName?.value).toBe('Checkout API silence');

    await act(async () => {
      silenceSubmit?.click();
      await Promise.resolve();
    });

    expect(onRuleQuickCreate).toHaveBeenCalledWith(
      'silence',
      expect.objectContaining({
        name: 'Checkout API silence',
        labelsText: 'service:checkout'
      }),
      2
    );
    expect(interactionContainer.querySelector('[data-alert-rule-dialog="silence"]')).toBeNull();

    const inhibit = interactionContainer.querySelector(
      'button[data-alert-center-batch-action="inhibit-selected"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      inhibit?.click();
      await Promise.resolve();
    });

    const inhibitSubmit = interactionContainer.querySelector(
      'button[data-alert-rule-dialog-submit="inhibit"]'
    ) as HTMLButtonElement | null;
    const inhibitName = interactionContainer.querySelector('input[name="inhibit_name"]') as HTMLInputElement | null;

    expect(inhibitSubmit).not.toBeNull();
    expect(inhibitName?.value).toBe('Checkout API inhibit');

    await act(async () => {
      inhibitSubmit?.click();
      await Promise.resolve();
    });

    expect(onRuleQuickCreate).toHaveBeenLastCalledWith(
      'inhibit',
      expect.objectContaining({
        name: 'Checkout API inhibit',
        sourceLabelsText: 'service:checkout',
        targetLabelsText: 'service:checkout',
        equalLabelsText: 'service'
      }),
      2
    );
  });

  it('blocks invalid quick-rule drafts before invoking the create callback', async () => {
    const onRuleQuickCreate = vi.fn(async () => undefined);
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{
            search: '',
            status: 'firing',
            severity: '',
            entityId: '42',
            entityName: 'Checkout API',
            returnTo: '/entities/42'
          }}
          initialDialogState={{ groupKey: '7', mode: 'silence' }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={vi.fn()}
          onRuleQuickCreate={onRuleQuickCreate}
        />
      );
      await Promise.resolve();
    });

    const nameInput = interactionContainer.querySelector('input[name="silence_name"]') as HTMLInputElement | null;
    const submit = interactionContainer.querySelector('button[data-alert-rule-dialog-submit="silence"]') as HTMLButtonElement | null;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    await act(async () => {
      valueSetter?.call(nameInput, '');
      nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
      submit?.click();
      await Promise.resolve();
    });

    expect(onRuleQuickCreate).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-rule-dialog="silence"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-rule-submit-error="true"]')?.textContent).toContain(
      zh('alert.silence.validation.name')
    );
  });

  it('renders cold entity context and noise-control summary shells', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts,
        noiseControlSummary: {
          activeSilenceCount: 1,
          matchingInhibitCount: 2,
          possibleAlertSuppression: true,
          activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
          matchingInhibits: [{ id: 22, name: 'inhibit-1', type: 'inhibit' }]
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      }
    }, t);

    expect(html).toContain('data-alert-entity-context="cold-context-panel"');
    expect(html).toContain('data-alert-noise-controls="cold-noise-panel"');
    expect(html).toContain('Reviewing this entity');
    expect(html).toContain('Checkout API');
    expect(html).toContain('Back to entity');
    expect(html).toContain('Silence and inhibit rules');
    expect(html).toContain('Open matching silence rules');
    expect(html).toContain('Open matching inhibit rules');
  });

  it('marks create-capable noise-control action labels when possible suppression has no matching rules', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts,
        noiseControlSummary: {
          activeSilenceCount: 0,
          matchingInhibitCount: 0,
          possibleAlertSuppression: true,
          activeSilences: [],
          matchingInhibits: []
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      }
    }, t);

    expect(html).toContain('data-alert-noise-control-action="silence"');
    expect(html).toContain('data-alert-noise-control-action="inhibit"');
    expect(html).toContain('data-alert-noise-control-action-label="angular-view-or-create"');
    expect(html).toContain('View or create silence rules');
    expect(html).toContain('View or create inhibit rules');
  });

  it('appends Angular response-result params to the entity return link after operations', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42?tab=alerts#noise'
      },
      entityResponseResult: { action: 'silence', count: 2 }
    }, zh);
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).toContain('data-alert-entity-context="cold-context-panel"');
    expect(html).toContain(
      'href="/entities/42?tab=alerts&amp;responseResultKind=alerts&amp;responseResultAction=silence&amp;responseResultCount=2#noise"'
    );
    expect(source).toContain('buildEntityReturnHrefWithResponseResult');
    expect(source).toContain("params.set('responseResultKind', 'alerts')");
    expect(source).toContain("params.set('responseResultAction', result.action)");
    expect(source).toContain("params.set('responseResultCount', String(result.count))");
  });

  it('renders topology alert-impact context with the selected edge and return path', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const html = renderSurface({
      draft: {
        search: 'checkout-api',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db',
        returnTo: `${returnTo}&returnLabel=${encodeURIComponent('HertzBeat enterprise topology')}`,
        returnLabel: 'HertzBeat enterprise topology'
      }
    }, zh);

    expect(html).toContain('data-alert-topology-context="impact-filter-panel"');
    expect(html).toContain(zh('alert.center.topology.context.kicker'));
    expect(html).toContain('checkout-api');
    expect(html).toContain(zh('topology.view.resource-dependency.label'));
    expect(html).toContain('resource-dependency');
    expect(html).toContain(zh('alert.center.topology.source.database-middleware-connection'));
    expect(html).toContain('svc-checkout--res-orders-db');
    expect(html).toContain('data-alert-topology-return="true"');
    expect(html).toContain('href="/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain('returnLabel');
    expect(html).not.toContain('HertzBeat enterprise topology');
  });

  it('renders unknown topology source kind as a localized fallback while preserving the route slug', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout-api',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        viewMode: 'alert-impact',
        sourceKind: 'custom-edge-source',
        returnTo: '/topology?sourceKind=custom-edge-source'
      }
    }, zh);

    expect(html).toContain(zh('alert.center.topology.source.unknown', { sourceKind: 'custom-edge-source' }));
    expect(html).toContain('data-alert-topology-source-kind="custom-edge-source"');
    expect(html).toContain('href="/topology?sourceKind=custom-edge-source"');
    expect(html).not.toContain('>custom-edge-source</span>');
  });

  it('renders unknown topology view mode as a localized fallback while preserving the route slug', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout-api',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        viewMode: 'custom-impact-view',
        sourceKind: 'alert-impact',
        returnTo: '/topology?viewMode=custom-impact-view'
      }
    }, zh);

    expect(html).toContain(zh('alert.center.topology.view-mode.unknown', { viewMode: 'custom-impact-view' }));
    expect(html).toContain('data-alert-topology-view-mode="custom-impact-view"');
    expect(html).toContain('href="/topology?viewMode=custom-impact-view"');
    expect(html).not.toContain('>custom-impact-view</span>');
  });

  it('renders the OTLP alert evidence closure panel with signal evidence and operation entries', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        signal: 'traces',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/topology?viewMode=resource-dependency&edgeId=svc-checkout--orders-db'
      }
    }, zh);

    expect(html).toContain('data-alert-evidence-closure="otlp-alert-evidence-workbench"');
    expect(html).toContain(zh('alert.center.evidence.closure.kicker'));
    expect(html).toContain(zh('alert.center.evidence.closure.copy'));
    expect(html).toContain('data-alert-closure-summary="evidence-and-actions"');
    expect(html).toContain('data-alert-evidence-summary="entity,metrics,logs,traces,topology"');
    expect(html).toContain('data-alert-operation-summary="acknowledge,recover,threshold,notice,group,silence,inhibit,automation,close"');
    expect(html).toContain(zh('alert.center.evidence.closure.summary.evidence'));
    expect(html).toContain([
      zh('alert.center.evidence.entity.title'),
      zh('alert.center.evidence.metrics.title'),
      zh('alert.center.evidence.logs.title'),
      zh('alert.center.evidence.traces.title'),
      zh('alert.center.evidence.topology.title')
    ].join(' / '));
    expect(html).toContain(zh('alert.center.evidence.closure.summary.operations'));
    expect(html).toContain([
      zh('alert.center.operation.acknowledge.label'),
      zh('alert.center.operation.recover.label'),
      zh('alert.center.operation.threshold.label'),
      zh('alert.center.operation.notice.label'),
      zh('alert.center.operation.group.label'),
      zh('alert.center.operation.silence.label'),
      zh('alert.center.operation.inhibit.label'),
      zh('alert.center.operation.automation.label'),
      zh('alert.center.operation.close.label')
    ].join(' / '));
    expect(html).toContain('data-alert-evidence-link="entity"');
    expect(html).toContain('data-alert-evidence-link="metrics"');
    expect(html).toContain('data-alert-evidence-link="logs"');
    expect(html).toContain('data-alert-evidence-link="traces"');
    expect(html).toContain('data-alert-evidence-link="topology"');
    expect(html).toContain('/entities/42?');
    expect(html).toContain('/ingestion/otlp/metrics?');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('/topology?viewMode=resource-dependency');
    expect(html).toContain('data-alert-closure-action="acknowledge"');
    expect(html).toContain('data-alert-closure-action="recover"');
    expect(html).toContain('data-alert-closure-action="threshold"');
    expect(html).toContain('data-alert-closure-action="notice"');
    expect(html).toContain('data-alert-closure-action="group"');
    expect(html).toContain('data-alert-closure-action="silence"');
    expect(html).toContain('data-alert-closure-action="inhibit"');
    expect(html).toContain('data-alert-closure-action="automation"');
    expect(html).toContain('data-alert-closure-action="close"');
    expect(html).toContain(zh('alert.center.operation.acknowledge.label'));
    expect(html).toContain(zh('alert.center.operation.recover.label'));
    expect(html).toContain(zh('alert.center.operation.threshold.label'));
    expect(html).toContain(zh('alert.center.operation.notice.label'));
    expect(html).toContain(zh('alert.center.operation.group.label'));
    expect(html).toContain(zh('alert.center.operation.silence.label'));
    expect(html).toContain(zh('alert.center.operation.inhibit.label'));
    expect(html).toContain(zh('alert.center.operation.automation.label'));
    expect(html).toContain('/actions?');
    expect(html).toContain('alertGroupId=7');
    expect(html).toContain(zh('alert.center.operation.close.label'));
  });

  it('renders inherited time and monitor context inside the existing alert evidence panel', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        timeRange: 'last-45m',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        source: 'monitor',
        signal: 'metrics',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443',
        returnTo: '/monitors/632051474676992'
      }
    }, zh);

    expect(html).toContain('data-alert-evidence-closure="otlp-alert-evidence-workbench"');
    expect(html).toContain('data-alert-evidence-context="inherited-time-context"');
    expect(html).toContain('data-alert-evidence-context-row="time"');
    expect(html).toContain(zh('alert.center.context.time.title'));
    expect(html).toContain('last-45m');
    expect(html).toContain(`2024/04/16 00:53:20 → 2024/04/16 01:38:20 · ${zh('alert.center.context.time.paused')} · Asia/Shanghai`);
    expect(html).toContain('data-alert-evidence-context-row="monitor"');
    expect(html).toContain(zh('alert.center.context.monitor.title'));
    expect(html).toContain('checkout-http');
    expect(html).toContain(`website · example.com:443 · ${zh('alert.center.context.monitor.id-meta', { monitorId: '632051474676992' })}`);
    expect(html).toContain('data-alert-evidence-context-row="source"');
    expect(html).toContain(zh('alert.center.context.source.title'));
    expect(html).toContain(zh('alert.center.context.source.monitor.copy'));
    expect(html).toContain(zh('alert.center.context.source.monitor.meta'));
    expect(html).not.toContain(zh('topology.legend.health.healthy'));
    expect(html).not.toContain('0 evidence');
    expect(html).not.toContain('fake');
  });

  it('renders operator feedback after an alert closure operation succeeds or fails', () => {
    const successHtml = renderSurface({
      operationFeedback: {
        tone: 'success',
        copy: zh('alert.center.operation.success')
      }
    }, zh);
    const failedHtml = renderSurface({
      operationFeedback: {
        tone: 'danger',
        copy: zh('alert.center.operation.failed', { reason: 'retry later' })
      }
    }, zh);

    expect(successHtml).toContain('data-alert-operation-feedback="success"');
    expect(successHtml).toContain('aria-live="polite"');
    expect(successHtml).toContain(zh('alert.center.operation.success'));
    expect(failedHtml).toContain('data-alert-operation-feedback="danger"');
    expect(failedHtml).toContain(zh('alert.center.operation.failed', { reason: 'retry later' }));
  });

  it('explains disabled direct closure actions with localized title and aria labels', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        source: 'alert',
        timeRange: 'last-1h'
      }
    }, zh);

    expect(html).toContain('data-alert-closure-action-disabled="missing-alert-group-id"');
    expect(html).toContain(`title="${zh('alert.center.closure-action.disabled.no-group')}"`);
    expect(html).toContain(`aria-label="${zh('alert.center.operation.acknowledge.label')}：${zh('alert.center.closure-action.disabled.no-group')}"`);
    expect(html).toContain(`aria-label="${zh('alert.center.operation.recover.label')}：${zh('alert.center.closure-action.disabled.no-group')}"`);
    expect(html).toContain(`aria-label="${zh('alert.center.operation.close.label')}：${zh('alert.center.closure-action.disabled.no-group')}"`);
    expect(html).not.toContain('missing-alert-group-id ');
  });

  it('fires direct closure operation buttons with the primary group id while keeping silence and inhibit as rule links', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{
            search: 'checkout',
            status: 'firing',
            severity: 'critical',
            entityId: '42',
            entityName: 'Checkout API',
            serviceName: 'checkout',
            source: 'otlp',
            signal: 'traces',
            traceId: 'trace-123',
            spanId: 'span-456',
            collector: 'edge-collector-a',
            template: 'java-service',
            returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
          }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const acknowledge = interactionContainer.querySelector(
      'button[data-alert-closure-action="acknowledge"]'
    ) as HTMLButtonElement | null;
    const recover = interactionContainer.querySelector('button[data-alert-closure-action="recover"]') as HTMLButtonElement | null;
    const close = interactionContainer.querySelector('button[data-alert-closure-action="close"]') as HTMLButtonElement | null;
    const threshold = interactionContainer.querySelector('a[data-alert-closure-action="threshold"]') as HTMLAnchorElement | null;
    const notice = interactionContainer.querySelector('a[data-alert-closure-action="notice"]') as HTMLAnchorElement | null;
    const group = interactionContainer.querySelector('a[data-alert-closure-action="group"]') as HTMLAnchorElement | null;
    const silence = interactionContainer.querySelector('a[data-alert-closure-action="silence"]') as HTMLAnchorElement | null;
    const inhibit = interactionContainer.querySelector('a[data-alert-closure-action="inhibit"]') as HTMLAnchorElement | null;

    expect(acknowledge).not.toBeNull();
    expect(recover).not.toBeNull();
    expect(close).not.toBeNull();
    expect(threshold?.getAttribute('href')).toContain('/alert/setting?');
    expect(notice?.getAttribute('href')).toContain('/alert/notice?');
    expect(group?.getAttribute('href')).toContain('/alert/group?');
    expect(silence?.getAttribute('href')).toContain('/alert/silence?');
    expect(inhibit?.getAttribute('href')).toContain('/alert/inhibit?');
    [threshold, notice, group, silence, inhibit].forEach(anchor => {
      const params = new URL(anchor?.getAttribute('href') || '', 'http://localhost').searchParams;
      expect(params.get('signal')).toBe('traces');
      expect(params.get('traceId')).toBe('trace-123');
      expect(params.get('spanId')).toBe('span-456');
      expect(params.get('collector')).toBe('edge-collector-a');
      expect(params.get('template')).toBe('java-service');
      expect(params.get('returnTo')).toBe('/trace/manage?traceId=trace-123');
      expect(params.get('returnLabel')).toBeNull();
    });

    await act(async () => {
      acknowledge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      recover?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'acknowledge', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'recover', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(3, 'close', 7);
  });

  it('uses the same mutation callback for grouped-card acknowledge and resolve actions', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{ search: '', status: 'firing', severity: '', entityId: '42', entityName: 'Checkout API' }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const acknowledge = interactionContainer.querySelector(
      'button[data-alert-group-action="acknowledge"]'
    ) as HTMLButtonElement | null;
    const resolveAction = interactionContainer.querySelector('button[data-alert-group-action="resolve"]') as HTMLButtonElement | null;

    expect(acknowledge).not.toBeNull();
    expect(resolveAction).not.toBeNull();

    await act(async () => {
      acknowledge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      resolveAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'acknowledge', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'recover', 7);
  });

  it('keeps resolve available on acknowledged entity alert cards like Angular', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);
    const acknowledgedGroupAlerts = {
      ...groupAlerts,
      content: [
        {
          ...groupAlerts.content[0],
          id: 8,
          status: 'acknowledged',
          groupLabels: { service: 'checkout' },
          commonLabels: { service: 'checkout' },
          alerts: [
            {
              ...groupAlerts.content[0].alerts[0],
              id: 801,
              status: 'acknowledged',
              content: 'checkout latency acknowledged'
            }
          ]
        }
      ]
    };

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts: acknowledgedGroupAlerts } as any}
          draft={{ search: '', status: 'acknowledged', severity: '', entityId: '42', entityName: 'Checkout API' }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const unacknowledge = interactionContainer.querySelector(
      'button[data-alert-group-action="unacknowledge"]'
    ) as HTMLButtonElement | null;
    const resolveAction = interactionContainer.querySelector('button[data-alert-group-action="resolve"]') as HTMLButtonElement | null;

    expect(unacknowledge).not.toBeNull();
    expect(resolveAction).not.toBeNull();

    await act(async () => {
      unacknowledge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      resolveAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'unacknowledge', 8);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'recover', 8);
  });

  it('confirms non-entity grouped-card delete before calling the mutation callback', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{ search: '', status: 'firing', severity: '' }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const deleteAction = interactionContainer.querySelector('button[data-alert-group-action="delete"]') as HTMLButtonElement | null;

    expect(deleteAction).not.toBeNull();

    await act(async () => {
      deleteAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-center-row-delete-confirm-dialog="angular-single-delete-confirm"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-center-row-delete-confirm-group-id="7"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain(zh('common.confirm.delete'));

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-center-row-delete-confirm-ok="angular-single-delete-confirm"]'
      ) as HTMLButtonElement | null)?.click();
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenCalledWith('delete', 7);
    expect(interactionContainer.querySelector('[data-alert-center-row-delete-confirm-dialog="angular-single-delete-confirm"]')).toBeNull();
  });

  it('keeps the entity-context return link on the shared workspace return owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(source).toContain("from '../../lib/workspace-navigation'");
    expect(source).toContain('buildEntitySignalRouteContext');
    expect(source).toContain('buildEntityWorkspaceHref');
    expect(source).not.toContain("href={draft.returnTo || '#'}");
  });

  it('renders the grouped alert stack without falling back to the selected-alert rail posture', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      }
    }, t);

    expect(html).toContain('data-alert-group-card-stack="true"');
    expect(html).toContain('data-alert-group-card="7"');
    expect(html).toContain('data-alert-group-response-posture="7"');
    expect(html).toContain('data-alert-group-response-stage="Response state: Needs acknowledgement"');
    expect(html).toContain('data-alert-group-evidence-summary="Evidence: 1 alert · 2 labels"');
    expect(html).toContain('data-alert-group-closure-summary="Next: Acknowledge / Mark resolved / Create silence / Create inhibit"');
    expect(html).toContain('Response state: Needs acknowledgement');
    expect(html).toContain('Evidence: 1 alert · 2 labels');
    expect(html).toContain('Next: Acknowledge / Mark resolved / Create silence / Create inhibit');
    expect(html).toContain('data-alert-card="701"');
    expect(html).toContain('data-alert-card-annotations="angular-detail-section"');
    expect(html).toContain('data-alert-card-annotations-owner="route-alert-card"');
    expect(html).toContain('data-alert-card-annotation="summary"');
    expect(html).toContain('CPU has been high for two intervals');
    expect(html).toContain('data-alert-card-time-detail="angular-first-last-end"');
    expect(html).toContain('data-alert-card-time-detail-owner="route-alert-card"');
    expect(html).toContain('data-alert-card-time-row="first"');
    expect(html).toContain('data-alert-card-time-row="last"');
    expect(html).toContain('Start Time');
    expect(html).toContain('Last time');
    expect(html).toContain('data-alert-card-status-detail="angular-status-section"');
    expect(html).toContain('data-alert-card-status-detail-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-alert-card-status-badge="angular-status-tag"');
    expect(html).toContain('data-alert-card-status-value="Firing"');
    expect(html).toContain('data-hz-ui="status-badge"');
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
    expect(html).toContain('Acknowledge');
    expect(html).toContain('Mark resolved');
    expect(html).toContain('Create silence');
    expect(html).toContain('Create inhibit');
    expect(html).not.toContain('Fingerprint / Creator');
  });

  it('renders the shared silence quick-dialog shell when the grouped-card action opens it', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      },
      initialDialogState: { groupKey: '7', mode: 'silence' },
      onRuleQuickCreate: vi.fn(async () => undefined)
    }, t);

    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-rule-dialog="silence"');
    expect(html).toContain('data-alert-rule-dialog-submit="silence"');
    expect(html).toContain(t('entity.alert.workbench.silence.title'));
    expect(html).toContain('Checkout API');
    expect(html).toContain(t('alert.silence.name'));
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
  });

  it('renders the shared inhibit quick-dialog shell with shared shortcut posture', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      },
      initialDialogState: { groupKey: '7', mode: 'inhibit' },
      onRuleQuickCreate: vi.fn(async () => undefined)
    }, t);

    expect(html).toContain('data-alert-rule-dialog="inhibit"');
    expect(html).toContain('data-alert-rule-dialog-submit="inhibit"');
    expect(html).toContain(t('entity.alert.workbench.inhibit.title'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.copy-source'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.drop-severity'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.clear-target'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.clear-equal'));
    expect(html).toContain(t('alert.inhibit.source_labels'));
    expect(html).toContain(t('alert.inhibit.target_labels'));
    expect(html).toContain(t('alert.inhibit.equal_labels'));
  });

  it('pins the alert center shell to the shared cold visual owner instead of page-local primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(source).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(source).toContain('data-alert-center-style-baseline={coldCenterVisual.canvasName}');
    expect(source).toContain('data-alert-center-header="cold-compact-header"');
    expect(source).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(source).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(source).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(source).toContain('data-alert-center-empty-state="cold-table-empty"');
    expect(source).toContain('data-alert-center-post-action-filter-contract="angular-retain-filter"');
    expect(source).toContain('data-alert-center-post-action-filter-owner="route-state-contract"');
    expect(source).toContain('data-alert-noise-control-action-label-contract="angular-possible-suppression-counts"');
    expect(source).toContain('data-alert-noise-control-action-label-owner="route-state-contract"');
    expect(source).toContain('data-alert-center-acknowledged-actions-contract="angular-unacknowledge-resolve"');
    expect(source).toContain('data-alert-center-acknowledged-actions-owner="route-alert-card"');
    expect(source).not.toContain('data-alert-center-refresh-slot');
    expect(source).not.toContain('data-alert-center-empty-action');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('angular-single-panel');
    expect(source).not.toContain('angular-density');
  });
});
