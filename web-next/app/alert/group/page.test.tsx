import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { AlertGroupRouteState } from '../../../lib/alert-group/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      totalElements: 1,
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
      pageIndex: 0,
      pageSize: 8
    },
    labelOptions: {
      keys: ['alertname', 'service', 'severity'],
      valuesByKey: {
        severity: ['critical', 'warning']
      }
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());

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
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
        {children(mockState.renderData)}
      </div>
    );
  }
}));

vi.mock('../../../components/pages/alert-group-surface', () => ({
  AlertGroupSurface: ({
    data,
    labelOptions,
    evidenceContext,
    draft,
    pageSizeOptions
  }: {
    data: { list: { totalElements: number } };
    labelOptions?: { keys: string[] };
    evidenceContext?: { signal: string; groupLabelsText: string; returnHref?: string } | null;
    draft?: { groupLabelsText?: string };
    pageSizeOptions?: number[];
  }) => (
    <div
      data-alert-group-surface="true"
      data-total={data.list.totalElements}
      data-label-options={labelOptions?.keys?.join('|')}
      data-page-size-options={pageSizeOptions?.join('|')}
      data-alert-group-evidence-context={evidenceContext ? 'signal-route' : 'none'}
      data-alert-group-evidence-signal={evidenceContext?.signal ?? ''}
      data-alert-group-evidence-return={evidenceContext?.returnHref ?? ''}
      data-alert-group-prefill-labels={evidenceContext?.groupLabelsText ?? ''}
      data-alert-group-draft-labels={draft?.groupLabelsText ?? ''}
    />
  )
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

const EMPTY_ROUTE_STATE: AlertGroupRouteState = {
  signal: null,
  signalContext: {}
};

async function renderAlertGroupPage(initialRouteState: AlertGroupRouteState = EMPTY_ROUTE_STATE) {
  const { default: AlertGroupPage } = await import('./alert-group-page');
  return renderToStaticMarkup(<AlertGroupPage initialRouteState={initialRouteState} />);
}

describe('alert group page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the group workspace through the shared query and surface contracts', async () => {
    const html = await renderAlertGroupPage();

    expect(html).toContain('data-alert-group-surface="true"');
    expect(html).toContain('data-label-options="alertname|service|severity"');
    expect(html).toContain('data-page-size-options="8|15|25"');
    expect(html).toContain('data-loading-copy="Loading group rules"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiMessageGet).toHaveBeenCalledWith('/label?pageIndex=0&pageSize=9999');
  });

  it('preserves three-signal evidence context into new grouping authoring', async () => {
    const initialRouteState: AlertGroupRouteState = {
      signal: 'metrics',
      signalContext: {
        source: 'otlp',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        alertQueryType: 'metrics',
        returnTo: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout'
      }
    };

    const html = await renderAlertGroupPage(initialRouteState);

    expect(html).toContain('data-alert-group-evidence-context="signal-route"');
    expect(html).toContain('data-alert-group-evidence-signal="metrics"');
    expect(html).toContain('data-alert-group-evidence-return="/metrics/manage?entityId=service%3Acommerce%2Fcheckout"');
    expect(html).toContain('data-alert-group-prefill-labels="hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment, hertzbeat.source, hertzbeat.collector, hertzbeat.alert.query_type"');
    expect(html).toContain('data-alert-group-draft-labels="hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment, hertzbeat.source, hertzbeat.collector, hertzbeat.alert.query_type"');
    expect(html).not.toContain('returnLabel=');
    expect(html).not.toContain('trace_id');
    expect(html).not.toContain('span_id');
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');
    expect(source).not.toContain('useSearchParams');
    expect(source).not.toContain('readSignalRouteContext(searchParams)');
    expect(source).toContain('const alertGroupRouteState = initialRouteState ?? EMPTY_ALERT_GROUP_ROUTE_STATE');
  });

  it('keeps alert group remounts on a short settled cache window with refresh-tick invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_GROUP_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('const [refreshTick, setRefreshTick] = useState(0)');
    expect(source).toContain('const [pageIndex, setPageIndex] = useState(0)');
    expect(source).toContain('const [pageSize, setPageSize] = useState<number>(ALERT_GROUP_PAGE_SIZE_OPTIONS[0])');
    expect(source).toContain("['alert-group', alertGroupListUrl, refreshTick].join('|')");
    expect(source).toContain('buildAlertGroupUrl({ search: query, pageIndex, pageSize })');
    expect(source).toContain('[pageIndex, pageSize, query]');
    expect(source).toContain('[alertGroupListUrl, refreshTick]');
    expect(source).toContain('loadAlertGroupDataFromFacade');
    expect(source).toContain('list: api.alertGroups.list');
    expect(source).toContain('labelOptions: () => loadAlertLabelOptionsFromFacade(api.alertLabels.list)');
    expect(source).not.toContain('apiMessageGet<PageResult<AlertGroupConverge>>(alertGroupListUrl)');
    expect(source).toContain('return { ...data, refreshTick };');
    expect(source.match(/setRefreshTick\(value => value \+ 1\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('cacheKey={alertGroupCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_GROUP_SETTLED_CACHE_TTL_MS}');
    expect(source).toContain('pageSizeOptions={[...ALERT_GROUP_PAGE_SIZE_OPTIONS]}');
    expect(source).toContain('function handlePageIndexChange(nextPageIndex: number)');
    expect(source).toContain('function handlePageSizeChange(nextPageSize: number)');
    expect(source).toContain('setPageIndex(0);');
  });

  it('keeps Angular no-selection batch delete warning before opening confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('if (checkedIds.length === 0)');
    expect(source).toContain("setEditorError(t('common.notify.no-select-delete'))");
    expect(source).toContain('setEditorMessage(null)');
    expect(source).toContain("setDeleteRequest({ kind: 'batch', ids: checkedIds })");
  });

  it('uses Angular edit notifications for enable toggle feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('async function handleToggleEnabled');
    expect(source).toContain('updateAlertGroupEnabledFromFacade(api.alertGroups.update');
    expect(source).toContain("setEditorMessage(t('common.notify.edit-success'))");
    expect(source).toContain("setEditorError(t('common.notify.edit-fail'))");
    expect(source).toContain("setEditorErrorContract('enable')");
    expect(source).not.toContain("setEditorMessage(t('common.save-success'));\n            setEditorError(null);\n            setRefreshTick(value => value + 1);\n          } catch (error) {\n            setEditorError(error instanceof Error ? error.message : t('common.save-failed'))");
  });

  it('uses Angular create/edit notifications for editor save feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('const isEdit = Boolean(draft.id)');
    expect(source).toContain('updateAlertGroupFromFacade(api.alertGroups.update, draft)');
    expect(source).toContain('createAlertGroupFromFacade(api.alertGroups.create, draft)');
    expect(source).toContain("setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'))");
    expect(source).toContain("setEditorError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(source).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(source).not.toContain("setEditorMessage(t('common.save-success'))");
    expect(source).not.toContain("t('common.save-failed')");
  });

  it('uses Angular edit failure notifications when editor detail loading fails', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('async function handleEdit');
    expect(source).toContain('const detail = await loadAlertGroupDetailFromFacade(api.alertGroups.detail, targetId)');
    expect(source).toContain("setEditorError(error instanceof Error ? error.message : t('common.notify.edit-fail'))");
    expect(source).not.toContain('loadAlertGroupDetail(apiMessageGet, targetId)');
    expect(source).not.toContain("t('common.load-failed')");
  });

  it('validates Angular required timer fields before saving alert groups', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/alert-group/view-model.ts'), 'utf8');

    expect(source).toContain('if (!draft.groupWait.trim())');
    expect(source).toContain("return t('alert.group.validation.group-wait')");
    expect(source).toContain('if (!draft.groupInterval.trim())');
    expect(source).toContain("return t('alert.group.validation.group-interval')");
    expect(source).toContain('if (!draft.repeatInterval.trim())');
    expect(source).toContain("return t('alert.group.validation.repeat-interval')");
  });

  it('validates Angular non-negative timer fields before saving alert groups', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/alert-group/view-model.ts'), 'utf8');

    expect(source).toContain('function isNonNegativeTimer(value: string)');
    expect(source).toContain('Number.parseInt(value, 10)');
    expect(source).toContain('return Number.isFinite(parsed) && parsed >= 0');
    expect(source).toContain("return t('alert.group.validation.group-wait-non-negative')");
    expect(source).toContain("return t('alert.group.validation.group-interval-non-negative')");
    expect(source).toContain("return t('alert.group.validation.repeat-interval-non-negative')");
  });

  it('uses Angular delete notifications for confirmed delete feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/group/alert-group-page.tsx'), 'utf8');

    expect(source).toContain('async function handleConfirmedDelete()');
    expect(source).toContain('deleteAlertGroupsFromFacade(api.alertGroups.delete, request.ids)');
    expect(source).toContain('deleteAlertGroupFromFacade(api.alertGroups.delete, request.ids[0])');
    expect(source).toContain("setEditorMessage(t('common.notify.delete-success'))");
    expect(source).toContain("setEditorError(t('common.notify.delete-fail'))");
    expect(source).toContain("setEditorErrorContract('delete')");
    expect(source).not.toContain("setEditorMessage(t('common.delete-success'))");
    expect(source).not.toContain("t('common.delete-failed')");
  });
});
