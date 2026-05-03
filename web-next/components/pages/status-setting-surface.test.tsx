import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('status setting surface', () => {
  it('renders the cold-matte status page org form, tabs, toolbar, and component table', async () => {
    const { StatusSettingSurface } = await import('./status-setting-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN'
    });

    const html = renderToStaticMarkup(
      <StatusSettingSurface
        t={t}
        data={{
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0, home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev' },
          components: [{ id: 1, name: 'API', description: 'public api', state: 0, method: 1, labels: { source: 'codex-smoke' }, gmtUpdate: 1712730000000 }],
          incidents: {
            content: [{ id: 2, name: 'Incident A', state: 1, components: [{ id: 1 }], contents: [{ message: 'Investigating', state: 1, timestamp: 10 }], pageIndex: 0 }],
            totalElements: 17,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        mode="component"
        editingOrg
        orgDraft={{ name: 'HB Status', state: '0', description: 'Service health', home: 'https://hb.dev', feedback: 'mailto:ops@hb.dev', logo: '', color: '' }}
        savingOrg={false}
        orgMessage={null}
        orgError={null}
        editingComponent
        componentDraft={{ name: 'API', description: 'public api', labelsText: 'env:prod', method: '1', configState: '0', state: '0' }}
        savingComponent={false}
        componentMessage={null}
        componentError={null}
        selectedComponentId={1}
        editingIncident={false}
        incidentDraft={{ name: '', state: '0', componentIdsText: '', message: '' }}
        savingIncident={false}
        incidentMessage={null}
        incidentError={null}
        selectedIncidentId={2}
        incidentSearchInput=""
        formatTime={() => '2026-04-10 18:00:00'}
        publicStatusHref="/status"
        onEditOrg={() => {}}
        onModeChange={() => {}}
        onNewComponent={() => {}}
        onEditComponent={() => {}}
        onDeleteComponent={() => {}}
        onNewIncident={() => {}}
        onEditIncident={() => {}}
        onDeleteIncident={() => {}}
        onOrgDraftChange={() => {}}
        onSaveOrg={() => {}}
        onCancelOrg={() => {}}
        onComponentDraftChange={() => {}}
        onSaveComponent={() => {}}
        onCancelComponent={() => {}}
        onSelectComponent={() => {}}
        onIncidentDraftChange={() => {}}
        onSaveIncident={() => {}}
        onCancelIncident={() => {}}
        onSelectIncident={() => {}}
        onIncidentSearchInputChange={() => {}}
        onCommitIncidentSearch={() => {}}
        onResetIncidentSearch={() => {}}
        onIncidentPageSizeChange={() => {}}
        onIncidentPrevious={() => {}}
        onIncidentNext={() => {}}
      />
    );

    expect(html).toContain('data-status-setting-surface="otlp-cold-status-console"');
    expect(html).toContain('data-status-setting-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-status-header="cold-compact-header"');
    expect(html).toContain('data-status-command-row="standard-equal-buttons"');
    expect(html).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-status-org-form="cold-settings-form"');
    expect(html).toContain('data-status-tabs="cold-segmented-tabs"');
    expect(html).toContain('data-status-component-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-status-incident-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-status-component-table-shell="cold-dense-table"');
    expect(html).toContain('data-status-component-table="cold-component-table"');
    expect(html).toContain('data-status-component-row-actions="cold-icon-actions"');
    expect(html).not.toContain('data-status-summary-rail=');
    expect(html).toContain('状态页面');
    expect(html).toContain('组织名称');
    expect(html).toContain('组织介绍');
    expect(html).toContain('网站链接');
    expect(html).toContain('标志图片');
    expect(html).toContain('反馈地址');
    expect(html).toContain('主题颜色');
    expect(html).toContain('服务组件');
    expect(html).toContain('维护事件');
    expect(html).toContain('HB Status');
    expect(html).toContain('/status');
    expect(html).toContain('新增组件');
    expect(html).toContain('组件状态');
    expect(html).toContain('状态统计方式');
    expect(html).toContain('匹配标签');
    expect(html).toContain('更新时间');
    expect(html).toContain('操作');
    expect(html).toContain('API');
    expect(html).toContain('正常');
    expect(html).toContain('手动设置');
    expect(html).toContain('source:codex-smoke');
    expect(html).toContain('确定');
  });

  it('uses the shared cold visual owner instead of Workbench or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/status-setting-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('data-status-incident-search-owner="shared-search-row"');
    expect(source).toContain('inputWidthClassName="w-[320px]"');
    expect(source).toContain('data-status-setting-surface="otlp-cold-status-console"');
    expect(source).toContain('data-status-setting-style-baseline={coldStatusVisual.canvasName}');
    expect(source).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-status-org-form="cold-settings-form"');
    expect(source).toContain('data-status-component-table-shell="cold-dense-table"');
    expect(source).toContain('data-status-component-table="cold-component-table"');
    expect(source).toContain('data-status-component-delete-confirm-trigger="cold-modal"');
    expect(source).toContain('data-status-incident-delete-confirm-trigger="cold-modal"');
    expect(source).toContain('data-status-delete-confirm="cold-modal"');
    expect(source).toContain('data-status-delete-confirm-kind');
    expect(source).toContain('确认删除组件');
    expect(source).toContain('确认删除维护事件');
    expect(source).toContain('确认删除');
    expect(source).toContain('取消');
    expect(source).not.toContain('data-status-summary-rail');
    expect(source).not.toContain('coldStatusVisual.layout.heroGrid');
    expect(source).not.toContain('coldStatusVisual.layout.railGrid');
    expect(source).not.toContain('coldStatusVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('alert-surface-primitives');
    expect(source).not.toContain('data-status-setting-route="angular-status-page"');
    expect(source).not.toContain('data-status-org-form="angular-vertical-form"');
    expect(source).not.toContain('data-status-component-table-shell="angular-table"');
    expect(source).not.toContain('data-status-component-table="angular-nz-table"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('coldStatusVisual.search.row');
    expect(source).not.toContain('coldStatusVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('buildStatusFacts');
    expect(source).not.toContain('buildStatusOrgOverviewRows');
    expect(source).not.toContain('buildStatusComponentEvidenceRows');
    expect(source).not.toContain('border-[hsl(var(--input))]');
    expect(source).not.toContain('bg-[hsl(var(--secondary)/0.7)]');
    expect(source).not.toContain('text-[hsl(var(--foreground))]');
    expect(source).not.toContain('focus-visible:border-[hsl(var(--ring)/0.34)]');
    expect(source).not.toContain('focus-visible:bg-[hsl(var(--card))]');
    expect(source).not.toContain('focus-visible:ring-[hsl(var(--ring)/0.12)]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('text-white/52');
    expect(source).not.toContain('rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3');

    expect(source).toContain('border-[#2b3039]');
    expect(source).toContain('text-[#a9b0bb]');
    expect(source).toContain('text-[#858d9a]');
  });
});
