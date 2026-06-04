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
  function groupEvidenceTitle(signal: 'logs' | 'traces' | 'metrics') {
    return t('alert.rule.evidence.group.title', { signal: t(`alert.rule.signal.${signal}`) });
  }
  function groupEvidenceDraftName(signal: 'logs' | 'traces' | 'metrics', target: string) {
    return t('alert.rule.evidence.group.draft-name', { signal: t(`alert.rule.signal.${signal}`), target });
  }

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
          title: groupEvidenceTitle('traces'),
          copy: t('alert.rule.evidence.group.copy'),
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
    expect(html).toContain('data-alert-group-style-baseline="hertzbeat-ui-matte"');
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
    expect(html).toContain('data-alert-group-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-group-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-group-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-group-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-alert-group-select-current-page="table-header"');
    expect(html).toContain('data-alert-group-select-current-page-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-alert-group-row-checkbox="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-group-enable-checkbox="hertzbeat-ui-checkbox"');
    expect(html.match(/data-hz-checkbox-owner="hertzbeat-ui-checkbox"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('alert.group.action.new'));
    expect(html).toContain(t('common.search'));
    expect(html).toContain('data-alert-group-delete-selected="toolbar"');
    expect(html).toContain('data-alert-group-delete-selected-owner="route-no-select-warning"');
    expect(html).toContain(t('alert.group.title'));
    expect(html).toContain(t('alert.group.copy'));
    expect(html).toContain(t('alert.group-converge.name'));
    expect(html).toContain(t('alert.group-converge.group-labels'));
    expect(html).toContain('ops-group');
    expect(html).toContain('alertname');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-group-authoring-fields="workspace"');
    expect(html).toContain('data-alert-group-editor-return="evidence-context"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain('data-label-options="alertname|instance|job"');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzCheckbox');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('handleSelectCurrentPage');
    expect(source).toContain('onCheckedIdsChange(Array.from(new Set([...checkedIds, ...currentPageIds])))');
    expect(source).toContain('onCheckedIdsChange(checkedIds.filter(id => !currentPageIdSet.has(id)))');
    expect(source).toContain('data-alert-group-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).not.toContain('disabled={selectedCount === 0}');
    expect(source).toContain('labelOptions?: AlertLabelOptions');
    expect(source).toContain('pageSizeOptions?: number[]');
    expect(source).toContain('onPageIndexChange?: (nextPageIndex: number) => void');
    expect(source).toContain('onPageSizeChange?: (nextPageSize: number) => void');
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
    expect(html).toContain('data-alert-group-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-group-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-group-empty-icon="cold-empty-box"');
    expect(html).toContain('data-alert-group-empty-copy="true"');
    expect(html).not.toContain('align-top');
    expect(html).not.toContain('pt-[54px]');
    expect(html).toContain(t('alert.group.empty.title'));
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
          title: groupEvidenceTitle('metrics'),
          copy: t('alert.rule.evidence.group.copy'),
          groupLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment',
          returnHref: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout',
          rows: [
            { label: t('signal.context.entity.label'), value: 'checkout', meta: 'entityId service:commerce/checkout' },
            { label: t('signal.context.trace.label'), value: 'trace-123', meta: 'spanId span-456' }
          ],
          draftPatch: {
            name: groupEvidenceDraftName('metrics', 'checkout'),
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
    expect(html).toContain(groupEvidenceTitle('metrics'));
    expect(html).toContain(t('alert.rule.evidence.return'));
    expect(html).toContain('href="/metrics/manage?entityId=service%3Acommerce%2Fcheckout"');
    expect(html).toContain(t('signal.context.entity.label'));
    expect(html).toContain(t('signal.context.trace.label'));
  });

  it('renders missing group evidence labels with the localized empty fallback', () => {
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
          signal: 'logs',
          title: groupEvidenceTitle('logs'),
          copy: t('alert.rule.evidence.group.copy'),
          groupLabelsText: '',
          returnHref: '/log/manage?entityId=service-1',
          rows: [],
          draftPatch: {
            groupLabelsText: ''
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
    expect(html).toContain('data-alert-group-evidence-labels="localized-fallback"');
    expect(html).toContain(t('common.none'));
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
        editorError={t('alert.group.validation.name')}
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
    expect(html).toContain(t('alert.group.validation.name'));
  });

  it('renders Angular alert group save failure title/detail through shared feedback', () => {
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
        editorError="common.notify.edit-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="save"
        draft={{
          id: 7,
          name: 'ops-group',
          enable: true,
          groupLabelsText: 'alertname',
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

    expect(html).toContain('data-alert-group-save-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-group-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-group-save-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-group-save-feedback-detail="backend-message"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular no-selection batch delete feedback outside the editor', () => {
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
        editorError={t('common.notify.no-select-delete')}
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

    expect(html).toContain('data-alert-group-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-group-action-feedback="warning"');
    expect(html).toContain('data-hz-feedback-tone="warning"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('common.notify.no-select-delete'));
  });

  it('renders Angular alert group enable failure title/detail outside the editor', () => {
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
        editorError="common.notify.edit-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="enable"
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

    expect(html).toContain('data-alert-group-enable-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-group-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-group-enable-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-group-enable-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular alert group delete failure title/detail outside the editor', () => {
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
        editorError="common.notify.delete-fail"
        editorErrorDetail="backend-message"
        editorErrorContract="delete"
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

    expect(html).toContain('data-alert-group-delete-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-group-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-group-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-alert-group-delete-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });
});
