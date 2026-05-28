import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { AlertInhibitRouteState } from '../../../lib/alert-inhibit/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      totalElements: 1,
      content: [
        {
          id: 7,
          name: 'db-inhibit',
          enable: true,
          sourceLabels: { service: 'checkout' },
          targetLabels: { severity: 'warning' },
          equalLabels: ['cluster'],
          gmtUpdate: 1713200000000
        }
      ],
      pageIndex: 0,
      pageSize: 8
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

vi.mock('../../../components/pages/alert-inhibit-surface', () => ({
  AlertInhibitSurface: ({
    data,
    returnContext,
    managementContext,
    matchedViewEnabled,
    missingMatchedRuleCount,
    createdOutsideMatchedViewNotice,
    entityPrefillSource,
    entityPrefillWarning,
    evidenceContext,
    draft,
    pageSizeOptions
  }: {
    data: { list: { totalElements: number } };
    returnContext?: Record<string, string>;
    managementContext?: { matchMode?: string; matchingRuleIds?: number[] };
    matchedViewEnabled?: boolean;
    missingMatchedRuleCount?: number;
    createdOutsideMatchedViewNotice?: boolean;
    entityPrefillSource?: string;
    entityPrefillWarning?: string | null;
    evidenceContext?: { signal: string; sourceLabelsText: string; returnHref?: string } | null;
    draft?: { sourceLabelsText?: string; targetLabelsText?: string; equalLabelsText?: string };
    pageSizeOptions?: number[];
  }) => (
    <div
      data-alert-inhibit-surface="true"
      data-total={data.list.totalElements}
      data-page-size-options={pageSizeOptions?.join('|')}
      data-return-context={JSON.stringify(returnContext ?? {})}
      data-management-context={JSON.stringify(managementContext ?? {})}
      data-alert-inhibit-match-view={matchedViewEnabled ? 'matched' : 'all'}
      data-alert-inhibit-missing-rule-count={missingMatchedRuleCount ?? 0}
      data-alert-inhibit-created-outside-matched={createdOutsideMatchedViewNotice ? 'true' : 'false'}
      data-alert-inhibit-entity-prefill-source={entityPrefillSource ?? 'none'}
      data-alert-inhibit-entity-prefill-warning={entityPrefillWarning ?? ''}
      data-alert-inhibit-evidence-context={evidenceContext ? 'signal-route' : 'none'}
      data-alert-inhibit-evidence-signal={evidenceContext?.signal ?? ''}
      data-alert-inhibit-evidence-return={evidenceContext?.returnHref ?? ''}
      data-alert-inhibit-prefill-source-labels={evidenceContext?.sourceLabelsText ?? ''}
      data-alert-inhibit-draft-source-labels={draft?.sourceLabelsText ?? ''}
      data-alert-inhibit-draft-target-labels={draft?.targetLabelsText ?? ''}
      data-alert-inhibit-draft-equal-labels={draft?.equalLabelsText ?? ''}
    />
  )
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

const EMPTY_ROUTE_STATE: AlertInhibitRouteState = {
  returnContext: {
    search: '',
    status: '',
    severity: '',
    entityId: '',
    entityName: '',
    returnTo: ''
  },
  signal: null,
  signalContext: {},
  managementContext: {
    entityId: '',
    entityName: '',
    returnTo: '',
    returnLabel: '',
    matchMode: '',
    matchingRuleType: '',
    matchingRuleIds: [],
    matchedViewEnabled: false
  }
};

async function renderAlertInhibitPage(initialRouteState: AlertInhibitRouteState = EMPTY_ROUTE_STATE) {
  const { default: AlertInhibitPage } = await import('./alert-inhibit-page');
  return renderToStaticMarkup(<AlertInhibitPage initialRouteState={initialRouteState} />);
}

describe('alert inhibit page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the inhibit workbench through the shared query and surface contracts', async () => {
    const html = await renderAlertInhibitPage();

    expect(html).toContain('data-alert-inhibit-surface="true"');
    expect(html).toContain('data-page-size-options="8|15|25"');
    expect(html).toContain('data-loading-copy="Loading inhibit rules"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc');
  });

  it('passes topology edge return context into the inhibit surface', async () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const initialRouteState: AlertInhibitRouteState = {
      returnContext: {
        search: 'checkout-api',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo,
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db'
      },
      signal: null,
      managementContext: {
        entityId: '',
        entityName: '',
        returnTo: '',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      },
      signalContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        returnTo
      }
    };

    const html = await renderAlertInhibitPage(initialRouteState);

    expect(html).toContain('&quot;edgeId&quot;:&quot;svc-checkout--res-orders-db&quot;');
    expect(html).toContain('&quot;viewMode&quot;:&quot;resource-dependency&quot;');
    expect(html).toContain('&quot;sourceKind&quot;:&quot;database-middleware-connection&quot;');
    expect(html).toContain('&quot;returnTo&quot;:&quot;/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain('returnLabel=');
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
  });

  it('preserves three-signal evidence context into new inhibit authoring', async () => {
    const initialRouteState: AlertInhibitRouteState = {
      signal: 'traces',
      returnContext: {
        search: 'checkout',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo: '/trace/manage?traceId=trace-123',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        source: 'otlp',
        signal: 'traces',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service'
      },
      managementContext: {
        entityId: '',
        entityName: '',
        returnTo: '',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      },
      signalContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/trace/manage?traceId=trace-123'
      }
    };

    const html = await renderAlertInhibitPage(initialRouteState);

    expect(html).toContain('data-alert-inhibit-evidence-context="signal-route"');
    expect(html).toContain('data-alert-inhibit-evidence-signal="traces"');
    expect(html).toContain('data-alert-inhibit-evidence-return="/trace/manage?traceId=trace-123"');
    expect(html).toContain('hertzbeat.signal:traces');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(html).toContain('span_id:span-456');
    expect(html).toContain('hertzbeat.collector:edge-collector-a');
    expect(html).toContain('data-alert-inhibit-draft-source-labels="hertzbeat.signal:traces');
    expect(html).toContain('data-alert-inhibit-draft-target-labels="hertzbeat.signal:traces');
    expect(html).toContain('data-alert-inhibit-draft-equal-labels="hertzbeat.entity.id, service.name, service.namespace, deployment.environment"');
    expect(html).not.toContain('returnLabel=');
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    expect(source).not.toContain('useSearchParams');
    expect(source).not.toContain('queryStateFromParams(searchParams)');
    expect(source).not.toContain('readSignalRouteContext(searchParams)');
    expect(source).toContain('const alertInhibitRouteState = initialRouteState ?? EMPTY_ALERT_INHIBIT_ROUTE_STATE');
  });

  it('keeps alert inhibit remounts on a short settled cache window with refresh-tick invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_INHIBIT_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('ALERT_INHIBIT_LABEL_OPTIONS_TIMEOUT_MS = 2_500');
    expect(source).toContain('withTimeoutFallback(');
    expect(source).toContain('const [refreshTick, setRefreshTick] = useState(0)');
    expect(source).toContain('const [pageIndex, setPageIndex] = useState(0)');
    expect(source).toContain('const [pageSize, setPageSize] = useState<number>(ALERT_INHIBIT_PAGE_SIZE_OPTIONS[0])');
    expect(source).toContain("['alert-inhibit', useMatchedView ? `matched:${matchedRuleIdsKey}` : alertInhibitListUrl, refreshTick].join('|')");
    expect(source).toContain('buildAlertInhibitUrl({ search: query, pageIndex, pageSize })');
    expect(source).toContain('[pageIndex, pageSize, query]');
    expect(source).toContain('[alertInhibitListUrl, matchedRuleIdsKey, refreshTick, useMatchedView]');
    expect(source).toContain('loadAlertInhibitDataFromFacade');
    expect(source).toContain('list: api.alertInhibits.list');
    expect(source).toContain('loadAlertLabelOptionsFromFacade(api.alertLabels.list)');
    expect(source).toContain('loadMatchedAlertInhibitsFromFacade(api.alertInhibits.detail, managementContext.matchingRuleIds)');
    expect(source).not.toContain('apiMessageGet<PageResult<AlertInhibit>>(alertInhibitListUrl)');
    expect(source).toContain('return { ...data, refreshTick, missingMatchedRuleCount: 0 };');
    expect(source.match(/setRefreshTick\(value => value \+ 1\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('cacheKey={alertInhibitCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_INHIBIT_SETTLED_CACHE_TTL_MS}');
    expect(source).toContain('pageSizeOptions={[...ALERT_INHIBIT_PAGE_SIZE_OPTIONS]}');
    expect(source).toContain('function handlePageIndexChange(nextPageIndex: number)');
    expect(source).toContain('function handlePageSizeChange(nextPageSize: number)');
    expect(source).toContain('setPageIndex(0);');
  });

  it('loads Angular entity-noise-control matched inhibit rules by id', async () => {
    const initialRouteState: AlertInhibitRouteState = {
      returnContext: {
        search: '',
        status: '',
        severity: '',
        entityId: '42',
        entityName: 'checkout-api',
        returnTo: '/entities/42?tab=alerts'
      },
      signal: null,
      signalContext: {},
      managementContext: {
        entityId: '42',
        entityName: 'checkout-api',
        returnTo: '/entities/42?tab=alerts',
        returnLabel: 'checkout-api',
        matchMode: 'entity-noise-controls',
        matchingRuleType: 'inhibit',
        matchingRuleIds: [11, 12],
        matchedViewEnabled: true
      }
    };
    apiMessageGet.mockImplementation(async (url: string) => {
      if (url === '/alert/inhibit/11') {
        return {
          id: 11,
          name: 'checkout inhibit',
          enable: true,
          sourceLabels: { service: 'checkout' },
          targetLabels: { service: 'orders' },
          equalLabels: ['cluster']
        };
      }
      if (url === '/alert/inhibit/12') {
        throw new Error('missing');
      }
      return mockState.renderData.list;
    });

    const html = await renderAlertInhibitPage(initialRouteState);
    const result = (await mockState.lastLoad?.()) as any;

    expect(html).toContain('data-alert-inhibit-match-view="matched"');
    expect(html).toContain('&quot;matchMode&quot;:&quot;entity-noise-controls&quot;');
    expect(apiMessageGet).toHaveBeenCalledWith('/alert/inhibit/11');
    expect(apiMessageGet).toHaveBeenCalledWith('/alert/inhibit/12');
    expect(apiMessageGet).not.toHaveBeenCalledWith('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(result.list.content.map((item: any) => item.id)).toEqual([11]);
    expect(result.missingMatchedRuleCount).toBe(1);
  });

  it('keeps Angular no-selection batch delete warning before opening confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');

    expect(source).toContain('if (checkedIds.length === 0)');
    expect(source).toContain("setEditorError(t('common.notify.no-select-delete'))");
    expect(source).toContain('setEditorMessage(null)');
    expect(source).toContain("setDeleteRequest({ kind: 'batch', ids: checkedIds })");
    expect(surfaceSource).toContain('data-alert-inhibit-delete-selected="toolbar"');
    expect(surfaceSource).toContain('data-alert-inhibit-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(surfaceSource).not.toContain('disabled={selectedCount === 0}');
  });

  it('keeps Angular created-outside-matched notice state for matched-view authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');

    expect(source).toContain('const [createdOutsideMatchedViewNotice, setCreatedOutsideMatchedViewNotice] = useState(false)');
    expect(source).toContain('setCreatedOutsideMatchedViewNotice(false)');
    expect(source).toContain('createdOutsideMatchedViewNotice={createdOutsideMatchedViewNotice}');
    expect(surfaceSource).toContain('data-alert-inhibit-created-outside-matched="angular-authoring-notice"');
    expect(surfaceSource).toContain('data-alert-inhibit-created-outside-matched-owner="hertzbeat-ui-inline-feedback"');
    expect(surfaceSource).toContain('data-alert-inhibit-created-outside-matched-action="view-all"');
  });

  it('keeps Angular entity-alert authoring prefill for entity noise-control inhibits', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');

    expect(source).toContain('buildAlertInhibitEntityPrefillFromFacade(');
    expect(source).toContain("entityId => api.entities.alerts(entityId, { pageIndex: 0, pageSize: 20, status: 'firing' })");
    expect(source).not.toContain("from '../../../lib/api-client'");
    expect(source).toContain("t('entity.noise-controls.authoring.inhibit.prefill-warning')");
    expect(source).toContain("t('entity.noise-controls.authoring.prefill-warning.no-entity-id')");
    expect(source).toContain('entityPrefillSource={entityPrefillSource}');
    expect(source).toContain('entityPrefillWarning={entityPrefillWarning}');
    expect(source).toContain("name: `${displayName} inhibit`");
    expect(surfaceSource).toContain('data-alert-inhibit-entity-prefill={entityPrefillSource ===');
    expect(surfaceSource).toContain("t('entity.noise-controls.authoring.inhibit.title')");
    expect(surfaceSource).toContain("t('entity.noise-controls.authoring.inhibit.prefill-success')");
    expect(surfaceSource).toContain('prefillWarning={entityPrefillWarning}');
  });

  it('uses Angular delete notifications for confirmed delete feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');

    expect(source).toContain('async function handleConfirmedDelete()');
    expect(source).toContain('deleteAlertInhibitsFromFacade(api.alertInhibits.delete, request.ids)');
    expect(source).toContain('deleteAlertInhibitFromFacade(api.alertInhibits.delete, request.ids[0])');
    expect(source).toContain("setEditorMessage(t('common.notify.delete-success'))");
    expect(source).toContain("setEditorError(t('common.notify.delete-fail'))");
    expect(source).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(source).toContain("setEditorErrorContract('delete')");
    expect(source).not.toContain('apiMessageDelete');
    expect(source).not.toContain("setEditorMessage(t('common.delete-success'))");
    expect(source).not.toContain("t('common.delete-failed')");
  });

  it('uses Angular edit notifications and facade persistence for enable-toggle feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const toggleSource = source.slice(
      source.indexOf('async function handleToggleEnabled(inhibit?: AlertInhibit)'),
      source.indexOf('async function handleDelete(inhibitId?: number)')
    );

    expect(toggleSource).toContain('async function handleToggleEnabled(inhibit?: AlertInhibit)');
    expect(toggleSource).toContain('updateAlertInhibitEnabledFromFacade(api.alertInhibits.update, target, !(target.enable ?? true))');
    expect(toggleSource).toContain("setEditorMessage(t('common.notify.edit-success'))");
    expect(toggleSource).toContain("setEditorError(t('common.notify.edit-fail'))");
    expect(toggleSource).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(toggleSource).toContain("setEditorErrorContract('enable')");
    expect(toggleSource).not.toContain('apiMessagePut');
    expect(toggleSource).not.toContain("setEditorMessage(t('common.save-success'))");
    expect(toggleSource).not.toContain("t('common.save-failed')");
  });

  it('uses Angular create/edit notifications and facade persistence for editor save feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const saveSource = source.slice(
      source.indexOf('async function handleSave()'),
      source.indexOf('async function handleToggleEnabled(inhibit?: AlertInhibit)')
    );

    expect(saveSource).toContain('const isEdit = Boolean(draft.id)');
    expect(saveSource).toContain('updateAlertInhibitFromFacade(api.alertInhibits.update, draft)');
    expect(saveSource).toContain('createAlertInhibitFromFacade(api.alertInhibits.create, draft)');
    expect(saveSource).toContain("setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'))");
    expect(saveSource).toContain('setCreatedOutsideMatchedViewNotice(!isEdit && useMatchedView)');
    expect(saveSource).toContain("setEditorError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(saveSource).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(saveSource).toContain("setEditorErrorContract('save')");
    expect(saveSource).not.toContain('apiMessagePost');
    expect(saveSource).not.toContain('apiMessagePut');
    expect(saveSource).not.toContain("setEditorMessage(t('common.save-success'))");
    expect(saveSource).not.toContain("t('common.save-failed')");
  });

  it('uses Angular edit failure notification and facade detail loading for edit detail fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/inhibit/alert-inhibit-page.tsx'), 'utf8');
    const editSource = source.slice(
      source.indexOf('async function handleEdit(inhibitId?: number)'),
      source.indexOf('async function handleSave()')
    );

    expect(editSource).toContain('async function handleEdit(inhibitId?: number)');
    expect(editSource).toContain('loadAlertInhibitDetailFromFacade(api.alertInhibits.detail, targetId)');
    expect(editSource).toContain("setEditorError(error instanceof Error ? error.message : t('common.notify.edit-fail'))");
    expect(editSource).not.toContain('apiMessageGet');
    expect(editSource).not.toContain("t('common.load-failed')");
  });
});
