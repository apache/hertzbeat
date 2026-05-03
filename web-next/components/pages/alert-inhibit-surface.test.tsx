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
  AlertInhibitAuthoringFields: ({ mode }: any) => <div data-alert-inhibit-authoring-fields={mode}>fields</div>
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
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
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
});
