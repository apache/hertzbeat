import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertSilenceSurface } from './alert-silence-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../workbench/primitives', () => ({
  SurfaceSection: ({ title, children }: any) => (
    <section data-panel="true">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
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

vi.mock('../workbench/selectable-evidence-list', () => ({
  SelectableEvidenceList: ({ rows }: any) => <div data-evidence-list="true">{rows.map((row: any) => row.title).join('|')}</div>
}));

vi.mock('../workbench/toolbar', () => ({
  ToolbarField: ({ label, children }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToolbarInput: (props: any) => <input {...props} />,
  ToolbarRow: ({ children, ...props }: any) => <div data-toolbar-row="true" {...props}>{children}</div>
}));

vi.mock('../workbench/workbench-page', () => ({
  MetricGrid: ({ items }: any) => <div data-stat-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
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

vi.mock('./alert-silence-authoring-fields', () => ({
  AlertSilenceAuthoringFields: ({ mode, prefillTitle, prefillCopy, prefillWarning }: any) => (
    <div
      data-alert-silence-authoring-fields={mode}
      data-alert-silence-authoring-prefill-title={prefillTitle || ''}
      data-alert-silence-authoring-prefill-copy={prefillCopy || ''}
      data-alert-silence-authoring-prefill-warning={prefillWarning || ''}
    >
      fields
    </div>
  )
}));

describe('AlertSilenceSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const silenceEvidenceTitle = (signal: 'logs' | 'traces' | 'metrics') =>
    t('alert.rule.evidence.silence.title', { signal: t(`alert.rule.signal.${signal}`) });
  const silenceDraftName = (signal: 'logs' | 'traces' | 'metrics', target: string) =>
    t('alert.rule.evidence.silence.draft-name', { signal: t(`alert.rule.signal.${signal}`), target });
  const data = {
    list: {
      content: [
        {
          id: 7,
          name: 'weekday',
          enable: true,
          matchAll: false,
          labels: { service: 'checkout' },
          type: 1,
          days: [1, 2, 3, 4, 5],
          times: 2,
          gmtUpdate: 1713200000000
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  };

  it('renders the OTLP cold-matte silence console and modal authoring owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
        t={t}
        data={data as any}
        search="weekday"
        selectedId={7}
        checkedIds={[7]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        evidenceContext={{
          signal: 'logs',
          title: silenceEvidenceTitle('logs'),
          copy: t('alert.rule.evidence.silence.copy'),
          labelsText: 'hertzbeat.signal:logs, service.name:checkout',
          returnHref: '/log/manage?view=list&traceId=trace-123',
          rows: [],
          draftPatch: {
            labelsText: 'hertzbeat.signal:logs, service.name:checkout'
          }
        }}
        draft={{
          name: 'weekday',
          enable: true,
          matchAll: false,
          type: '1',
          labelsText: 'service:checkout',
          daysText: '1,2,3,4,5',
          periodStart: '09:00',
          periodEnd: '18:00'
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
      />
    );

    expect(html).toContain('data-alert-silence-surface="otlp-cold-silence-console"');
    expect(html).toContain('data-alert-silence-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-silence-header="cold-compact-header"');
    expect(html).toContain('data-alert-silence-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-silence-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-silence-delete-selected="toolbar"');
    expect(html).toContain('data-alert-silence-delete-selected-owner="route-no-select-warning"');
    expect(html).toContain('data-alert-silence-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-silence-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-silence-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-silence-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-silence-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-silence-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-alert-silence-select-all="cold-checkbox"');
    expect(html).toContain('data-alert-silence-row-checkbox="cold-checkbox"');
    expect(html).toContain('data-alert-silence-enable-checkbox="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('alert.silence.action.new'));
    expect(html).toContain(t('common.button.delete-batch'));
    expect(html).toContain(t('common.search'));
    expect(html).not.toContain(t('alert.silence.selected.empty.title'));
    expect(html).toContain(t('alert.silence.name'));
    expect(html).toContain(t('alert.silence.type'));
    expect(html).toContain(t('alert.silence.times'));
    expect(html).toContain('weekday');
    expect(html).toContain(t('alert.silence.type.cyc'));
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-silence-authoring-fields="workspace"');
    expect(html).toContain('data-alert-silence-editor-return="evidence-context"');
    expect(html).toContain('href="/log/manage?view=list&amp;traceId=trace-123"');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('angular-table');
    expect(html).not.toContain('angular-table-panel');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('pageSizeOptions?: number[]');
    expect(source).toContain('onPageIndexChange?: (nextPageIndex: number) => void');
    expect(source).toContain('onPageSizeChange?: (nextPageSize: number) => void');
    expect(source).not.toContain('className={coldSilenceVisual.search.input}');
    expect(source).not.toContain('className=\"h-3.5 w-3.5 accent-[#4e74f8]\"');
    expect(source).not.toContain('min-h-[calc(100vh-64px)]');
    expect(source).toContain('data-alert-silence-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-alert-silence-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).not.toContain('disabled={selectedCount === 0}');
    expect(source).not.toContain('coldSilenceVisual.layout.heroGrid');
    expect(source).not.toContain('coldSilenceVisual.layout.railGrid');
    expect(source).not.toContain('coldSilenceVisual.signal.band');
    expect(source).not.toContain('coldSilenceVisual.panel.rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('facts={[]}');
    expect(source).not.toContain('className="min-h-[680px] overflow-hidden p-0"');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain('MetricGrid');
    expect(source).not.toContain('buildAlertSilenceMetrics');
    expect(source).not.toContain('buildAlertSilenceFacts');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('side={');
    expect(source).not.toContain('ToolbarField');
  });

  it('renders route-level action feedback through shared inline feedback', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen={false}
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={t('common.notify.no-select-delete')}
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('data-alert-silence-action-feedback="warning"');
    expect(html).toContain('data-alert-silence-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('common.notify.no-select-delete'));
  });

  it('renders Angular silence save failure title/detail through shared feedback', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          name: 'weekday',
          enable: true,
          matchAll: false,
          type: '1',
          labelsText: 'service:checkout',
          daysText: '1,2,3',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-save-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-silence-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-save-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-silence-save-feedback-detail="backend-message"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular silence enable failure title/detail outside the editor', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-enable-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-silence-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-enable-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-silence-enable-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular silence delete failure title/detail outside the editor', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-delete-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-silence-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-alert-silence-delete-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('keeps the empty state inside the cold dense silence table body', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-silence-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-silence-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-silence-compact-canvas="content-height"');
    expect(html).toContain('min-height:auto');
    expect(html).toContain('data-alert-silence-empty-icon="cold-empty-box"');
    expect(html).toContain(t('alert.silence.empty.title'));
  });

  it('renders the topology return context when opened from alert impact silence closure', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-return-context="topology-edge"');
    expect(html).toContain('data-alert-silence-return-edge-id="svc-checkout--res-orders-db"');
    expect(html).toContain('href="/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain(t('topology.identity'));
    expect(html).not.toContain('returnLabel=');
    expect(html).toContain('checkout-api');
    expect(html).toContain('resource-dependency');
  });

  it('renders Angular entity noise-control matched-rule management context', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchingRuleType: 'silence',
          matchingRuleIds: [7, 8],
          matchedViewEnabled: true
        }}
        matchedViewEnabled
        missingMatchedRuleCount={1}
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onPageIndexChange={vi.fn()}
        onPageSizeChange={vi.fn()}
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
      />
    );

    expect(html).toContain('data-alert-silence-entity-context="angular-entity-context-bar"');
    expect(html).toContain('data-alert-silence-entity-context-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-match-mode="angular-entity-noise-controls"');
    expect(html).toContain('data-alert-silence-match-mode-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-match-view="matched"');
    expect(html).toContain('data-alert-silence-matching-rule-count="2"');
    expect(html).toContain('data-alert-silence-missing-rule-count="1"');
    expect(html).toContain('data-alert-silence-match-action="view-all"');
    expect(html).toContain('data-alert-silence-entity-return="true"');
    expect(html).toContain('checkout-api');
  });

  it('renders Angular created-outside-matched authoring notice', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchingRuleType: 'silence',
          matchingRuleIds: [7],
          matchedViewEnabled: true
        }}
        matchedViewEnabled
        createdOutsideMatchedViewNotice
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-created-outside-matched="angular-authoring-notice"');
    expect(html).toContain('data-alert-silence-created-outside-matched-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-silence-created-outside-matched-action="view-all"');
    expect(html).toContain(t('entity.noise-controls.authoring.created-outside-matched.title'));
    expect(html).toContain(t('entity.noise-controls.authoring.created-outside-matched.copy'));
  });

  it('renders three-signal evidence context before silence authoring', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          signal: 'logs',
          title: silenceEvidenceTitle('logs'),
          copy: t('alert.rule.evidence.silence.copy'),
          labelsText: 'hertzbeat.signal:logs, service.name:checkout, trace_id:trace-123',
          returnHref: '/log/manage?view=list&traceId=trace-123',
          rows: [
            { label: t('signal.context.entity.label'), value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: t('signal.context.trace.label'), value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: silenceDraftName('logs', 'checkout'),
            matchAll: false,
            labelsText: 'hertzbeat.signal:logs, service.name:checkout, trace_id:trace-123'
          }
        }}
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-evidence-context="signal-route"');
    expect(html).toContain('data-alert-silence-evidence-signal="logs"');
    expect(html).toContain('data-alert-silence-prefill-labels="hertzbeat.signal:logs, service.name:checkout, trace_id:trace-123"');
    expect(html).toContain(silenceEvidenceTitle('logs'));
    expect(html).toContain(t('alert.rule.evidence.return'));
    expect(html).toContain('href="/log/manage?view=list&amp;traceId=trace-123"');
    expect(html).toContain(t('signal.context.entity.label'));
    expect(html).toContain(t('signal.context.trace.label'));
  });

  it('renders Angular entity alert prefill copy inside the silence editor', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          matchingRuleType: 'silence',
          matchingRuleIds: [],
          matchedViewEnabled: true
        }}
        matchedViewEnabled
        entityPrefillSource="alerts-common-labels"
        entityPrefillWarning={null}
        draft={{
          name: 'checkout-api silence',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: 'service:checkout, env:prod',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-entity-prefill="angular-alert-common-labels"');
    expect(html).toContain(`data-alert-silence-authoring-prefill-title="${t('entity.noise-controls.authoring.silence.title')}"`);
    expect(html).toContain(`data-alert-silence-authoring-prefill-copy="${t('entity.noise-controls.authoring.silence.prefill-success')}"`);
    expect(html).not.toContain(`data-alert-silence-authoring-prefill-warning="${t('entity.noise-controls.authoring.silence.prefill-warning')}"`);
  });

  it('renders missing silence evidence labels with the localized empty fallback', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
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
          title: silenceEvidenceTitle('metrics'),
          copy: t('alert.rule.evidence.silence.copy'),
          labelsText: '',
          returnHref: '/ingestion/otlp/metrics?entityId=service-1',
          rows: [],
          draftPatch: {
            labelsText: ''
          }
        }}
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-evidence-context="signal-route"');
    expect(html).toContain('data-alert-silence-evidence-labels="localized-fallback"');
    expect(html).toContain(t('common.none'));
  });

  it('renders validation errors visibly inside the silence editor dialog', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceSurface
        t={t}
        data={data as any}
        search=""
        selectedId={7}
        checkedIds={[]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={t('alert.silence.validation.name')}
        draft={{
          name: '',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: ''
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
      />
    );

    expect(html).toContain('data-alert-silence-editor-error-inline="cold-validation"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('alert.silence.validation.name'));
  });
});
