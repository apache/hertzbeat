import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { AlertSettingRouteState } from '../../../lib/alert-setting/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  lastOnNew: null as null | (() => void),
  lastOnSubmit: null as null | ((payload: unknown) => Promise<void>),
  lastOnToggleEnabled: null as null | ((defineId: number, enabled: boolean) => void),
  lastOnEdit: null as null | ((defineId: number) => Promise<void> | void),
  lastOnExport: null as null | (() => void),
  lastOnImport: null as null | (() => void),
  push: vi.fn(),
  renderData: {
    list: {
      totalElements: 2,
      pageIndex: 0,
      pageSize: 8,
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
      ]
    },
    datasourceStatus: {
      code: 0,
      data: { promql: true }
    }
  }
}));

const apiGet = vi.hoisted(() => vi.fn());
const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessageDelete = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());

vi.mock('../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../components/pages/alert-setting-surface', () => ({
  AlertSettingSurface: ({
    data,
    search,
    evidenceContext,
    onNew,
    onExport,
    onImport,
    onToggleEnabled,
    onEdit
  }: {
    data: { list: { totalElements: number } };
    search: string;
    evidenceContext?: { signal: string; labelsText: string } | null;
    onNew: () => void;
    onExport: () => void;
    onImport: () => void;
    onToggleEnabled: (defineId: number, enabled: boolean) => void;
    onEdit: (defineId: number) => Promise<void> | void;
  }) => {
    mockState.lastOnNew = onNew;
    mockState.lastOnExport = onExport;
    mockState.lastOnImport = onImport;
    mockState.lastOnToggleEnabled = onToggleEnabled;
    mockState.lastOnEdit = onEdit;
    return (
      <div
        data-alert-setting-surface="true"
        data-total={data.list.totalElements}
        data-search={search}
        data-evidence-signal={evidenceContext?.signal || 'none'}
        data-prefill-labels={evidenceContext?.labelsText || ''}
      />
    );
  }
}));

vi.mock('../../../components/pages/alert-setting-create-dialog', () => ({
  AlertSettingCreateDialog: ({ open, mode, evidenceReturnHref, onSubmit }: any) => {
    mockState.lastOnSubmit = onSubmit;
    return <div data-alert-setting-create-dialog={open ? mode : 'closed'} data-evidence-return-href={evidenceReturnHref || ''} />;
  },
  createDefaultAlertSettingDraft: (kind = 'realtime', previous: any = {}) => ({
    id: previous.id,
    name: previous.name || '',
    kind,
    dataType: previous.dataType || 'metric',
    datasource: previous.datasource || 'promql',
    expr: previous.expr || '',
    template: previous.template || '',
    labelsText: previous.labelsText || '',
    enable: previous.enable ?? true,
    period: previous.period || '300',
    times: previous.times || '3',
    priority: previous.priority || '2'
  }),
  buildAlertSettingDraftFromDefine: (define: any) => ({
    id: define.id,
    name: define.name || '',
    kind: define.type?.startsWith('periodic_') ? 'periodic' : 'realtime',
    dataType: define.type?.endsWith('_trace') ? 'trace' : define.type?.endsWith('_log') ? 'log' : 'metric',
    datasource: define.datasource || 'promql',
    expr: define.expr || '',
    template: define.template || '',
    labelsText: Object.entries(define.labels || {}).map(([key, value]) => `${key}:${value}`).join(', '),
    enable: define.enable ?? true,
    period: String(define.period || 300),
    times: String(define.times || 3),
    priority: String(define.priority ?? 2)
  }),
  buildAlertSettingCreatePayload: (draft: any) => draft
}));

vi.mock('../../../lib/api-client', () => ({
  apiGet,
  apiMessageGet,
  apiMessageDelete,
  apiMessagePut,
  apiMessagePost: vi.fn(),
  getCurrentLocale: () => null
}));

async function renderAlertSettingPage(initialRouteState?: AlertSettingRouteState) {
  const { default: AlertSettingPage } = await import('./alert-setting-page');
  return renderToStaticMarkup(<AlertSettingPage initialRouteState={initialRouteState} />);
}

