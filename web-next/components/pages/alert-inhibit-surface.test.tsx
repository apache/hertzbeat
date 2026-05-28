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
          title: '来自链路的抑制上下文',
          copy: '保存或取消后仍可回到原排障上下文。',
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

    expect(html).toContain('data-alert-inhibit-surface="otlp-cold-inhibit-console"');
    expect(html).toContain('data-alert-inhibit-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-inhibit-header="cold-compact-header"');
    expect(html).toContain('data-alert-inhibit-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-inhibit-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-inhibit-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-inhibit-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-inhibit-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-inhibit-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-inhibit-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-inhibit-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-alert-inhibit-delete-selected="toolbar"');
    expect(html).toContain('data-alert-inhibit-delete-selected-owner="route-no-select-warning"');
    expect(html).toContain('data-alert-inhibit-select-all="cold-checkbox"');
    expect(html).toContain('data-alert-inhibit-row-checkbox="cold-checkbox"');
    expect(html).toContain('data-alert-inhibit-enable-checkbox="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('刷新');
    expect(html).toContain('新增抑制');
    expect(html).toContain('批量删除');
    expect(html).toContain('搜索');
    expect(html).not.toContain('当前抑制');
    expect(html).toContain('抑制规则名称');
    expect(html).toContain('源标签');
    expect(html).toContain('目标标签');
    expect(html).toContain('相等标签');
    expect(html).toContain('db-inhibit');
    expect(html).toContain('service:checkout');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-inhibit-authoring-fields="workspace"');
    expect(html).toContain('data-alert-inhibit-editor-return="evidence-context"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('angular-table');
    expect(html).not.toContain('angular-table-panel');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('HzInlineFeedback');
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

    expect(html).toContain('data-alert-inhibit-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-inhibit-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-inhibit-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-inhibit-empty-icon="cold-empty-box"');
    expect(html).toContain('还没有抑制规则');
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
          returnLabel: 'HertzBeat 企业运维拓扑'
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
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
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
    expect(html).toContain('已有 1 条命中规则不可用或已不存在');
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
    expect(html).toContain('新规则已创建');
    expect(html).toContain('当前视图不会自动显示这条新规则');
  });

  it('renders three-signal evidence context before inhibit authoring', () => {
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
          title: '来自链路的抑制上下文',
          copy: '新建抑制时会按当前实体、服务、环境和链路标签做匹配。',
          sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
          targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123',
          equalLabelsText: 'service.name, deployment.environment',
          returnHref: '/trace/manage?traceId=trace-123',
          rows: [
            { label: '当前实体', value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: '链路上下文', value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: '链路 checkout 抑制',
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
    expect(html).toContain('data-alert-inhibit-evidence-signal="traces"');
    expect(html).toContain('data-alert-inhibit-prefill-source-labels="hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123"');
    expect(html).toContain('data-alert-inhibit-prefill-target-labels="hertzbeat.signal:traces, service.name:checkout, trace_id:trace-123"');
    expect(html).toContain('data-alert-inhibit-prefill-equal-labels="service.name, deployment.environment"');
    expect(html).toContain('来自链路的抑制上下文');
    expect(html).toContain('返回排障上下文');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain('当前实体');
    expect(html).toContain('链路上下文');
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
          title: '来自指标的抑制上下文',
          copy: '按当前实体创建抑制规则。',
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
    expect(html).toContain('data-alert-inhibit-source-labels="localized-fallback"');
    expect(html).toContain('data-alert-inhibit-target-labels="localized-fallback"');
    expect(html).toContain('data-alert-inhibit-equal-labels="localized-fallback"');
    expect(html.match(/无/g)?.length).toBeGreaterThanOrEqual(3);
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
        editorError="请填写抑制规则名称"
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

    expect(html).toContain('data-alert-inhibit-editor-error-inline="cold-validation"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('请填写抑制规则名称');
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
    expect(html).toContain('data-alert-inhibit-authoring-prefill-title="为当前实体创建抑制规则"');
    expect(html).toContain('data-alert-inhibit-authoring-prefill-copy="已提取当前实体可见告警的共享标签，并填入源条件、目标条件和相等标签。"');
    expect(html).not.toContain('data-alert-inhibit-authoring-prefill-warning="当前没有稳定的共享告警标签，请手动填写抑制条件。"');
  });
});
