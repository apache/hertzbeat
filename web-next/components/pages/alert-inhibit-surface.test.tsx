import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertInhibitSurface } from './alert-inhibit-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../observability/selectable-evidence-list', () => ({
  SelectableEvidenceList: ({ rows }: any) => <div data-evidence-list="true">{rows.map((row: any) => row.title).join('|')}</div>
}));

vi.mock('../observability', () => ({
  ObservabilityPanelShell: ({ title, children }: any) => (
    <section data-panel="true">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  ObservabilityRailShell: ({ title, children }: any) => (
    <aside data-rail="true">
      <h3>{title}</h3>
      {children}
    </aside>
  ),
  ObservabilityStatGrid: ({ items }: any) => <div data-stat-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  ObservabilityStatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
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
    <aside data-rail="true">
      <h3>{title}</h3>
      {children}
    </aside>
  ),
  WorkbenchTableFrame: ({ children, ...props }: any) => <div data-table-frame="true" {...props}>{children}</div>,
  WorkbenchToolbarAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  WorkbenchValuePill: ({ children }: any) => <span data-value-pill="true">{children}</span>
}));

vi.mock('../workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, facts, actions, main, side }: any) => (
    <main
      data-workbench-page="true"
      data-facts-count={facts?.length ?? 0}
      data-has-actions={actions ? 'true' : 'false'}
      data-has-side={side ? 'true' : 'false'}
    >
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-actions="true">{actions}</div>
      <div data-main="true">{main}</div>
      <div data-side="true">{side}</div>
    </main>
  )
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, title, kicker, footer, children }: any) =>
    open ? (
      <div data-overlay-dialog="true">
        <div>{kicker}</div>
        <div>{title}</div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null
}));

vi.mock('./alert-inhibit-authoring-fields', () => ({
  AlertInhibitAuthoringFields: ({ mode, prefillTitle, prefillCopy, prefillWarning }: any) => (
    <div
      data-alert-inhibit-authoring-fields={mode}
      data-alert-inhibit-authoring-prefill-title={prefillTitle || ''}
      data-alert-inhibit-authoring-prefill-copy={prefillCopy || ''}
      data-alert-inhibit-authoring-prefill-warning={prefillWarning || ''}
    >
      fields
    </div>
  )
}));

