import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertGroupSurface } from './alert-group-surface';
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
  WorkbenchValuePill: ({ children }: any) => <span data-value-pill="true">{children}</span>
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

vi.mock('./alert-group-authoring-fields', () => ({
  AlertGroupAuthoringFields: ({ mode, labelOptions }: any) => (
    <div data-alert-group-authoring-fields={mode} data-label-options={labelOptions?.keys?.join('|')}>fields</div>
  )
}));

describe('AlertGroupSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const data = {
    list: {
      content: [
        {
          id: 7,
          name: 'ops-group',
          enable: true,
          groupLabels: ['alertname', 'service'],
          groupWait: 30,
          groupInterval: 300,
          repeatInterval: 14400,
          gmtUpdate: 1713200000000
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  };

  it('renders the OTLP cold-matte group console and modal authoring owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertGroupSurface
        t={t}
        data={data as any}
        search="ops"
        selectedId={7}
        checkedIds={[7]}
        editorOpen
        editorLoading={false}
        editorSaving={false}
        editorMessage={null}
        editorError={null}
        evidenceContext={{
          signal: 'traces',
          title: '来自链路的分组上下文',
          copy: '保存或取消后仍可回到原排障上下文。',
          groupLabelsText: 'hertzbeat.entity.id, service.name',
          returnHref: '/trace/manage?traceId=trace-123',
          rows: [],
          draftPatch: {
            groupLabelsText: 'hertzbeat.entity.id, service.name'
          }
        }}
        draft={{
          id: 7,
          name: 'ops-group',
          enable: true,
          groupLabelsText: 'alertname, service',
          groupWait: '30',
          groupInterval: '300',
          repeatInterval: '14400'
        }}
        formatTime={() => '2026-04-19 20:00:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
        labelOptions={{
          keys: ['alertname', 'instance', 'job'],
          valuesByKey: {
            severity: ['critical', 'warning']
          }
        }}
      />
    );

    expect(html).toContain('data-alert-group-surface="otlp-cold-group-console"');
    expect(html).toContain('data-alert-group-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-group-header="cold-compact-header"');
    expect(html).toContain('data-alert-group-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-group-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-group-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-group-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-group-row-checkbox="cold-checkbox"');
    expect(html).toContain('data-alert-group-enable-checkbox="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('刷新');
    expect(html).toContain('新增分组');
    expect(html).toContain('搜索');
    expect(html).toContain('分组收敛');
    expect(html).toContain('管理 Alertmanager 分组收敛规则');
    expect(html).toContain('策略名称');
    expect(html).toContain('分组标签');
    expect(html).toContain('ops-group');
    expect(html).toContain('alertname');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-group-authoring-fields="workspace"');
    expect(html).toContain('data-alert-group-editor-return="evidence-context"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain('data-label-options="alertname|instance|job"');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('labelOptions?: AlertLabelOptions');
    expect(source).toContain('labelOptions={labelOptions}');
    expect(source).not.toContain('suggestedLabels');
    expect(source).toContain('data-alert-group-admin-layout="full-width-admin-list"');
    expect(source).not.toContain('className={coldGroupVisual.search.input}');
    expect(source).not.toContain('className={coldGroupVisual.search.row}');
    expect(source).not.toContain('accent-[#4e74f8]');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('coldGroupVisual.layout.heroGrid');
    expect(source).not.toContain('coldGroupVisual.layout.railGrid');
    expect(source).not.toContain('coldGroupVisual.signal.band');
    expect(source).not.toContain('coldGroupVisual.panel.rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('tone="operator"');
    expect(source).not.toContain('facts={[]}');
    expect(source).not.toContain('angular-table-panel');
    expect(source).not.toContain('angular-table-toolbar');
    expect(source).not.toContain('angular-table"');
    expect(source).not.toContain('MetricGrid');
    expect(source).not.toContain('buildAlertGroupMetrics');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('side={');
    expect(source).not.toContain('ToolbarField');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-alert-group-workbench-panel="angular-table-panel"');
    expect(html).not.toContain('data-alert-group-toolbar="angular-table-toolbar"');
    expect(html).not.toContain('data-alert-group-table-shell="angular-table"');
  });

  it('keeps the empty state inside the cold dense table body', () => {
    const html = renderToStaticMarkup(
      <AlertGroupSurface
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
          groupLabelsText: '',
          groupWait: '30',
          groupInterval: '300',
          repeatInterval: '14400'
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-group-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-group-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-group-empty-icon="cold-empty-box"');
    expect(html).toContain('data-alert-group-empty-copy="true"');
    expect(html).not.toContain('align-top');
    expect(html).not.toContain('pt-[54px]');
    expect(html).toContain('还没有分组规则');
  });

  it('renders three-signal evidence context before group authoring', () => {
    const html = renderToStaticMarkup(
      <AlertGroupSurface
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
          title: '来自指标的分组上下文',
          copy: '新建分组时会按当前实体、服务、命名空间和环境做收敛。',
          groupLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment',
          returnHref: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout',
          rows: [
            { label: '当前实体', value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: '链路上下文', value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: '指标 checkout 分组',
            groupLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment'
          }
        }}
        draft={{
          name: '',
          enable: true,
          groupLabelsText: '',
          groupWait: '30',
          groupInterval: '300',
          repeatInterval: '14400'
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-group-evidence-context="signal-route"');
    expect(html).toContain('data-alert-group-evidence-signal="metrics"');
    expect(html).toContain('data-alert-group-prefill-labels="hertzbeat.entity.id, service.name, service.namespace, deployment.environment"');
    expect(html).toContain('来自指标的分组上下文');
    expect(html).toContain('返回排障上下文');
    expect(html).toContain('href="/metrics/manage?entityId=service%3Acommerce%2Fcheckout"');
    expect(html).toContain('当前实体');
    expect(html).toContain('链路上下文');
  });

  it('renders validation errors visibly inside the group editor dialog', () => {
    const html = renderToStaticMarkup(
      <AlertGroupSurface
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
          groupLabelsText: '',
          groupWait: '30',
          groupInterval: '300',
          repeatInterval: '14400'
        }}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        onNew={vi.fn()}
        onSave={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCloseEditor={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-group-editor-error-inline="cold-validation"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('请填写策略名称');
  });
});
