import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  lastLoad: null as null | (() => Promise<unknown>),
  lastOnNew: null as null | (() => void),
  lastOnSubmit: null as null | ((payload: unknown) => Promise<void>),
  lastOnToggleEnabled: null as null | ((defineId: number, enabled: boolean) => void),
  lastOnEdit: null as null | ((defineId: number) => Promise<void> | void),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockState.push
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../components/pages/alert-setting-surface', () => ({
  AlertSettingSurface: ({
    data,
    search,
    evidenceContext,
    onNew,
    onToggleEnabled,
    onEdit
  }: {
    data: { list: { totalElements: number } };
    search: string;
    evidenceContext?: { signal: string; labelsText: string } | null;
    onNew: () => void;
    onToggleEnabled: (defineId: number, enabled: boolean) => void;
    onEdit: (defineId: number) => Promise<void> | void;
  }) => {
    mockState.lastOnNew = onNew;
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
  apiMessagePost: vi.fn()
}));

describe('alert setting page', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastLoad = null;
    mockState.lastOnNew = null;
    mockState.lastOnSubmit = null;
    mockState.lastOnToggleEnabled = null;
    mockState.lastOnEdit = null;
    mockState.push.mockReset();
    apiGet.mockReset().mockResolvedValue(mockState.renderData.datasourceStatus);
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.list);
    apiMessageDelete.mockReset().mockResolvedValue(undefined);
    apiMessagePut.mockReset().mockResolvedValue(undefined);
  });

  it('loads the alert-define console through the shared route and surface contracts', async () => {
    const { default: AlertSettingPage } = await import('./page');
    const html = renderToStaticMarkup(<AlertSettingPage />);

    expect(html).toContain('data-alert-setting-surface="true"');
    expect(html).toContain('data-total="2"');
    expect(html).toContain('data-search=""');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiGet).toHaveBeenCalledWith('/alert/define/datasource/status');
  });

  it('opens the local threshold create flow instead of routing to monitor define', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/page.tsx'), 'utf8');
    const { default: AlertSettingPage } = await import('./page');
    renderToStaticMarkup(<AlertSettingPage />);

    expect(mockState.lastOnNew).toBeTypeOf('function');

    mockState.lastOnNew?.();

    expect(mockState.push).not.toHaveBeenCalled();
    expect(source).not.toContain("router.push('/setting/define')");
    expect(source).toContain('AlertSettingCreateDialog');
    expect(source).toContain('apiMessagePost');
  });

  it('uses the shared cold delete confirmation instead of leaving threshold delete actions as no-ops', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/page.tsx'), 'utf8');

    expect(source).toContain('ColdConfirmDialog');
    expect(source).toContain('apiMessageDelete');
    expect(source).toContain('deleteAlertDefine');
    expect(source).toContain('deleteAlertDefines');
    expect(source).toContain('data-alert-delete-confirm');
    expect(source).not.toContain('onDeleteSelected={() => {}}');
    expect(source).not.toContain('onDelete={() => {}}');
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('window.alert');
    expect(source).not.toContain('alert(');
  });

  it('persists threshold enable toggles instead of leaving the enable checkbox as a no-op', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/page.tsx'), 'utf8');
    const { default: AlertSettingPage } = await import('./page');
    renderToStaticMarkup(<AlertSettingPage />);

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
    expect(source).not.toContain('onToggleEnabled={() => {}}');
  });

  it('loads threshold detail into the shared authoring dialog instead of leaving edit as a no-op', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/page.tsx'), 'utf8');
    const { default: AlertSettingPage } = await import('./page');
    renderToStaticMarkup(<AlertSettingPage />);

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
    expect(source).toContain('loadAlertDefineDetail');
    expect(source).toContain('buildAlertSettingDraftFromDefine');
    expect(source).toContain("setCreateMode('authoring')");
    expect(source).not.toContain('onEdit={() => {}}');
  });

  it('keeps three-signal route context on the alert-rule workspace entry', async () => {
    mockState.searchParams = new URLSearchParams({
      signal: 'logs',
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      returnTo: '/log/manage?traceId=trace-123&returnLabel=Logs'
    });

    const { default: AlertSettingPage } = await import('./page');
    const html = renderToStaticMarkup(<AlertSettingPage />);
    const source = readFileSync(resolve(process.cwd(), 'app/alert/setting/page.tsx'), 'utf8');

    expect(html).toContain('data-evidence-signal="logs"');
    expect(html).toContain('hertzbeat.signal:logs');
    expect(html).toContain('hertzbeat.entity.id:7');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(source).toContain('readSignalRouteContext');
    expect(source).toContain('buildAlertSettingEvidenceContext');
    expect(source).toContain('evidenceContext={evidenceContext}');
    expect(source).toContain('evidenceReturnHref={evidenceContext?.returnHref}');
  });
});
