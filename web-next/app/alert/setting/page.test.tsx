// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { AlertSettingRouteState } from '../../../lib/alert-setting/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  lastSurfaceProps: null as null | Record<string, any>,
  lastOnNew: null as null | (() => void),
  lastOnNewRealtime: null as null | (() => void),
  lastOnClose: null as null | (() => void),
  lastOnSubmit: null as null | ((payload: unknown) => Promise<void>),
  lastOnPreview: null as null | ((payload: unknown) => Promise<void>),
  lastPreviewFeedback: null as null | Record<string, any>,
  lastOnToggleEnabled: null as null | ((defineId: number, enabled: boolean) => void),
  lastOnEdit: null as null | ((defineId: number) => Promise<void> | void),
  lastOnExport: null as null | (() => void),
  lastOnImport: null as null | (() => void),
  currentSearchParams: '',
  routerReplace: vi.fn(),
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
const apiMessagePost = vi.hoisted(() => vi.fn());

(globalThis as { React?: typeof React }).React = React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.routerReplace
  }),
  useSearchParams: () => new URLSearchParams(mockState.currentSearchParams)
}));

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
  AlertSettingSurface: (props: any) => {
    const {
      data,
      search,
      evidenceContext,
      onNew,
      onNewRealtime,
      onExport,
      onImport,
      onToggleEnabled,
      onEdit
    } = props;
    mockState.lastSurfaceProps = props;
    mockState.lastOnNew = onNew;
    mockState.lastOnNewRealtime = onNewRealtime;
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
  AlertSettingCreateDialog: ({ open, mode, draft, evidenceReturnHref, previewFeedback, previewing, saveFeedback, onClose, onSubmit, onPreview }: any) => {
    mockState.lastOnClose = onClose;
    mockState.lastOnSubmit = onSubmit;
    mockState.lastOnPreview = onPreview;
    mockState.lastPreviewFeedback = previewFeedback;
    return (
      <div
        data-alert-setting-create-dialog={open ? mode : 'closed'}
        data-alert-setting-create-name={draft?.name || ''}
        data-alert-setting-create-expr={draft?.expr || ''}
        data-alert-setting-create-template={draft?.template || ''}
        data-evidence-return-href={evidenceReturnHref || ''}
        data-previewing={String(Boolean(previewing))}
        data-preview-feedback={previewFeedback?.contract || ''}
        data-preview-feedback-row-count={String(previewFeedback?.rows?.length ?? 0)}
        data-preview-feedback-total-rows={String(previewFeedback?.totalRows ?? previewFeedback?.rows?.length ?? 0)}
        data-preview-feedback-sample-limit={String(previewFeedback?.sampleLimit ?? '')}
        data-save-feedback={saveFeedback?.contract || ''}
        data-save-feedback-title={saveFeedback?.title || ''}
        data-save-feedback-description={saveFeedback?.description || ''}
      />
    );
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
  apiMessagePost,
  getCurrentLocale: () => null
}));

async function renderAlertSettingPage(initialRouteState?: AlertSettingRouteState) {
  const { default: AlertSettingPage } = await import('./alert-setting-page');
  return renderToStaticMarkup(<AlertSettingPage initialRouteState={initialRouteState} />);
}

