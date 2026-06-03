import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const loadState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>)
}));

const apiMessageGet = vi.fn();
const loadStatusManagementData = vi.fn(async () => ({
  org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
  components: [{ id: 1, name: 'API' }],
  incidents: { content: [{ id: 2, name: 'Incident A' }], totalElements: 17, pageIndex: 0, pageSize: 8 }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'en-US' }),
    locale: 'en-US'
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load, loadingCopy }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown>; loadingCopy?: string }) => {
    loadState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
        {children({
          org: { id: 1, name: 'HB Status', description: 'Service health', state: 0 },
          components: [{ id: 1, name: 'API', description: 'public api', state: 0, gmtUpdate: 1712730000000 }],
          incidents: {
            content: [{ id: 2, name: 'Incident A', state: 1, components: [{ id: 1 }], contents: [], pageIndex: 0 }],
            totalElements: 17,
            pageIndex: 0,
            pageSize: 8
          }
        })}
      </div>
    );
  }
}));

vi.mock('@/components/pages/status-setting-surface', () => ({
  StatusSettingSurface: ({ publicStatusHref, mode }: any) => (
    <div data-status-setting-surface="otlp-cold-status-console" data-status-setting-style-baseline="hertzbeat-cold-matte">
      <section data-status-admin-layout="full-width-admin-list">
        <span>Status page table</span>
      </section>
      <span>{publicStatusHref}</span>
      <span>{mode}</span>
      <span>HB Status</span>
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  )
}));

vi.mock('@/components/workbench/selectable-evidence-list', () => ({
  SelectableEvidenceList: ({ rows }: any) => <div data-evidence-list="true">{rows.map((row: any) => row.title).join('|')}</div>
}));

vi.mock('@/components/workbench/toolbar', () => ({
  ToolbarField: ({ label, children }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToolbarInput: (props: any) => <input {...props} />,
  ToolbarRow: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'button'
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  MetricGrid: ({ items }: any) => <div data-stat-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, tone }: any) => (
    <div data-workbench-page="true" data-tone={tone}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-actions="true">{actions}</div>
      <div data-main="true">{main}</div>
    </div>
  )
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/setting-status/view-model', () => ({
  buildStatusComponentDraft: () => ({ name: '', description: '', labelsText: '', method: '0', configState: '0', state: '0' }),
  buildStatusComponentEvidenceRows: (components: any[]) => components.map(component => ({
    key: String(component.id || component.name || 'component'),
    title: component.name || 'Component',
    copy: component.description || '-',
    meta: 'meta'
  })),
  buildStatusComponentPayload: (draft: any) => draft,
  buildStatusFacts: () => [{ label: 'Facts', value: '1' }],
  buildStatusIncidentDraft: () => ({ name: '', state: '0', componentIdsText: '', message: '' }),
  buildStatusIncidentEvidenceRows: (incidents: any) => incidents.content.map((incident: any) => ({
    key: String(incident.id || incident.name || 'incident'),
    title: incident.name || 'Incident',
    copy: 'latest message',
    meta: 'meta'
  })),
  buildStatusIncidentPayload: (draft: any) => draft,
  buildStatusMetrics: () => [{ label: 'Metrics', value: '1' }],
  buildStatusOrgDraft: () => ({ name: '', state: '0', description: '', home: '', feedback: '', logo: '', color: '' }),
  buildStatusOrgOverviewRows: () => [{ title: 'Org', copy: 'copy', meta: 'meta' }],
  buildStatusOrgPayload: (draft: any) => draft,
  buildStatusRows: () => [{ title: 'Row', copy: 'copy', meta: 'meta' }],
  validateStatusComponentDraft: () => null,
  validateStatusIncidentDraft: () => null,
  validateStatusOrgDraft: () => null
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/setting-status/controller', () => ({
  buildStatusIncidentListUrl: ({ search = '', pageIndex = 0, pageSize = 8 }: any = {}) => `/status/page/incident?pageIndex=${pageIndex}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`,
  createStatusPageComponent: vi.fn(),
  createStatusPageIncident: vi.fn(),
  deleteStatusPageComponent: vi.fn(),
  deleteStatusPageIncident: vi.fn(),
  loadStatusManagementData,
  saveStatusPageOrg: vi.fn(),
  updateStatusPageComponent: vi.fn(),
  updateStatusPageIncident: vi.fn()
}));

describe('setting status page', () => {
  it('renders the management page and loads incidents with the default server-side query', async () => {
    loadStatusManagementData.mockClear();
    apiMessageGet.mockReset();
    loadState.lastLoad = null;

    const { default: SettingStatusPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingStatusPage />);
    const lastLoad = loadState.lastLoad as (() => Promise<unknown>) | null;
    await lastLoad?.();

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-loading-copy="Loading status settings"');
    expect(html).toContain('data-status-setting-surface="otlp-cold-status-console"');
    expect(html).toContain('data-status-setting-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-status-summary-rail=');
    expect(html).not.toContain('data-status-setting-route="angular-status-page"');
    expect(html).not.toContain('data-status-header-public-link');
    expect(html).toContain('/status');
    expect(html).toContain('HB Status');
    expect(loadStatusManagementData).toHaveBeenCalledWith(apiMessageGet, {
      search: '',
      pageIndex: 0,
      pageSize: 8
    });
  }, 15000);

  it('keeps the route as load composition and leaves visual ownership in the shared surface', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/status/setting-status-page.tsx'), 'utf8');

    expect(source).toContain('StatusSettingSurface');
    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain("t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success')");
    expect(source).toContain("t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail')");
    expect(source).toContain("t('common.notify.delete-success')");
    expect(source).toContain("t('common.notify.delete-fail')");
    expect(source).toContain("t('status.component.notify.need-org')");
    expect(source).not.toContain("t('common.save-success')");
    expect(source).not.toContain("t('common.save-failed')");
    expect(source).not.toContain("t('common.delete-success')");
    expect(source).not.toContain("t('common.delete-failed')");
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('SelectableEvidenceList');
  });

  it('keeps status setting remounts on a short settled cache window while mutations invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/status/setting-status-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_STATUS_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-status', '/status/page/org', '/status/page/component', statusIncidentListUrl, refreshTick].join(':')");
    expect(source).toContain('void refreshTick');
    expect(source).toContain('setRefreshTick(value => value + 1)');
    expect(source).toContain("function handleModeChange(nextMode: 'component' | 'incident')");
    expect(source).toContain('onModeChange={handleModeChange}');
    expect(source).toContain('onIncidentPageIndexChange={nextPageIndex => setIncidentPageIndex(nextPageIndex)}');
    expect(source).toContain('setIncidentError(error instanceof Error ? error.message : t(isEdit ? \'common.notify.edit-fail\' : \'common.notify.new-fail\'))');
    expect(source).toContain('setEditingIncident(false);');
    expect(source).toContain('cacheKey={settingStatusCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_STATUS_SETTLED_CACHE_TTL_MS}');
  });
});
