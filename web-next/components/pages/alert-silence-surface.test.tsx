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
  AlertSilenceAuthoringFields: ({ mode }: any) => <div data-alert-silence-authoring-fields={mode}>fields</div>
}));

describe('AlertSilenceSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
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
          title: '来自日志的静默上下文',
          copy: '保存或取消后仍可回到原排障上下文。',
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
    expect(html).toContain('data-alert-silence-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-silence-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-silence-select-all="cold-checkbox"');
    expect(html).toContain('data-alert-silence-row-checkbox="cold-checkbox"');
    expect(html).toContain('data-alert-silence-enable-checkbox="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('刷新');
    expect(html).toContain('新增静默');
    expect(html).toContain('批量删除');
    expect(html).toContain('搜索');
    expect(html).not.toContain('当前静默');
    expect(html).toContain('策略名称');
    expect(html).toContain('静默类型');
    expect(html).toContain('已静默告警数');
    expect(html).toContain('weekday');
    expect(html).toContain('周期性静默');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-silence-authoring-fields="workspace"');
    expect(html).toContain('data-alert-silence-editor-return="evidence-context"');
    expect(html).toContain('href="/log/manage?view=list&amp;traceId=trace-123"');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('angular-table');
    expect(html).not.toContain('angular-table-panel');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).not.toContain('className={coldSilenceVisual.search.input}');
    expect(source).not.toContain('className=\"h-3.5 w-3.5 accent-[#4e74f8]\"');
    expect(source).not.toContain('min-h-[calc(100vh-64px)]');
    expect(source).toContain('data-alert-silence-admin-layout="full-width-admin-list"');
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
    expect(html).toContain('data-alert-silence-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-silence-compact-canvas="content-height"');
    expect(html).toContain('min-height:auto');
    expect(html).toContain('data-alert-silence-empty-icon="cold-empty-box"');
    expect(html).toContain('还没有静默规则');
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
          returnLabel: 'HertzBeat 企业运维拓扑'
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
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
    expect(html).not.toContain('returnLabel=');
    expect(html).toContain('checkout-api');
    expect(html).toContain('resource-dependency');
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
          title: '来自日志的静默上下文',
          copy: '新建静默时会按当前实体、服务、环境和链路标签做匹配。',
          labelsText: 'hertzbeat.signal:logs, service.name:checkout, trace_id:trace-123',
          returnHref: '/log/manage?view=list&traceId=trace-123',
          rows: [
            { label: '当前实体', value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: '链路上下文', value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: '日志 checkout 静默',
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
    expect(html).toContain('来自日志的静默上下文');
    expect(html).toContain('返回排障上下文');
    expect(html).toContain('href="/log/manage?view=list&amp;traceId=trace-123"');
    expect(html).toContain('当前实体');
    expect(html).toContain('链路上下文');
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
        editorError="请填写策略名称"
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
    expect(html).toContain('请填写策略名称');
  });
});