describe('alert setting page', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  afterEach(() => {
    if (interactionRoot) {
      act(() => {
        interactionRoot?.unmount();
      });
    }
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.lastSurfaceProps = null;
    mockState.lastOnNew = null;
    mockState.lastOnNewRealtime = null;
    mockState.lastOnSubmit = null;
    mockState.lastOnPreview = null;
    mockState.lastPreviewFeedback = null;
    mockState.lastOnToggleEnabled = null;
    mockState.lastOnEdit = null;
    mockState.lastOnExport = null;
    mockState.lastOnImport = null;
    mockState.currentSearchParams = '';
    mockState.routerReplace.mockReset();
    mockState.push.mockReset();
    apiGet.mockReset().mockResolvedValue(mockState.renderData.datasourceStatus);
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.list);
    apiMessageDelete.mockReset().mockResolvedValue(undefined);
    apiMessagePut.mockReset().mockResolvedValue(undefined);
    apiMessagePost.mockReset().mockResolvedValue(undefined);
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

    expect(source).toContain('const [pageIndex, setPageIndex] = useState(routeListState.pageIndex)');
    expect(source).toContain('const [pageSize, setPageSize] = useState(routeListState.pageSize)');
    expect(source).toContain('buildDefineListUrl(query, pageIndex, pageSize)');
    expect(source).toContain('setPageIndex(0);');
    expect(source).toContain('onPageIndexChange={nextPageIndex =>');
    expect(source).toContain('onPageSizeChange={nextPageSize =>');
    expect(source).toContain('setPageSize(nextPageSize)');
  });

  it('initializes alert setting list state from the route and preserves URL state during search and pagination', async () => {
    mockState.currentSearchParams = 'search=cpu&pageIndex=2&pageSize=15&signal=metrics&intent=create';
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.search).toBe('cpu');
    expect(mockState.lastSurfaceProps?.requestedPageSize).toBe(15);
    await act(async () => {
      await mockState.lastLoad?.();
    });
    expect(apiMessageGet).toHaveBeenLastCalledWith('/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%5B%22cpu%22%5D');

    await act(async () => {
      mockState.lastSurfaceProps?.onSearchChange('memory');
      await Promise.resolve();
    });
    await act(async () => {
      mockState.lastSurfaceProps?.onApplyFilter();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/alert/setting?search=memory&pageSize=15&signal=metrics&intent=create', { scroll: false });

    mockState.currentSearchParams = 'search=memory&pageSize=15&signal=metrics&intent=create';
    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });
    await act(async () => {
      mockState.lastSurfaceProps?.onPageIndexChange(3);
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/alert/setting?search=memory&pageSize=15&signal=metrics&intent=create&pageIndex=3', { scroll: false });

    mockState.currentSearchParams = 'search=memory&pageSize=15&signal=metrics&intent=create';
    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });
    await act(async () => {
      mockState.lastSurfaceProps?.onPageSizeChange(8);
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/alert/setting?search=memory&signal=metrics&intent=create', { scroll: false });

    mockState.currentSearchParams = 'search=memory&pageSize=15&signal=metrics&intent=create';
    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });
    await act(async () => {
      mockState.lastSurfaceProps?.onClearFilter();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/alert/setting?signal=metrics&intent=create', { scroll: false });
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

  it('opens realtime authoring directly from the empty-state realtime create action', async () => {
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });

    expect(mockState.lastOnNewRealtime).toBeTypeOf('function');

    await act(async () => {
      mockState.lastOnNewRealtime?.();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-alert-setting-create-dialog]')?.getAttribute('data-alert-setting-create-dialog')).toBe('authoring');
  });

  it('clears the one-shot create intent when users cancel the threshold handoff flow', async () => {
    mockState.currentSearchParams = 'signal=metrics&intent=create&serviceName=checkout&environment=prod&returnTo=%2Fingestion%2Fotlp';
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertSettingPage
          initialRouteState={{
            signal: 'metrics',
            createIntent: 'create',
            signalContext: {
              serviceName: 'checkout',
              environment: 'prod',
              returnTo: '/ingestion/otlp'
            }
          }}
        />
      );
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-alert-setting-create-dialog]')?.getAttribute('data-alert-setting-create-dialog')).not.toBe('closed');

    await act(async () => {
      mockState.lastOnClose?.();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith(
      '/alert/setting?signal=metrics&serviceName=checkout&environment=prod&returnTo=%2Fingestion%2Fotlp',
      { scroll: false }
    );
  });

  it('announces a save success contract after create or edit writes complete', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("contract: 'save-success'");
    expect(source).toContain("title: t('alert.setting.save.success.title', { name: payload.name })");
    expect(source).toContain("payload.enable ? 'alert.setting.save.success.enabled' : 'alert.setting.save.success.disabled'");
    expect(source).toContain('savedRule: {');
    expect(source).toContain("intent: isEdit ? 'edit' : 'create'");
  });

  it('keeps the create authoring draft open with backend detail when alert save fails', async () => {
    apiMessagePost.mockRejectedValueOnce(new Error('backend refused alert expression'));
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertSettingPage
          initialRouteState={{
            signal: 'metrics',
            createIntent: 'create',
            signalContext: {
              serviceName: 'checkout',
              returnTo: '/ingestion/otlp/metrics?query=up',
              alertName: 'checkout saturation',
              alertExpression: 'rate(http_server_requests_seconds_count[5m]) > 10',
              alertDatasource: 'promql',
              alertTemplate: 'Checkout traffic is above threshold'
            }
          }}
        />
      );
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-alert-setting-create-dialog]')?.getAttribute('data-alert-setting-create-dialog')).toBe('authoring');

    await act(async () => {
      await mockState.lastOnSubmit?.({
        name: 'checkout saturation',
        type: 'realtime_metric',
        datasource: 'promql',
        expr: 'rate(http_server_requests_seconds_count[5m]) > 10',
        template: 'Checkout traffic is above threshold',
        labels: {},
        annotations: {},
        enable: true,
        period: 300,
        times: 3,
        priority: 2
      });
      await Promise.resolve();
    });

    expect(apiMessagePost).toHaveBeenCalledWith('/alert/define', expect.objectContaining({
      name: 'checkout saturation',
      expr: 'rate(http_server_requests_seconds_count[5m]) > 10',
      template: 'Checkout traffic is above threshold'
    }));
    expect(interactionContainer.querySelector('[data-alert-setting-create-dialog]')?.getAttribute('data-alert-setting-create-dialog')).toBe('authoring');
    expect(interactionContainer.querySelector('[data-alert-setting-create-name]')?.getAttribute('data-alert-setting-create-name')).toBe('checkout saturation');
    expect(interactionContainer.querySelector('[data-alert-setting-create-expr]')?.getAttribute('data-alert-setting-create-expr')).toBe('rate(http_server_requests_seconds_count[5m]) > 10');
    expect(interactionContainer.querySelector('[data-alert-setting-create-template]')?.getAttribute('data-alert-setting-create-template')).toBe('Checkout traffic is above threshold');
    expect(interactionContainer.querySelector('[data-save-feedback]')?.getAttribute('data-save-feedback')).toBe('create');
    expect(interactionContainer.querySelector('[data-save-feedback-title]')?.getAttribute('data-save-feedback-title')).toBe('Add Failed!');
    expect(interactionContainer.querySelector('[data-save-feedback-description]')?.getAttribute('data-save-feedback-description')).toBe('backend refused alert expression');
    expect(mockState.routerReplace).not.toHaveBeenCalledWith('/alert/setting?signal=metrics&serviceName=checkout&returnTo=%2Fingestion%2Fotlp%2Fmetrics%3Fquery%3Dup', { scroll: false });
  });

  it('opens the threshold type choice when trace handoff carries create intent without a metrics expression', async () => {
    const html = await renderAlertSettingPage({
      signal: 'traces',
      createIntent: 'create',
      signalContext: {
        serviceName: 'checkout',
        traceId: 'trace-123',
        returnTo: '/trace/manage?traceId=trace-123'
      }
    });
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(html).toContain('data-alert-setting-create-dialog="type"');
    expect(html).toContain('data-evidence-return-href="/trace/manage?traceId=trace-123"');
    expect(source).toContain('resolveAlertSettingInitialCreateMode(signal, createIntent, initialCreateDraftSeed)');
    expect(source).toContain('buildAlertSettingCreateDraftSeed(signal');
  });

  it('opens metrics alert authoring directly when explorer handoff carries a panel expression', async () => {
    const html = await renderAlertSettingPage({
      signal: 'metrics',
      createIntent: 'create',
      signalContext: {
        serviceName: 'checkout',
        returnTo: '/ingestion/otlp/metrics?query=http.server.duration',
        alertName: 'checkout latency',
        alertExpression: 'rate(http.server.duration[5m]) > 0',
        alertDatasource: 'promql',
        alertTemplate: 'Latency is high'
      }
    });

    expect(html).toContain('data-alert-setting-create-dialog="authoring"');
    expect(html).toContain('data-alert-setting-create-name="checkout latency"');
    expect(html).toContain('data-alert-setting-create-expr="rate(http.server.duration[5m]) &gt; 0"');
    expect(html).toContain('data-alert-setting-create-template="Latency is high"');
    expect(html).toContain('data-evidence-return-href="/ingestion/otlp/metrics?query=http.server.duration"');
  });

  it('opens log alert authoring directly when explorer handoff carries a safe realtime expression', async () => {
    const html = await renderAlertSettingPage({
      signal: 'logs',
      createIntent: 'create',
      signalContext: {
        serviceName: 'checkout',
        returnTo: '/log/manage?severityText=ERROR',
        alertName: 'checkout log alert',
        alertExpression: "log.severityText == 'ERROR'",
        alertTemplate: 'Log severity matched: {{log.body}}'
      }
    });

    expect(html).toContain('data-alert-setting-create-dialog="authoring"');
    expect(html).toContain('data-alert-setting-create-name="checkout log alert"');
    expect(html).toContain("data-alert-setting-create-expr=\"log.severityText == &#x27;ERROR&#x27;\"");
    expect(html).toContain('data-alert-setting-create-template="Log severity matched: {{log.body}}"');
    expect(html).toContain('data-evidence-return-href="/log/manage?severityText=ERROR"');
  });

  it('opens trace alert authoring directly when explorer handoff carries periodic SQL', async () => {
    const sql = "SELECT service_name, operation, span_kind, SUM(error_total) / NULLIF(SUM(calls_total), 0) AS __value__ FROM hertzbeat_apm_red_1m WHERE service_name = 'checkout' AND time_window >= NOW() - INTERVAL '5 minutes' GROUP BY service_name, operation, span_kind HAVING __value__ > 0";
    const html = await renderAlertSettingPage({
      signal: 'traces',
      createIntent: 'create',
      signalContext: {
        serviceName: 'checkout',
        returnTo: '/trace/manage?serviceName=checkout&errorOnly=true',
        alertName: 'checkout trace alert',
        alertExpression: sql,
        alertDatasource: 'sql',
        alertTemplate: 'Trace error rate detected ${service_name} ${operation}: ${__value__}'
      }
    });

    expect(html).toContain('data-alert-setting-create-dialog="authoring"');
    expect(html).toContain('data-alert-setting-create-name="checkout trace alert"');
    expect(html).toContain('FROM hertzbeat_apm_red_1m');
    expect(html).toContain('data-alert-setting-create-template="Trace error rate detected ${service_name} ${operation}: ${__value__}"');
    expect(html).toContain('data-evidence-return-href="/trace/manage?serviceName=checkout&amp;errorOnly=true"');
  });

  it('uses the shared cold delete confirmation instead of leaving threshold delete actions as no-ops', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('deleteAlertDefineFromFacade');
    expect(source).toContain('deleteAlertDefinesFromFacade');
    expect(source).toContain('api.alertSettings.delete');
    expect(source).not.toContain('apiMessageDelete');
    expect(source).toContain('data-alert-delete-confirm');
    expect(source).toContain("kicker={t('common.confirm.operation')}");
    expect(source).toContain("t('alert.setting.delete.confirm.targets'");
    expect(source).toContain("confirmLabel={t('alert.setting.delete.confirm.action')}");
    expect(source).not.toContain("confirmLabel={t('common.button.ok')}");
    expect(source).not.toContain('onDeleteSelected={() => {}}');
    expect(source).not.toContain('onDelete={() => {}}');
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('window.alert');
    expect(source).not.toContain('alert(');
  });

  it('names the selected threshold rule in the delete confirmation before destructive writes', async () => {
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDelete(7);
      await Promise.resolve();
    });

    expect(interactionContainer.textContent).toContain('Delete the selected threshold rule. This cannot be undone.');
    expect(interactionContainer.textContent).toContain('Rules: cpu threshold.');
    expect(interactionContainer.textContent).toContain('Delete threshold rule');
  });

  it('maps threshold delete failures to the Angular notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('common.notify.delete-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: 'delete'");
    expect(source).not.toContain("t('common.delete-failed')");
  });

  it('maps successful threshold deletes to inline confirmation with the deleted rule count', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('const deletedCount = request.ids.length');
    expect(source).toContain("title: t('alert.setting.delete.success.title', { count: deletedCount })");
    expect(source).toContain("description: t('alert.setting.delete.success.description')");
    expect(source).toContain("contract: 'delete-success'");
    expect(source).toContain('deletedCount');
  });

  it('maps threshold save failures to the Angular create/edit notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: isEdit ? 'edit' : 'create'");
    expect(source).toContain('saveFeedback={saveFeedback}');
    expect(source).not.toContain("t('common.save-failed')");
  });

  it('previews periodic threshold expressions through the alert define preview endpoint before save', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    apiMessageGet.mockResolvedValueOnce([{ __value__: 0.92, service_name: 'checkout' }]);

    expect(mockState.lastOnPreview).toBeTypeOf('function');

    await mockState.lastOnPreview?.({
      name: 'checkout trace alert',
      type: 'periodic_trace',
      datasource: 'sql',
      expr: 'SELECT 1 AS __value__ FROM hertzbeat_apm_red_1m',
      template: 'Trace error rate',
      labels: {},
      annotations: {},
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/alert/define/preview/sql?type=periodic_trace&expr=SELECT%201%20AS%20__value__%20FROM%20hertzbeat_apm_red_1m'
    );
    expect(source).toContain('api.alertSettings.preview(payload.datasource, payload.type, payload.expr)');
    expect(source).toContain('buildAlertSettingPreviewSuccessFeedback(rows, t)');
    expect(source).toContain("t('alert.setting.preview.success.title'");
    expect(source).toContain("contract: 'success'");
  });

  it('keeps large alert preview responses bounded while preserving total evidence count', async () => {
    const { buildAlertSettingPreviewSuccessFeedback, ALERT_SETTING_PREVIEW_SAMPLE_LIMIT } = await import('./alert-setting-page');
    const t = createTranslatorMock();
    const previewRows = Array.from({ length: 40 }, (_, index) => ({
      __value__: index,
      service_name: `checkout-${index}`
    }));
    const feedback = buildAlertSettingPreviewSuccessFeedback(previewRows, t);

    expect(ALERT_SETTING_PREVIEW_SAMPLE_LIMIT).toBe(3);
    expect(feedback.contract).toBe('success');
    expect(feedback.rows).toHaveLength(3);
    expect(feedback.rows?.[0]).toEqual({ __value__: 0, service_name: 'checkout-0' });
    expect(feedback.rows?.[2]).toEqual({ __value__: 2, service_name: 'checkout-2' });
    expect(feedback.totalRows).toBe(40);
    expect(feedback.sampleLimit).toBe(3);
  });

  it('previews realtime log expressions through the alert define preview endpoint before save', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    apiMessageGet.mockResolvedValueOnce([
      { preview_mode: 'log_sample', type: 'realtime_log', severityText: 'ERROR', body: 'checkout timeout' }
    ]);

    expect(mockState.lastOnPreview).toBeTypeOf('function');

    await mockState.lastOnPreview?.({
      name: 'checkout log alert',
      type: 'realtime_log',
      datasource: 'promql',
      expr: "log.severityText == 'ERROR'",
      template: 'Log severity matched',
      labels: {},
      annotations: {},
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });

    expect(apiMessageGet).toHaveBeenCalledWith(
      "/alert/define/preview/promql?type=realtime_log&expr=log.severityText%20%3D%3D%20'ERROR'"
    );
    expect(source).toContain("payload.type === 'realtime_log'");
    expect(source).toContain('buildAlertSettingPreviewSuccessFeedback(rows, t)');
  });

  it('keeps unsupported realtime metric preview honest instead of calling the preview endpoint', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');
    await renderAlertSettingPage();

    expect(mockState.lastOnPreview).toBeTypeOf('function');

    await mockState.lastOnPreview?.({
      name: 'checkout metric alert',
      type: 'realtime_metric',
      datasource: 'promql',
      expr: 'cpu > 80',
      template: 'Metric matched',
      labels: {},
      annotations: {},
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });

    expect(apiMessageGet).not.toHaveBeenCalledWith(expect.stringContaining('/alert/define/preview'));
    expect(source).toContain("const supportsPreview = payload.type.startsWith('periodic_') || payload.type === 'realtime_log'");
    expect(source).toContain("t('alert.setting.preview.unsupported.title')");
    expect(source).toContain("contract: 'unsupported'");
  });

  it('maps threshold enable toggle failures to the Angular edit notify title plus backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('updateAlertDefineEnabledFromFacade');
    expect(source).toContain("title: t('common.notify.edit-fail')");
    expect(source).toContain('description: error instanceof Error ? error.message : undefined');
    expect(source).toContain("contract: 'enable'");
    expect(source).not.toContain("t('common.enable-failed')");
  });

  it('announces successful threshold enable toggles with the updated rule state', async () => {
    const { default: AlertSettingPage } = await import('./alert-setting-page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<AlertSettingPage />);
      await Promise.resolve();
    });

    await act(async () => {
      await mockState.lastSurfaceProps?.onToggleEnabled(7, false);
      await Promise.resolve();
    });

    expect(apiMessagePut).toHaveBeenCalledWith(
      '/alert/define',
      expect.objectContaining({
        id: 7,
        name: 'cpu threshold',
        enable: false
      })
    );
    expect(mockState.lastSurfaceProps?.actionFeedback).toMatchObject({
      tone: 'success',
      title: 'Updated threshold rule cpu threshold',
      description: 'The rule is disabled and will not create new alerts until enabled again.',
      contract: 'enable-success',
      toggledRule: {
        id: 7,
        name: 'cpu threshold',
        enabled: false
      }
    });
  });

  it('keeps threshold batch delete clickable and warns when no rows are selected', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('alert.setting.notify.no-select-delete')");
    expect(source).toContain("contract: 'no-select-delete'");
    expect(source).not.toContain('if (checkedIds.length === 0) return;');
  });

  it('uses threshold-specific copy for the no-select export warning', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain("title: t('alert.setting.notify.no-select-export')");
    expect(source).toContain("contract: 'no-select-export'");
    expect(source).not.toContain("t('common.notify.no-select-export')");
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
    expect(source).toContain("const ALERT_DEFINE_IMPORT_FILE_ACCEPT = '.json,.yaml,.yml,.xlsx';");
    expect(source).toContain('accept={ALERT_DEFINE_IMPORT_FILE_ACCEPT}');
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

  it('keeps threshold import upload lifecycle on the Angular single-file reload contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/alert-setting-page.tsx'), 'utf8');

    expect(source).toContain('if (pendingActionId) return;');
    expect(source).toContain('isAlertDefineImportFile(file)');
    expect(source).toContain("normalizedName.endsWith('.yaml')");
    expect(source).toContain("normalizedName.endsWith('.yml')");
    expect(source).toContain("description: t('common.notify.import-invalid-file')");
    expect(source).toContain('return;');
    expect(source).toContain('multiple={false}');
    expect(source).toContain('data-alert-setting-import-upload-contract="angular-nz-upload-limit-one-no-list"');
    expect(source).toContain('data-alert-setting-import-show-list="false"');
    expect(source).toContain('data-alert-setting-import-refresh-contract="angular-success-refresh"');
    expect(source).toContain('data-alert-setting-import-failure-refresh-contract="angular-failure-no-refresh"');
    expect(source).toContain('setRefreshKey(value => value + 1)');
    expect(source).not.toContain('multiple={true}');
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
    expect(source).toContain("import { useRouter, useSearchParams } from 'next/navigation';");
    expect(source).not.toContain('readSignalRouteContext');
    expect(source).toContain('buildAlertSettingEvidenceContext');
    expect(source).toContain('evidenceContext={evidenceContext}');
    expect(source).toContain('evidenceReturnHref={evidenceContext?.returnHref}');
    expect(source).toContain('const alertSettingRouteState = initialRouteState ?? EMPTY_ALERT_SETTING_ROUTE_STATE');
  });

  it('seeds alert-rule authoring type from the incoming three-signal route context', async () => {
    const { buildAlertSettingCreateDraftSeed, resolveAlertSettingInitialCreateMode } = await import('./alert-setting-page');
    const labelsText = 'hertzbeat.signal:logs, service.name:checkout';

    expect(buildAlertSettingCreateDraftSeed('logs', labelsText)).toEqual({
      labelsText,
      kind: 'realtime',
      dataType: 'log'
    });
    expect(buildAlertSettingCreateDraftSeed('metrics', labelsText)).toEqual({
      labelsText,
      kind: 'realtime',
      dataType: 'metric'
    });
    expect(buildAlertSettingCreateDraftSeed('traces', labelsText)).toEqual({
      labelsText,
      kind: 'periodic',
      dataType: 'trace'
    });
    expect(buildAlertSettingCreateDraftSeed(null, labelsText)).toEqual({
      labelsText
    });
    expect(buildAlertSettingCreateDraftSeed('metrics', labelsText, {
      alertName: 'checkout latency',
      alertExpression: 'rate(http.server.duration[5m])',
      alertDatasource: 'promql',
      alertTemplate: 'Latency is high'
    })).toEqual({
      labelsText,
      name: 'checkout latency',
      expr: 'rate(http.server.duration[5m])',
      datasource: 'promql',
      template: 'Latency is high',
      kind: 'realtime',
      dataType: 'metric'
    });
    expect(resolveAlertSettingInitialCreateMode('metrics', 'create', { expr: 'rate(up[5m])' })).toBe('authoring');
    expect(resolveAlertSettingInitialCreateMode('logs', 'create', { expr: "log.severityText == 'ERROR'" })).toBe('authoring');
    expect(resolveAlertSettingInitialCreateMode('traces', 'create', { expr: 'SELECT service_name, 1 AS __value__ FROM hertzbeat_apm_red_1m' })).toBe('authoring');
    expect(resolveAlertSettingInitialCreateMode('traces', 'create', {})).toBe('type');
    expect(resolveAlertSettingInitialCreateMode('metrics', null, { expr: 'rate(up[5m])' })).toBe('closed');
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