describe('AlertInhibitSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const inhibitEvidenceTitle = (signal: 'logs' | 'traces' | 'metrics') =>
    t('alert.rule.evidence.inhibit.title', { signal: t(`alert.rule.signal.${signal}`) });
  const inhibitDraftName = (signal: 'logs' | 'traces' | 'metrics', target: string) =>
    t('alert.rule.evidence.inhibit.draft-name', { signal: t(`alert.rule.signal.${signal}`), target });

  const data = {
    list: {
      content: [
        {
          id: 7,
          name: 'db-inhibit',
          enable: true,
          sourceLabels: { service: 'checkout' },
          targetLabels: { severity: 'warning' },
          equalLabels: ['cluster'],
          gmtUpdate: 1713200000000
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  };

  it('renders the OTLP cold-matte inhibit console and modal authoring owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search="db"
        selectedId={7}
        checkedIds={[7]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        evidenceContext={{
          signal: 'traces',
          title: inhibitEvidenceTitle('traces'),
          copy: t('alert.rule.evidence.inhibit.copy'),
          sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
          targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
          equalLabelsText: 'service.name',
          returnHref: '/trace/manage?traceId=trace-123',
          rows: [],
          draftPatch: {
            sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
            targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
            equalLabelsText: 'service.name'
          }
        }}
        draft={{
          id: 7,
          name: 'db-inhibit',
          enable: true,
          sourceLabelsText: 'service:checkout',
          targetLabelsText: 'severity:warning',
          equalLabelsText: 'cluster'
        }}
        formatTime={() => '2026-04-19 20:00:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-surface="otlp-hertzbeat-ui-inhibit-console"');
    expect(html).toContain('data-alert-inhibit-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-alert-inhibit-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-alert-inhibit-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-alert-inhibit-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-inhibit-action-help="refresh"');
    expect(html).toContain('data-alert-inhibit-action-help="new"');
    expect(html).toContain('data-alert-inhibit-action-help="delete-selected"');
    expect(html).toContain('data-alert-inhibit-action-help="row-enable"');
    expect(html).toContain('data-alert-inhibit-action-help="row-edit"');
    expect(html).toContain('data-alert-inhibit-action-help="row-delete"');
    expect(html).toContain('data-alert-inhibit-action-help="cancel"');
    expect(html).toContain('data-alert-inhibit-action-help="save"');
    expect(html).toContain('data-alert-inhibit-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-alert-inhibit-action-help-style="icon-after-action"');
    expect(html).toContain('data-alert-inhibit-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-alert-inhibit-action-help-icon="lucide-circle-help"');
    expect(html).toContain('lucide-circle-help');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('data-alert-inhibit-action-help-tooltip="delete-selected"');
    expect(html).toContain('data-alert-inhibit-action-help-tooltip="row-enable"');
    expect(html).toContain('data-alert-inhibit-action-help-tooltip="row-edit"');
    expect(html).toContain('data-alert-inhibit-action-help-tooltip="row-delete"');
    expect(html).toContain(t('alert.inhibit.action.refresh.help'));
    expect(html).toContain(t('alert.inhibit.action.new.help'));
    expect(html).toContain(t('alert.inhibit.action.new.impact'));
    expect(html).toContain(t('alert.inhibit.action.delete-selected.impact'));
    expect(html).toContain(t('alert.inhibit.action.row-enable.help'));
    expect(html).toContain(t('alert.inhibit.action.row-enable.impact'));
    expect(html).toContain(t('alert.inhibit.action.row-edit.help'));
    expect(html).toContain(t('alert.inhibit.action.row-edit.impact'));
    expect(html).toContain(t('alert.inhibit.action.row-delete.help'));
    expect(html).toContain(t('alert.inhibit.action.row-delete.impact'));
    expect(html).toContain(t('alert.inhibit.action.cancel.help'));
    expect(html).toContain(t('alert.inhibit.action.save.help'));
    expect(html).toContain('data-alert-inhibit-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-inhibit-toolbar="hertzbeat-ui-query-toolbar"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-layout="compact-detached-button"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-hz-search-input-shell');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-alert-inhibit-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-alert-inhibit-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('data-alert-inhibit-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-inhibit-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-inhibit-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-alert-inhibit-delete-selected="toolbar"');
    expect(html).toContain('data-alert-inhibit-delete-selected-owner="route-no-select-warning"');
    expect(html).toContain('data-alert-inhibit-select-all="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-inhibit-row-checkbox="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-inhibit-enable-checkbox="hertzbeat-ui-checkbox"');
    expect(html.match(/data-hz-checkbox-owner="hertzbeat-ui-checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('alert.inhibit.action.new'));
    expect(html).toContain(t('common.button.delete-batch'));
    expect(html).toContain(t('common.search'));
    expect(html).toContain(t('alert.inhibit.name'));
    expect(html).toContain(t('alert.inhibit.source_labels'));
    expect(html).toContain(t('alert.inhibit.target_labels'));
    expect(html).toContain(t('alert.inhibit.equal_labels'));
    expect(html).toContain('db-inhibit');
    expect(html).toContain('service:checkout');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-inhibit-authoring-fields="workspace"');
    expect(html).toContain('data-alert-inhibit-editor-return="evidence-context"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('angular-table');
    expect(html).not.toContain('angular-table-panel');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('data-alert-inhibit-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('className={coldInhibitVisual.panel.hero}');
    expect(source).toContain('function alertInhibitActionHelp');
    expect(source).toContain('function AlertInhibitActionHelp');
    expect(source).toContain("alertInhibitActionHelp(t, 'refresh')");
    expect(source).toContain("alertInhibitActionHelp(t, 'new')");
    expect(source).toContain("alertInhibitActionHelp(t, 'delete-selected')");
    expect(source).toContain("alertInhibitActionHelp(t, 'row-enable')");
    expect(source).toContain("alertInhibitActionHelp(t, 'row-edit')");
    expect(source).toContain("alertInhibitActionHelp(t, 'row-delete')");
    expect(source).toContain('data-alert-inhibit-action-help={id}');
    expect(source).toContain('CircleHelp');
    expect(source).toContain('data-alert-inhibit-action-help-style="icon-after-action"');
    expect(source).toContain('data-alert-inhibit-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-alert-inhibit-action-help-icon="lucide-circle-help"');
    expect(source).toContain('data-alert-inhibit-action-help-tooltip={id}');
    expect(source).not.toContain('data-alert-inhibit-action-help-style="literal-question-after-action"');
    expect(source).not.toContain('data-alert-inhibit-action-help-visual="borderless-question"');
    expect(source).not.toContain('<span aria-hidden="true">?</span>');
    expect(source).toContain('data-alert-inhibit-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).not.toContain('disabled={selectedCount === 0}');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('pageSizeOptions?: number[]');
    expect(source).toContain('onPageIndexChange?: (nextPageIndex: number) => void');
    expect(source).toContain('onPageSizeChange?: (nextPageSize: number) => void');
    expect(source).toContain('data-alert-inhibit-admin-layout="full-width-admin-list"');
    expect(source).not.toContain('className={coldInhibitVisual.search.input}');
    expect(source).not.toContain('className={coldInhibitVisual.search.row}');
    expect(source).not.toContain('accent-[#4e74f8]');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('coldInhibitVisual.layout.heroGrid');
    expect(source).not.toContain('coldInhibitVisual.layout.railGrid');
    expect(source).not.toContain('coldInhibitVisual.signal.band');
    expect(source).not.toContain('coldInhibitVisual.panel.rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('facts={[]}');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfaceTableShell');
    expect(source).not.toContain('AlertSurfaceTable');
    expect(source).not.toContain('AlertSurfaceCheckboxLabel');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain('MetricGrid');
    expect(source).not.toContain('buildAlertInhibitMetrics');
    expect(source).not.toContain('buildAlertInhibitFacts');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('side={');
    expect(source).not.toContain('ToolbarField');
  });

  it('keeps the empty state inside the cold dense inhibit table body', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } } as any}
        search=""
        selectedId={null}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-alert-inhibit-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('data-alert-inhibit-empty-state="hertzbeat-ui-table-empty"');
    expect(html).toContain('data-alert-inhibit-empty-icon="hertzbeat-ui-empty-box"');
    expect(html).toContain('data-alert-inhibit-empty-action="new"');
    expect(html).toContain(t('alert.inhibit.empty.title'));
    expect(html).toContain(t('alert.inhibit.action.new'));
  });

  it('keeps the requested route page size visible when the empty backend page echoes the default', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } } as any}
        requestedPageSize={15}
        search=""
        selectedId={null}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-pagination-summary');
    expect(html).toContain(t('alert.inhibit.pagination.summary', {
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
      total: 0
    }));
    expect(html).toContain('data-alert-inhibit-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-ui="select-trigger"');
    expect(html).toContain('<span class="truncate">15</span>');
  });

  it('renders the topology return context when opened from alert impact inhibit closure', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        returnContext={{
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
          returnTo,
          returnLabel: t('topology.identity')
        }}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-return-context="topology-edge"');
    expect(html).toContain('data-alert-inhibit-return-edge-id="svc-checkout--res-orders-db"');
    expect(html).toContain('href="/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain(t('topology.identity'));
    expect(html).not.toContain('returnLabel=');
    expect(html).toContain('checkout-api');
    expect(html).toContain('resource-dependency');
  });

  it('renders Angular entity noise-control matched-rule management context', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } } as any}
        search=""
        selectedId={null}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        managementContext={{
          entityId: '42',
          entityName: 'checkout-api',
          returnTo: '/entities/42?tab=alerts',
          returnLabel: 'checkout-api',
          matchMode: 'entity-noise-controls',
          matchingRuleType: 'inhibit',
          matchingRuleIds: [11, 12],
          matchedViewEnabled: true
        }}
        matchedViewEnabled
        missingMatchedRuleCount={1}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onViewAllRules={vi.fn()}
        onViewMatchedRules={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-entity-context="angular-entity-context-bar"');
    expect(html).toContain('data-alert-inhibit-entity-context-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-match-mode="angular-entity-noise-controls"');
    expect(html).toContain('data-alert-inhibit-match-mode-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-match-view="matched"');
    expect(html).toContain('data-alert-inhibit-matching-rule-count="2"');
    expect(html).toContain('data-alert-inhibit-missing-rule-count="1"');
    expect(html).toContain('data-alert-inhibit-match-action="view-all"');
    expect(html).toContain('data-alert-inhibit-entity-return="true"');
    expect(html).toContain('checkout-api');
    expect(html).toContain(t('entity.noise-controls.management.missing', { count: 1 }));
  });

  it('renders Angular created-outside-matched authoring notice', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        managementContext={{
          entityId: '42',
          entityName: 'checkout-api',
          returnTo: '/entities/42?tab=alerts',
          returnLabel: 'checkout-api',
          matchMode: 'entity-noise-controls',
          matchingRuleType: 'inhibit',
          matchingRuleIds: [7],
          matchedViewEnabled: true
        }}
        matchedViewEnabled
        createdOutsideMatchedViewNotice
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onViewAllRules={vi.fn()}
        onViewMatchedRules={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-created-outside-matched="angular-authoring-notice"');
    expect(html).toContain('data-alert-inhibit-created-outside-matched-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-created-outside-matched-action="view-all"');
    expect(html).toContain(t('entity.noise-controls.authoring.created-outside-matched.title'));
    expect(html).toContain(t('entity.noise-controls.authoring.created-outside-matched.copy'));
  });

  it('renders three-signal evidence context before inhibit authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        evidenceContext={{
          signal: 'traces',
          title: inhibitEvidenceTitle('traces'),
          copy: t('alert.rule.evidence.inhibit.copy'),
          sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
          targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
          equalLabelsText: 'service.name, deployment.environment',
          returnHref: '/trace/manage?traceId=trace-123',
          rows: [
            { label: t('signal.context.entity.label'), value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: t('signal.context.trace.label'), value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: inhibitDraftName('traces', 'checkout'),
            sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
            targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
            equalLabelsText: 'service.name, deployment.environment'
          }
        }}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-evidence-context="signal-route"');
    expect(html).toContain('data-alert-inhibit-evidence-layering="flat-context-band"');
    expect(html).toContain('data-alert-inhibit-evidence-signal="traces"');
    expect(html).toContain('data-alert-inhibit-prefill-source-labels="hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123"');
    expect(html).toContain('data-alert-inhibit-prefill-target-labels="hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123"');
    expect(html).toContain('data-alert-inhibit-prefill-equal-labels="service.name, deployment.environment"');
    expect(source).toContain('data-alert-inhibit-evidence-layering="flat-context-band"');
    expect(source).not.toContain('data-alert-inhibit-evidence-context="signal-route"\n                  data-alert-inhibit-evidence-signal={evidenceContext.signal}\n                  data-alert-inhibit-prefill-source-labels={evidenceContext.sourceLabelsText}\n                  data-alert-inhibit-prefill-target-labels={evidenceContext.targetLabelsText}\n                  data-alert-inhibit-prefill-equal-labels={evidenceContext.equalLabelsText}\n                  className="rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"');
    expect(html).toContain(inhibitEvidenceTitle('traces'));
    expect(html).toContain(t('alert.rule.evidence.return'));
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain(t('signal.context.entity.label'));
    expect(html).toContain(t('signal.context.trace.label'));
  });

  it('renders missing inhibit evidence labels with the localized empty fallback', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        evidenceContext={{
          signal: 'metrics',
          title: inhibitEvidenceTitle('metrics'),
          copy: t('alert.rule.evidence.inhibit.copy'),
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: '',
          returnHref: '/ingestion/otlp/metrics?entityId=service-1',
          rows: [],
          draftPatch: {
            sourceLabelsText: '',
            targetLabelsText: '',
            equalLabelsText: ''
          }
        }}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-evidence-context="signal-route"');
    expect(html).toContain('data-alert-inhibit-evidence-layering="flat-context-band"');
    expect(html).toContain('data-alert-inhibit-source-labels="localized-fallback"');
    expect(html).toContain('data-alert-inhibit-target-labels="localized-fallback"');
    expect(html).toContain('data-alert-inhibit-equal-labels="localized-fallback"');
    expect(html.split(t('common.none')).length - 1).toBeGreaterThanOrEqual(3);
  });

  it('renders validation errors visibly inside the inhibit editor dialog', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={t('alert.inhibit.validation.name')}
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-editor-error-inline="hertzbeat-ui-validation"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('alert.inhibit.validation.name'));
  });

  it('renders Angular inhibit save failure title/detail through shared feedback', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError="common.notify.edit-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="save"
        draft={{
          id: 7,
          name: 'checkout-inhibit',
          enable: true,
          sourceLabelsText: 'service:checkout',
          targetLabelsText: 'service:checkout',
          equalLabelsText: 'service'
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-save-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-inhibit-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-save-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-inhibit-save-feedback-detail="backend-message"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular inhibit enable failure title/detail outside the editor', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError="common.notify.edit-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="enable"
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-enable-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-inhibit-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-enable-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-inhibit-enable-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular inhibit delete failure title/detail outside the editor', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError="common.notify.delete-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="delete"
        draft={{
          name: '',
          enable: true,
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabelsText: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-delete-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-inhibit-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-inhibit-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-alert-inhibit-delete-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular entity alert prefill copy inside the inhibit editor', () => {
    const html = renderToStaticMarkup(
      <AlertInhibitSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        managementContext={{
          entityId: '42',
          entityName: 'checkout-api',
          returnTo: '/entities/42?tab=alerts',
          returnLabel: 'checkout-api',
          matchMode: 'entity-noise-controls',
          matchingRuleType: 'inhibit',
          matchingRuleIds: [7],
          matchedViewEnabled: true
        }}
        entityPrefillSource="alerts-common-labels"
        entityPrefillWarning={null}
        draft={{
          name: 'checkout-api inhibit',
          enable: true,
          sourceLabelsText: 'service:checkout, env:prod',
          targetLabelsText: 'service:checkout, env:prod',
          equalLabelsText: 'service, env'
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-entity-prefill="angular-alert-common-labels"');
    expect(html).toContain(`data-alert-inhibit-authoring-prefill-title="${t('entity.noise-controls.authoring.inhibit.title')}"`);
    expect(html).toContain(`data-alert-inhibit-authoring-prefill-copy="${t('entity.noise-controls.authoring.inhibit.prefill-success')}"`);
    expect(html).not.toContain(
      `data-alert-inhibit-authoring-prefill-warning="${t('entity.noise-controls.authoring.inhibit.prefill-warning')}"`
    );
  });
});