describe('alert setting page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.lastOnNew = null;
    mockState.lastOnSubmit = null;
    mockState.lastOnToggleEnabled = null;
    mockState.lastOnEdit = null;
    mockState.lastOnExport = null;
    mockState.lastOnImport = null;
    mockState.push.mockReset();
    apiGet.mockReset().mockResolvedValue(mockState.renderData.datasourceStatus);
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.list);
    apiMessageDelete.mockReset().mockResolvedValue(undefined);
    apiMessagePut.mockReset().mockResolvedValue(undefined);
  });

  it('loads the alert-define console through the shared route and surface contracts', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    const html = await renderAlertSettingPage();

    expect(html).toContain('data-alert-setting-surface="true"');
    expect(html).toContain('data-total="2"');
    expect(html).toContain('data-search=""');
    expect(html).toContain('data-loading-copy="Loading alert settings"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/apps/defines?lang=en_US');
    expect(apiMessageGet).toHaveBeenCalledWith('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiGet).toHaveBeenCalledWith('/alert/define/datasource/status');
    expect(source).toContain('loadAlertSettingDataFromFacade');
    expect(source).toContain('buildAlertSettingAppEntries');
    expect(source).toContain('api.alertSettings.appDefines');
    expect(source).toContain('api.alertSettings.list');
    expect(source).toContain('api.alertSettings.datasourceStatus');
    expect(source).not.toContain('loadAlertSettingData(apiGet, apiMessageGet');
  }, 30_000);

  it('maps alert setting search through Angular app-define translations before list reads', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('const appMap = await api.alertSettings.appDefines(getCurrentLocale()).catch(() => null)');
    expect(source).toContain('const appEntries = buildAlertSettingAppEntries(appMap)');
    expect(source).toContain('pageSize,');
    expect(source).toContain('appEntries');
  });

  it('keeps alert setting list pagination on the Angular server-side page index and page size contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('const [pageIndex, setPageIndex] = useState(0)');
    expect(source).toContain('const [pageSize, setPageSize] = useState(8)');
    expect(source).toContain('buildDefineListUrl(query, pageIndex, pageSize)');
    expect(source).toContain('setPageIndex(0);');
    expect(source).toContain('onPageIndexChange={nextPageIndex =>');
    expect(source).toContain('onPageSizeChange={nextPageSize =>');
    expect(source).toContain('setPageSize(nextPageSize)');
  });

  it('opens the local threshold create flow instead of routing to monitor define', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    expect(mockState.lastOnNew).toBeTypeOf('function');

    mockState.lastOnNew?.();

    expect(mockState.push).not.toHaveBeenCalled();
    expect(source).not.toContain("router.push('/setting/define')");
    expect(source).toContain('AlertSettingCreateDialog');
    expect(source).toContain('createAlertDefineFromFacade');
    expect(source).toContain('updateAlertDefineFromFacade');
    expect(source).toContain('api.alertSettings.create');
    expect(source).toContain('api.alertSettings.update');
  });

  it('uses the shared cold delete confirmation instead of leaving threshold delete actions as no-ops', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('ColdConfirmDialog');
    expect(source).toContain('deleteAlertDefineFromFacade');
    expect(source).toContain('deleteAlertDefinesFromFacade');
    expect(source).toContain('api.alertSettings.delete');
    expect(source).not.toContain('apiMessageDelete');
    expect(source).toContain('data-alert-delete-confirm');
    expect(source).not.toContain('onDeleteSelected={() => {}}');
    expect(source).not.toContain('onDelete={() => {}}');
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('window.alert');
    expect(source).not.toContain('alert(');
  });

  it('maps threshold delete failures to the Angular notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('common.notify.delete-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: 'delete'");
    expect(source).not.toContain("t('common.delete-failed')");
  });

  it('maps threshold save failures to the Angular create/edit notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: isEdit ? 'edit' : 'create'");
    expect(source).toContain('saveFeedback={saveFeedback}');
    expect(source).not.toContain("t('common.save-failed')");
  });

  it('maps threshold enable toggle failures to the Angular edit notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('updateAlertDefineEnabledFromFacade');
    expect(source).toContain("title: t('common.notify.edit-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: 'enable'");
    expect(source).not.toContain("t('common.enable-failed')");
  });

  it('keeps threshold batch delete clickable and warns when no rows are selected', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('common.notify.no-select-delete')");
    expect(source).toContain("contract: 'no-select-delete'");
    expect(source).not.toContain('if (checkedIds.length === 0) return;');
  });

  it('keeps threshold export warning on the Angular common no-select key', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('common.notify.no-select-export')");
    expect(source).toContain("contract: 'no-select-export'");
    expect(source).not.toContain("t('alert.setting.notify.no-select-export')");
  });

  it('wires Angular-compatible threshold import and export actions instead of placeholders', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    expect(mockState.lastOnExport).toBeTypeOf('function');
    expect(mockState.lastOnImport).toBeTypeOf('function');
    expect(source).toContain('buildAlertDefineExportUrl');
    expect(source).toContain('buildAlertDefineImportUrl');
    expect(source).toContain('HzExportTypeDialog');
    expect(source).toContain('HzFileInput');
    expect(source).toContain('data-alert-setting-import-file-input="true"');
    expect(source).toContain('data-alert-setting-import-input-owner="hertzbeat-ui-file-input"');
    expect(source).toContain('data-alert-setting-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"');
    expect(source).toContain('data-alert-setting-export-type-option-owner');
    expect(source).toContain('fetch(`/api${buildAlertDefineExportUrl(checkedIds, type)}`');
    expect(source).toContain('fetch(`/api${buildAlertDefineImportUrl()}`');
    expect(source).not.toContain('onExport={() => {}}');
    expect(source).not.toContain('onImport={() => {}}');
  });

  it('maps threshold import results to Angular success and failure notifications', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("return t('common.notify.import-success')");
    expect(source).toContain("t('common.notify.import-fail')");
    expect(source).toContain("success: 'import-success'");
    expect(source).toContain("failure: 'import-fail'");
    expect(source).not.toContain("return t('common.notify.import-success-detail'");
  });

  it('keeps threshold export success silent while mapping failures to the Angular notify title', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('common.notify.export-fail')");
    expect(source).toContain("contract: 'export-fail'");
    expect(source).toContain('data-alert-setting-export-success-contract="angular-download-closes-dialog-no-toast"');
    expect(source).toContain('setActionFeedback(null);');
    expect(source).toContain("throw new Error('')");
    expect(source).not.toContain("return t('common.notify.export-success')");
  });

  it('keeps threshold export loading scoped to the selected Angular export type', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('const [pendingExportType, setPendingExportType]');
    expect(source).toContain('setPendingExportType(type)');
    expect(source).toContain("jsonBusy={pendingExportType === 'JSON'}");
    expect(source).toContain("excelBusy={pendingExportType === 'EXCEL'}");
    expect(source).toContain('data-alert-setting-export-loading-contract="angular-selected-type-only"');
    expect(source).toContain("setPendingExportType(null)");
    expect(source).not.toContain("jsonBusy={pendingActionId === 'export'}");
    expect(source).not.toContain("excelBusy={pendingActionId === 'export'}");
  });

  it('persists threshold enable toggles instead of leaving the enable checkbox as a no-op', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    expect(mockState.lastOnToggleEnabled).toBeTypeOf('function');

    await mockState.lastOnToggleEnabled?.(7, false);

    expect(apiMessagePut).toHaveBeenCalledWith(
      '/alert/define',
      expect.objectContaining({
        id: 7,
        name: 'cpu threshold',
        enable: false
      })
    );
    expect(source).toContain('updateAlertDefineEnabled');
    expect(source).toContain('api.alertSettings.update');
    expect(source).not.toContain('apiMessagePut');
    expect(source).not.toContain('onToggleEnabled={() => {}}');
  });

  it('loads threshold detail into the shared authoring dialog instead of leaving edit as a no-op', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    apiMessageGet.mockResolvedValueOnce({
      id: 7,
      name: 'cpu threshold',
      type: 'periodic_metric',
      datasource: 'promql',
      expr: 'cpu_usage > 80',
      template: 'CPU high',
      labels: { severity: 'warning' },
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });

    expect(mockState.lastOnEdit).toBeTypeOf('function');

    await mockState.lastOnEdit?.(7);

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/define/7');
    expect(source).toContain('loadAlertDefineDetailFromFacade');
    expect(source).toContain('api.alertSettings.detail');
    expect(source).not.toContain('apiMessageGet as any');
    expect(source).toContain('buildAlertSettingDraftFromDefine');
    expect(source).toContain("setCreateMode('authoring')");
    expect(source).not.toContain('onEdit={() => {}}');
  });

  it('keeps three-signal route context on the alert-rule workspace entry', async () => {
    const initialRouteState: AlertSettingRouteState = {
      signal: 'logs',
      signalContext: {
        signal: 'logs',
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        returnTo: '/log/manage?traceId=trace-123'
      }
    };

    const html = await renderAlertSettingPage(initialRouteState);
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(html).toContain('data-evidence-signal="logs"');
    expect(html).toContain('hertzbeat.signal:logs');
    expect(html).toContain('hertzbeat.entity.id:7');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(source).not.toContain('useSearchParams');
    expect(source).not.toContain('readSignalRouteContext');
    expect(source).toContain('buildAlertSettingEvidenceContext');
    expect(source).toContain('evidenceContext={evidenceContext}');
    expect(source).toContain('evidenceReturnHref={evidenceContext?.returnHref}');
    expect(source).toContain('const alertSettingRouteState = initialRouteState ?? EMPTY_ALERT_SETTING_ROUTE_STATE');
  });

  it('keeps alert setting remounts on a short settled cache window with refresh-key invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_SETTING_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('const [refreshKey, setRefreshKey] = useState(0)');
    expect(source).toContain("['alert-setting', alertSettingListUrl, refreshKey].join('|')");
    expect(source).toContain('[alertSettingListUrl, refreshKey]');
    expect(source).toContain('void refreshKey');
    expect(source).toContain('[query, pageIndex, pageSize, refreshKey]');
    expect(source.match(/setRefreshKey\(value => value \+ 1\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('cacheKey={alertSettingCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_SETTING_SETTLED_CACHE_TTL_MS}');
  });
});
