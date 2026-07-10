import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertSettingSurface } from './alert-setting-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../workbench/primitives', () => ({
  SurfaceSection: ({ title, children }: any) => (
    <section data-panel="true">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
  WorkbenchTableFrame: ({ children, ...props }: any) => <div data-table-frame="true" {...props}>{children}</div>,
  WorkbenchToolbarAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
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

describe('AlertSettingSurface', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const alertSettingEvidenceTitle = (signal: 'logs' | 'traces' | 'metrics') =>
    t('alert.rule.evidence.setting.title', { signal: t(`alert.rule.signal.${signal}`) });

  const data = {
    list: {
      content: [
        {
          id: 7,
          name: 'cpu threshold',
          type: 'realtime_metric',
          datasource: 'promql',
          expr: 'cpu_usage > 80',
          template: 'OpsTemplate',
          labels: { severity: 'warning', team: 'core' },
          enable: true,
          gmtUpdate: 1713200000000
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    },
    datasourceStatus: {
      code: 0,
      data: { promql: true }
    }
  };

  it('renders the OTLP UI Lab alert-setting console and define table posture', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search="cpu"
        checkedIds={[7]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-surface="otlp-hertzbeat-ui-setting-console"');
    expect(html).toContain('data-alert-setting-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-alert-setting-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-alert-setting-capability-summary="realtime-ready-periodic-ready"');
    expect(html).toContain('data-alert-setting-capability-owner="alert-threshold-create-entry"');
    expect(html).toContain('data-alert-setting-capability-periodic="ready"');
    expect(html).toContain('data-alert-setting-capability-item="realtime"');
    expect(html).toContain('data-alert-setting-capability-item="periodic"');
    expect(html).toContain(t('alert.setting.capability.realtime.ready'));
    expect(html).toContain(t('alert.setting.capability.periodic.ready'));
    expect(html).toContain('data-alert-setting-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-alert-setting-command-row="standard-equal-buttons"');
    [
      'refresh',
      'new',
      'delete-selected',
      'export',
      'import',
      'row-enable',
      'row-edit',
      'row-delete'
    ].forEach(commandAction => {
      expect(html).toContain(`data-alert-setting-command-action="${commandAction}"`);
    });
    expect(html.match(/data-alert-setting-action-help-trigger="hertzbeat-ui-action-help"/g)?.length).toBe(9);
    expect(html.match(/data-alert-setting-action-help-style="icon-after-action"/g)?.length).toBe(9);
    expect(html.match(/data-alert-setting-action-help-visual="circle-help-icon"/g)?.length).toBe(9);
    expect(html.match(/data-alert-setting-action-help-icon="lucide-circle-help"/g)?.length).toBe(6);
    expect(html.match(/data-alert-setting-action-help="hertzbeat-ui-action-tooltip"/g)?.length).toBe(9);
    expect(html.match(/data-hz-batch-action-help-visual="circle-help-icon"/g)?.length).toBe(3);
    expect(html.match(/data-hz-batch-action-help-icon="lucide-circle-help"/g)?.length).toBe(3);
    expect(html).toContain('lucide-circle-help');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('rounded-none border-0 bg-transparent');
    expect(html).not.toContain('rounded-full border border-[#2b3039] bg-[#101217]');
    [
      'refresh',
      'new',
      'delete',
      'batch-export',
      'batch-import',
      'batch-delete',
      'row-enable',
      'row-edit',
      'row-delete'
    ].forEach(actionKey => {
      expect(html).toContain(`data-alert-setting-action-help-key="${actionKey}"`);
      expect(html).toContain('data-alert-setting-action-help-placement="inline-action"');
    });
    [
      'row-enable',
      'row-edit',
      'row-delete'
    ].forEach(actionKey => {
      expect(html).toContain(`data-alert-setting-row-action-help="${actionKey}"`);
      expect(html).toContain(t(`alert.setting.action.${actionKey}.help`));
      expect(html).toContain(t(`alert.setting.action.${actionKey}.impact`));
    });
    expect(html).toContain(t('alert.setting.action.refresh.help'));
    expect(html).toContain(t('alert.setting.action.refresh.impact'));
    expect(html).toContain(t('alert.setting.action.new.help'));
    expect(html).toContain(t('alert.setting.action.new.impact'));
    expect(html).toContain(t('alert.setting.action.delete.help'));
    expect(html).toContain(t('alert.setting.action.delete.impact'));
    expect(html).toContain(t('alert.setting.action.export.help'));
    expect(html).toContain(t('alert.setting.action.export.impact'));
    expect(html).toContain(t('alert.setting.action.import.help'));
    expect(html).toContain(t('alert.setting.action.import.impact'));
    expect(html).toContain('data-alert-setting-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-setting-toolbar="hertzbeat-ui-query-toolbar"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-layout="compact-detached-button"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-alert-setting-search-translation-contract="angular-app-entry-search"');
    expect(html).toContain('data-alert-setting-search-translation-owner="alert-setting-query-state"');
    expect(html).toContain('data-alert-setting-search-translation-source="/apps/defines"');
    expect(html).not.toContain('data-hz-search-input-shell');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-alert-setting-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-alert-setting-table-layout="fixed-truncate"');
    expect(html).toContain('min-w-0 max-w-full overflow-hidden');
    expect(html).not.toContain('min-w-[1040px]');
    expect(html).toContain('class="block truncate"');
    expect(html).toContain('data-alert-setting-batch-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-alert-setting-import-export-contract="angular-import-export"');
    expect(html).not.toContain('data-alert-setting-batch-action-help-row="hertzbeat-ui-action-help"');
    expect(html).toContain('data-hz-batch-action-help="export-type"');
    expect(html).toContain('data-hz-batch-action-help="import"');
    expect(html).toContain('data-hz-batch-action-help="delete"');
    expect(html).toContain('data-alert-setting-export-trigger-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-alert-setting-import-trigger-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-alert-setting-delete-trigger-owner="hertzbeat-ui-batch-toolbar"');
    expect(html).toContain('data-hz-ui="batch-toolbar"');
    expect(html).toContain('data-hz-batch-action="export-type"');
    expect(html).toContain('data-hz-batch-action="import"');
    expect(html).toContain('data-hz-batch-action="delete"');
    expect(html).toContain('data-alert-setting-pagination="angular-nz-table-server"');
    expect(html).toContain('data-alert-setting-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-alert-setting-pagination-contract="angular-page-index-size"');
    expect(html).toContain('data-alert-setting-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-setting-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-alert-setting-pagination-action="previous"');
    expect(html).toContain('data-alert-setting-pagination-action="next"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain(t('common.button.export'));
    expect(html).toContain(t('common.button.import'));
    expect(html).toContain('data-alert-setting-select-all="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-setting-row-checkbox="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-alert-setting-enable-checkbox="hertzbeat-ui-checkbox"');
    expect(html.match(/data-hz-checkbox-owner="hertzbeat-ui-checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain(t('menu.alert.setting'));
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('alert.setting.action.new'));
    expect(html).toContain(t('common.button.delete-batch'));
    expect(html).toContain(t('common.search'));
    expect(html).toContain(t('alert.setting.name'));
    expect(html).toContain(t('alert.setting.type'));
    expect(html).toContain(t('alert.setting.expr'));
    expect(html).toContain(t('alert.setting.content'));
    expect(html).toContain(t('alert.setting.bind-labels'));
    expect(html).toContain('cpu threshold');
    expect(html).toContain(t('alert.setting.type.realtime.metric'));
    expect(html).toContain('severity:warning');
    expect(html).toContain('team:core');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('angular-table');
    expect(html).not.toContain('angular-table-panel');
    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzBatchToolbar');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-alert-setting-admin-layout="full-width-admin-list"');
    expect(source).not.toContain('className={coldSettingVisual.search.input}');
    expect(source).not.toContain('className={coldSettingVisual.search.row}');
    expect(source).not.toContain('accent-[#4e74f8]');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('coldSettingVisual.layout.heroGrid');
    expect(source).not.toContain('coldSettingVisual.layout.railGrid');
    expect(source).not.toContain('coldSettingVisual.signal.band');
    expect(source).not.toContain('coldSettingVisual.panel.rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfaceTableShell');
    expect(source).not.toContain('AlertSurfaceTable');
    expect(source).not.toContain('AlertSurfaceCheckboxLabel');
    expect(source).not.toContain('facts={[]}');
    expect(source).not.toContain('className="min-h-[680px] overflow-hidden p-0"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('buildAlertSettingFacts');
    expect(source).not.toContain('data-alert-setting-overflow-actions="true"');
    expect(source).toContain('CircleHelp');
    expect(source).toContain('data-alert-setting-action-help-style="icon-after-action"');
    expect(source).toContain('data-alert-setting-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-alert-setting-action-help-icon="lucide-circle-help"');
    expect(source).toContain('rounded-none border-0 bg-transparent');
    expect(source).not.toContain('rounded-full border border-[#2b3039] bg-[#101217]');
    expect(source).toContain('data-alert-setting-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('className={coldSettingVisual.panel.hero}');
  });

  it('keeps alert setting pagination aligned with visible rows when the server total is stale', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={{
          ...data,
          list: {
            ...data.list,
            totalElements: 0
          }
        } as any}
        search="cpu"
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain(t('common.pagination.summary', { page: 1, totalPages: 1, from: 1, to: 1, total: 1 }));
    expect(html).not.toContain('· - / 1');
    expect(html).not.toContain('· - / 0');
  });

  it('shows periodic runtime parameters in the dense rule list for load-aware scanning', () => {
    const runtimeSummary = [
      t('alert.setting.runtime.period', { period: 300 }),
      t('alert.setting.runtime.times', { times: 3 }),
      t('alert.setting.runtime.priority', { priority: 2 })
    ].join(' · ');
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={{
          ...data,
          list: {
            content: [
              {
                id: 9,
                name: 'periodic threshold',
                type: 'periodic_metric',
                datasource: 'promql',
                expr: 'vector(0)',
                template: 'PeriodicTemplate',
                labels: {},
                enable: true,
                period: 300,
                times: 3,
                priority: 2,
                gmtUpdate: 1713200000000
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        } as any}
        search="periodic"
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain(t('alert.setting.type.periodic.metric'));
    expect(html).toContain('data-alert-setting-runtime-summary="period-times-priority"');
    expect(html).toContain(runtimeSummary);
  });

  it('surfaces blocked periodic authoring capability before opening the create dialog', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={{
          ...data,
          datasourceStatus: { code: 1, msg: 'executor unavailable', data: {} }
        } as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-capability-summary="realtime-ready-periodic-blocked"');
    expect(html).toContain('data-alert-setting-capability-periodic="blocked"');
    expect(html).toContain(t('alert.setting.capability.realtime.ready'));
    expect(html).toContain(t('alert.setting.capability.periodic.blocked'));
  });

  it('renders shared inline feedback for alert setting import and export actions', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[7]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        pendingActionId="import"
        actionFeedback={{ tone: 'info', title: t('common.notify.import-submitted', { taskName: 'rules.json' }) }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="info"');
    expect(html).toContain('data-alert-setting-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('data-hz-feedback-tone="info"');
    expect(html).toContain(t('common.notify.import-submitted', { taskName: 'rules.json' }));
  });

  it('marks successful enable toggles with inline feedback and the updated row state', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'success',
          title: t('alert.setting.enable.success.title', { name: 'cpu threshold' }),
          description: t('alert.setting.enable.success.disabled'),
          contract: 'enable-success',
          toggledRule: {
            id: 7,
            name: 'cpu threshold',
            enabled: false
          }
        }}
      />
    );

    expect(html).toContain('data-alert-setting-enable-success="rule-enable-state-confirmed"');
    expect(html).toContain('data-alert-setting-enable-success-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-enable-success-state="disabled"');
    expect(html).toContain('data-alert-setting-enabled-row="write-confirmed"');
    expect(html).toContain('data-alert-setting-enabled-row-state="disabled"');
    expect(html).toContain(t('alert.setting.enable.success.title', { name: 'cpu threshold' }));
    expect(html).toContain(t('alert.setting.enable.success.disabled'));
  });

  it('keeps the route-requested page size visible when backend page metadata falls back', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        requestedPageSize={15}
      />
    );

    expect(html).toContain('data-alert-setting-pagination-contract="angular-page-index-size"');
    expect(html).toContain(`aria-label="${t('common.page-size')}"`);
    expect(html).toContain('>15</span>');
  });

  it('renders Angular import success and failure notification markers', () => {
    const successHtml = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{ tone: 'success', title: 'common.notify.import-success', contract: 'import-success' }}
      />
    );
    const failureHtml = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'critical',
          title: 'common.notify.import-fail',
          description: 'backend-message',
          contract: 'import-fail'
        }}
      />
    );

    expect(successHtml).toContain('data-alert-setting-import-success="angular-notify-title"');
    expect(successHtml).toContain('data-alert-setting-import-success-owner="hertzbeat-ui-inline-feedback"');
    expect(successHtml).toContain('data-alert-setting-import-feedback-title="common.notify.import-success"');
    expect(failureHtml).toContain('data-alert-setting-import-failure="angular-notify-title-detail"');
    expect(failureHtml).toContain('data-alert-setting-import-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(failureHtml).toContain('data-alert-setting-import-feedback-title="common.notify.import-fail"');
    expect(failureHtml).toContain('data-alert-setting-import-feedback-detail="backend-message"');
  });

  it('renders Angular title/detail markers for alert setting delete failures', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[7]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'critical',
          title: 'common.notify.delete-fail',
          description: 'backend-message',
          contract: 'delete'
        }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="critical"');
    expect(html).toContain('data-alert-setting-delete-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-setting-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-alert-setting-delete-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular title/detail markers for alert setting enable failures', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'critical',
          title: 'common.notify.edit-fail',
          description: 'backend-message',
          contract: 'enable'
        }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="critical"');
    expect(html).toContain('data-alert-setting-enable-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-setting-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-enable-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-alert-setting-enable-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('renders Angular title/detail markers for alert setting export failures', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'critical',
          title: 'common.notify.export-fail',
          description: 'backend-message',
          contract: 'export-fail'
        }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="critical"');
    expect(html).toContain('data-alert-setting-export-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-setting-export-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-export-feedback-title="common.notify.export-fail"');
    expect(html).toContain('data-alert-setting-export-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('keeps batch delete clickable for Angular no-select warning feedback', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'warning',
          title: 'common.notify.no-select-delete',
          contract: 'no-select-delete'
        }}
      />
    );

    expect(html).toContain('data-alert-setting-no-select-delete-trigger="angular-warning"');
    expect(html).not.toContain('data-alert-setting-no-select-delete-trigger="angular-warning" disabled=""');
    expect(html).toContain('data-alert-setting-no-select-delete="angular-warning"');
    expect(html).toContain('data-alert-setting-no-select-delete-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('common.notify.no-select-delete');
  });

  it('renders Angular no-select export warning markers on the shared feedback surface', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'warning',
          title: 'common.notify.no-select-export',
          contract: 'no-select-export'
        }}
      />
    );

    expect(html).toContain('data-alert-setting-no-select-export-trigger="angular-warning"');
    expect(html).toContain('data-alert-setting-no-select-export="angular-warning"');
    expect(html).toContain('data-alert-setting-no-select-export-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('common.notify.no-select-export');
  });

  it('renders save success confirmation and highlights the matching refreshed rule row', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'success',
          title: t('alert.setting.save.success.title', { name: 'cpu threshold' }),
          description: t('alert.setting.save.success.enabled'),
          contract: 'save-success',
          savedRule: {
            name: 'cpu threshold',
            type: 'realtime_metric',
            expr: 'cpu_usage > 80',
            enabled: true,
            intent: 'create'
          }
        }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="success"');
    expect(html).toContain('data-alert-setting-save-success="rule-write-confirmed"');
    expect(html).toContain('data-alert-setting-save-success-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-save-feedback-title="alert.setting.save.success.title"');
    expect(html).toContain('data-alert-setting-save-feedback-detail="enabled"');
    expect(html).toContain('data-alert-setting-saved-row="write-confirmed"');
    expect(html).toContain('data-alert-setting-saved-row-enabled="true"');
    expect(html).toContain(t('alert.setting.save.success.title', { name: 'cpu threshold' }));
    expect(html).toContain(t('alert.setting.save.success.enabled'));
  });

  it('renders delete success confirmation with the deleted rule count', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
        actionFeedback={{
          tone: 'success',
          title: t('alert.setting.delete.success.title', { count: 2 }),
          description: t('alert.setting.delete.success.description'),
          contract: 'delete-success',
          deletedCount: 2
        }}
      />
    );

    expect(html).toContain('data-alert-setting-action-feedback="success"');
    expect(html).toContain('data-alert-setting-delete-success="rule-delete-confirmed"');
    expect(html).toContain('data-alert-setting-delete-success-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-delete-success-count="2"');
    expect(html).toContain(t('alert.setting.delete.success.title', { count: 2 }));
    expect(html).toContain(t('alert.setting.delete.success.description'));
  });

  it('keeps the empty state inside the cold dense setting table body', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={{
          list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 },
          datasourceStatus: { code: 0, data: {} }
        } as any}
        search=""
        checkedIds={[]}
        formatTime={() => '-'}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-alert-setting-empty-state="hertzbeat-ui-table-empty"');
    expect(html).toContain('data-alert-setting-empty-layout="visible-table-start"');
    expect(html).toContain('data-alert-setting-empty-icon="hertzbeat-ui-empty-box"');
    expect(html).toContain('data-alert-setting-empty-risk-copy="connect-or-import-before-enable"');
    expect(html).toContain('data-alert-setting-empty-actions="create-import-connect"');
    expect(html).toContain('data-alert-setting-empty-action="create-realtime"');
    expect(html).toContain('data-alert-setting-empty-action="import-rules"');
    expect(html).toContain('data-alert-setting-empty-action="connect-data"');
    expect(html).toContain('data-alert-setting-command-action="empty-create-realtime"');
    expect(html).toContain('data-alert-setting-command-action="empty-import-rules"');
    expect(html).toContain('data-alert-setting-command-action="empty-connect-data"');
    expect(html).toContain('href="/monitors"');
    expect(html).toContain(t('alert.setting.empty.title'));
    expect(html).toContain(t('alert.setting.empty.copy'));
    expect(html).toContain(t('alert.setting.empty.action.create-realtime'));
    expect(html).toContain(t('alert.setting.empty.action.import'));
    expect(html).toContain(t('alert.setting.empty.action.connect-data'));
    expect(html).toContain(t('common.pagination.summary', { page: 1, totalPages: 1, from: 0, to: 0, total: 0 }));
    expect(html).not.toContain('· - / 0');
  });

  it('shows three-signal evidence context before alert-rule authoring', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={data as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        evidenceContext={{
          signal: 'traces',
          title: alertSettingEvidenceTitle('traces'),
          copy: t('alert.rule.evidence.setting.copy'),
          labelsText: 'hertzbeat.signal:traces, service.name:checkout',
          returnHref: '/trace/manage?traceId=trace-123',
          rows: [
            { label: t('signal.context.entity.label'), value: 'Checkout API', meta: 'entityId 7' },
            { label: t('signal.context.trace.label'), value: 'trace-123', meta: 'spanId span-456' }
          ],
          workflowActions: [
            {
              key: 'notice',
              label: t('alert.center.operation.notice.label'),
              copy: t('alert.center.operation.notice.copy'),
              href: '/alert/notice?signal=traces&traceId=trace-123&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123'
            },
            {
              key: 'group',
              label: t('alert.center.operation.group.label'),
              copy: t('alert.center.operation.group.copy'),
              href: '/alert/group?signal=traces&traceId=trace-123&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123'
            },
            {
              key: 'silence',
              label: t('alert.center.operation.silence.label'),
              copy: t('alert.center.operation.silence.copy'),
              href: '/alert/silence?signal=traces&traceId=trace-123&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123'
            },
            {
              key: 'inhibit',
              label: t('alert.center.operation.inhibit.label'),
              copy: t('alert.center.operation.inhibit.copy'),
              href: '/alert/inhibit?signal=traces&traceId=trace-123&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123'
            }
          ]
        }}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-evidence-context="signal-route"');
    expect(html).toContain('data-alert-setting-evidence-layering="flat-context-band"');
    expect(html).toContain('data-alert-setting-evidence-density="compact-strip"');
    expect(html).toContain('data-alert-setting-evidence-signal="traces"');
    expect(html).toContain('data-alert-setting-prefill-labels="hertzbeat.signal:traces, service.name:checkout"');
    expect(html).toContain('data-alert-setting-evidence-labels-layout="inline-strip"');
    expect(html).toContain('data-alert-setting-evidence-facts-layout="inline-chips"');
    expect(html).toContain('data-alert-setting-evidence-fact="compact-chip"');
    expect(html).not.toContain('shadow-[0_18px_48px_rgba(0,0,0,0.24)]');
    expect(html).not.toContain('rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3');
    expect(html).not.toContain('mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5');
    expect(html).not.toContain('mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4');
    expect(html).toContain(alertSettingEvidenceTitle('traces'));
    expect(html).toContain(t('alert.rule.evidence.setting.copy'));
    expect(html).toContain('data-alert-setting-evidence-return="true"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain(t('signal.context.entity.label'));
    expect(html).toContain(t('signal.context.trace.label'));
    expect(html).toContain('data-alert-setting-workflow-actions="signal-alert-next-steps"');
    expect(html).toContain('data-alert-setting-workflow-actions-owner="signal-alert-handoff"');
    expect(html).toContain('data-alert-setting-workflow-actions-layout="secondary-inline-row"');
    expect(html).toContain('data-alert-setting-workflow-action="notice"');
    expect(html).toContain('data-alert-setting-workflow-action="group"');
    expect(html).toContain('data-alert-setting-workflow-action="silence"');
    expect(html).toContain('data-alert-setting-workflow-action="inhibit"');
    expect(html).toContain('href="/alert/notice?signal=traces&amp;traceId=trace-123&amp;returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123"');
    expect(html).toContain('href="/alert/group?signal=traces&amp;traceId=trace-123&amp;returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123"');
    expect(html).toContain(t('alert.center.operation.notice.label'));
    expect(html).toContain(t('alert.center.operation.group.label'));
  });

  it('renders alert setting evidence and row label gaps with the localized empty fallback', () => {
    const html = renderToStaticMarkup(
      <AlertSettingSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 8,
                name: 'empty threshold',
                type: 'realtime_metric',
                datasource: 'promql',
                expr: '',
                template: '',
                labels: {},
                enable: false
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          },
          datasourceStatus: {
            code: 0,
            data: { promql: true }
          }
        } as any}
        search=""
        checkedIds={[]}
        formatTime={() => '2026-04-20 00:20:00'}
        evidenceContext={{
          signal: 'metrics',
          title: alertSettingEvidenceTitle('metrics'),
          copy: t('alert.rule.evidence.setting.copy'),
          labelsText: '',
          rows: [],
          workflowActions: []
        }}
        onSearchChange={vi.fn()}
        onApplyFilter={vi.fn()}
        onClearFilter={vi.fn()}
        onRefresh={vi.fn()}
        onNew={vi.fn()}
        onDeleteSelected={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCheckedIdsChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-evidence-labels="localized-fallback"');
    expect(html).toContain('data-alert-setting-empty-labels="localized-fallback"');
    expect(html).toContain(`>${t('common.none')}</div>`);
    expect(html).toContain(`>${t('common.none')}</span>`);
    expect(html).not.toContain('>-</div>');
    expect(html).not.toContain('>-</span>');
  });
});
