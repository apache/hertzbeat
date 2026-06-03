import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { AlertSilenceRouteState } from '../../../lib/alert-silence/query-state';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      totalElements: 1,
      content: [
        {
          id: 7,
          name: 'weekday',
          enable: true,
          matchAll: false,
          labels: { service: 'checkout' },
          type: 1,
          days: [1, 2, 3, 4, 5],
          times: 2
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

vi.mock('../../../components/pages/alert-silence-surface', () => ({
  AlertSilenceSurface: ({
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
    evidenceContext?: { signal: string; labelsText: string; returnHref?: string } | null;
    draft?: { labelsText?: string };
    pageSizeOptions?: number[];
  }) => (
    <div
      data-alert-silence-surface="true"
      data-total={data.list.totalElements}
      data-page-size-options={pageSizeOptions?.join('|')}
      data-return-context={JSON.stringify(returnContext ?? {})}
      data-alert-silence-match-mode={managementContext?.matchMode ?? ''}
      data-alert-silence-match-view={matchedViewEnabled ? 'matched' : 'all'}
      data-alert-silence-created-outside-matched={createdOutsideMatchedViewNotice ? 'true' : 'false'}
      data-alert-silence-matching-rule-ids={managementContext?.matchingRuleIds?.join(',') ?? ''}
      data-alert-silence-missing-rule-count={missingMatchedRuleCount ?? 0}
      data-alert-silence-entity-prefill-source={entityPrefillSource ?? 'none'}
      data-alert-silence-entity-prefill-warning={entityPrefillWarning ?? ''}
      data-alert-silence-evidence-context={evidenceContext ? 'signal-route' : 'none'}
      data-alert-silence-evidence-signal={evidenceContext?.signal ?? ''}
      data-alert-silence-evidence-return={evidenceContext?.returnHref ?? ''}
      data-alert-silence-prefill-labels={evidenceContext?.labelsText ?? ''}
      data-alert-silence-draft-labels={draft?.labelsText ?? ''}
    />
  )
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

const EMPTY_ROUTE_STATE: AlertSilenceRouteState = {
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

async function renderAlertSilencePage(initialRouteState: AlertSilenceRouteState = EMPTY_ROUTE_STATE) {
  const { default: AlertSilencePage } = await import('./alert-silence-page');
  return renderToStaticMarkup(<AlertSilencePage initialRouteState={initialRouteState} />);
}

describe('alert silence page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the silence workbench through the shared query and surface contracts', async () => {
    const html = await renderAlertSilencePage();

    expect(html).toContain('data-alert-silence-surface="true"');
    expect(html).toContain('data-page-size-options="8|15|25"');
    expect(html).toContain('data-loading-copy="Loading silence rules"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
  }, 30_000);

  it('passes topology edge return context into the silence surface', async () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const initialRouteState: AlertSilenceRouteState = {
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
      signalContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        returnTo
      },
      managementContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo,
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      }
    };

    const html = await renderAlertSilencePage(initialRouteState);

    expect(html).toContain('&quot;edgeId&quot;:&quot;svc-checkout--res-orders-db&quot;');
    expect(html).toContain('&quot;viewMode&quot;:&quot;resource-dependency&quot;');
    expect(html).toContain('&quot;sourceKind&quot;:&quot;database-middleware-connection&quot;');
    expect(html).toContain('&quot;returnTo&quot;:&quot;/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain('returnLabel=');
    expect(html).not.toContain('HertzBeat operations topology');
  }, 30_000);

  it('preserves three-signal evidence context into new silence authoring', async () => {
    const initialRouteState: AlertSilenceRouteState = {
      signal: 'logs',
      returnContext: {
        search: 'checkout',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo: '/log/manage?view=list&traceId=trace-123',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        source: 'otlp',
        signal: 'logs',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service'
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
        returnTo: '/log/manage?view=list&traceId=trace-123'
      },
      managementContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo: '/log/manage?view=list&traceId=trace-123',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      }
    };

    const html = await renderAlertSilencePage(initialRouteState);

    expect(html).toContain('data-alert-silence-evidence-context="signal-route"');
    expect(html).toContain('data-alert-silence-evidence-signal="logs"');
    expect(html).toContain('data-alert-silence-evidence-return="/log/manage?view=list&amp;traceId=trace-123"');
    expect(html).toContain('hertzbeat.signal:logs');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(html).toContain('span_id:span-456');
    expect(html).toContain('hertzbeat.collector:edge-collector-a');
    expect(html).toContain('data-alert-silence-draft-labels="hertzbeat.signal:logs');
    expect(html).not.toContain('returnLabel=');
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    expect(source).not.toContain('useSearchParams');
    expect(source).not.toContain('queryStateFromParams(searchParams)');
    expect(source).not.toContain('readSignalRouteContext(searchParams)');
    expect(source).toContain('const alertSilenceRouteState = initialRouteState ?? EMPTY_ALERT_SILENCE_ROUTE_STATE');
  }, 30_000);

  it('loads Angular entity-noise-control matched silence rules by id', async () => {
    const returnTo = '/entities/42?tab=alerts';
    const initialRouteState: AlertSilenceRouteState = {
      returnContext: {
        search: 'checkout',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'checkout-api',
        returnTo
      },
      signal: null,
      signalContext: {
        entityId: '42',
        entityName: 'checkout-api',
        returnTo
      },
      managementContext: {
        entityId: '42',
        entityName: 'checkout-api',
        returnTo,
        returnLabel: 'checkout-api',
        matchMode: 'entity-noise-controls',
        matchingRuleType: 'silence',
        matchingRuleIds: [11, 12],
        matchedViewEnabled: true
      }
    };
    apiMessageGet.mockImplementation(async (url: string) => {
      if (url === '/alert/silence/11') {
        return { id: 11, name: 'checkout silence', enable: true, matchAll: false, labels: { service: 'checkout' }, type: 0 };
      }
      if (url === '/alert/silence/12') {
        throw new Error('missing');
      }
      return mockState.renderData.list;
    });

    const html = await renderAlertSilencePage(initialRouteState);
    const loaded = await mockState.lastLoad?.() as any;

    expect(html).toContain('data-alert-silence-match-mode="entity-noise-controls"');
    expect(html).toContain('data-alert-silence-match-view="matched"');
    expect(html).toContain('data-alert-silence-matching-rule-ids="11,12"');
    expect(apiMessageGet).toHaveBeenCalledWith('/alert/silence/11');
    expect(apiMessageGet).toHaveBeenCalledWith('/alert/silence/12');
    expect(apiMessageGet).not.toHaveBeenCalledWith('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(loaded.list.content.map((item: any) => item.id)).toEqual([11]);
    expect(loaded.missingMatchedRuleCount).toBe(1);
  }, 30_000);

  it('keeps alert silence remounts on a short settled cache window with refresh-tick invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_SILENCE_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('ALERT_SILENCE_LABEL_OPTIONS_TIMEOUT_MS = 2_500');
    expect(source).toContain('withTimeoutFallback(');
    expect(source).toContain('const [refreshTick, setRefreshTick] = useState(0)');
    expect(source).toContain('const [pageIndex, setPageIndex] = useState(0)');
    expect(source).toContain('const [pageSize, setPageSize] = useState<number>(ALERT_SILENCE_PAGE_SIZE_OPTIONS[0])');
    expect(source).toContain("['alert-silence', useMatchedView ? `matched:${matchedRuleIdsKey}` : alertSilenceListUrl, refreshTick].join('|')");
    expect(source).toContain('buildAlertSilenceUrl({ search: query, pageIndex, pageSize })');
    expect(source).toContain('[pageIndex, pageSize, query]');
    expect(source).toContain('[alertSilenceListUrl, matchedRuleIdsKey, refreshTick, useMatchedView]');
    expect(source).toContain('loadAlertSilenceDataFromFacade');
    expect(source).toContain('list: api.alertSilences.list');
    expect(source).toContain('loadAlertLabelOptionsFromFacade(api.alertLabels.list)');
    expect(source).toContain('loadMatchedAlertSilencesFromFacade(api.alertSilences.detail, managementContext.matchingRuleIds)');
    expect(source).not.toContain('apiMessageGet<PageResult<AlertSilence>>(alertSilenceListUrl)');
    expect(source).toContain('return { ...data, refreshTick, missingMatchedRuleCount: 0 };');
    expect(source.match(/setRefreshTick\(value => value \+ 1\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('cacheKey={alertSilenceCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_SILENCE_SETTLED_CACHE_TTL_MS}');
    expect(source).toContain('pageSizeOptions={[...ALERT_SILENCE_PAGE_SIZE_OPTIONS]}');
    expect(source).toContain('function handlePageIndexChange(nextPageIndex: number)');
    expect(source).toContain('function handlePageSizeChange(nextPageSize: number)');
    expect(source).toContain('setPageIndex(0);');
  });

  it('keeps Angular no-selection batch delete warning before opening confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');

    expect(source).toContain('if (checkedIds.length === 0)');
    expect(source).toContain("setEditorError(t('common.notify.no-select-delete'))");
    expect(source).toContain('setEditorMessage(null)');
    expect(source).toContain("setDeleteRequest({ kind: 'batch', ids: checkedIds })");
    expect(surfaceSource).toContain('data-alert-silence-delete-selected="toolbar"');
    expect(surfaceSource).toContain('data-alert-silence-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(surfaceSource).not.toContain('disabled={selectedCount === 0}');
  });

  it('uses Angular delete notifications for confirmed delete feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');

    expect(source).toContain('async function handleConfirmedDelete()');
    expect(source).toContain('deleteAlertSilencesFromFacade(api.alertSilences.delete, request.ids)');
    expect(source).toContain('deleteAlertSilenceFromFacade(api.alertSilences.delete, request.ids[0])');
    expect(source).toContain("setEditorMessage(t('common.notify.delete-success'))");
    expect(source).toContain("setEditorError(t('common.notify.delete-fail'))");
    expect(source).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(source).toContain("setEditorErrorContract('delete')");
    expect(source).not.toContain('apiMessageDelete');
    expect(source).not.toContain("setEditorMessage(t('common.delete-success'))");
    expect(source).not.toContain("t('common.delete-failed')");
  });

  it('uses Angular edit notifications for enable-toggle feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const toggleSource = source.slice(
      source.indexOf('async function handleToggleEnabled(silence?: AlertSilence)'),
      source.indexOf('async function handleDelete(silenceId?: number)')
    );

    expect(toggleSource).toContain('async function handleToggleEnabled(silence?: AlertSilence)');
    expect(toggleSource).toContain('updateAlertSilenceEnabledFromFacade(api.alertSilences.update, target, !(target.enable ?? true))');
    expect(toggleSource).toContain("setEditorMessage(t('common.notify.edit-success'))");
    expect(toggleSource).toContain("setEditorError(t('common.notify.edit-fail'))");
    expect(toggleSource).toContain('setEditorErrorDetail(error instanceof Error ? error.message : null)');
    expect(toggleSource).toContain("setEditorErrorContract('enable')");
    expect(toggleSource).not.toContain('apiMessagePut');
    expect(toggleSource).not.toContain("setEditorMessage(t('common.save-success'))");
    expect(toggleSource).not.toContain("t('common.save-failed')");
  });

  it('uses Angular create/edit notifications for editor save feedback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const saveSource = source.slice(
      source.indexOf('async function handleSave()'),
      source.indexOf('async function handleToggleEnabled(silence?: AlertSilence)')
    );

    expect(saveSource).toContain('const isEdit = Boolean(draft.id)');
    expect(saveSource).toContain('updateAlertSilenceFromFacade(api.alertSilences.update, draft)');
    expect(saveSource).toContain('createAlertSilenceFromFacade(api.alertSilences.create, draft)');
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

  it('keeps Angular created-outside-matched notice state for matched-view authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');

    expect(source).toContain('const [createdOutsideMatchedViewNotice, setCreatedOutsideMatchedViewNotice] = useState(false)');
    expect(source).toContain('setCreatedOutsideMatchedViewNotice(false)');
    expect(source).toContain('createdOutsideMatchedViewNotice={createdOutsideMatchedViewNotice}');
    expect(surfaceSource).toContain('data-alert-silence-created-outside-matched="angular-authoring-notice"');
    expect(surfaceSource).toContain('data-alert-silence-created-outside-matched-owner="hertzbeat-ui-inline-feedback"');
    expect(surfaceSource).toContain('data-alert-silence-created-outside-matched-action="view-all"');
  });

  it('keeps Angular entity alert common-label prefill for new silence authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const surfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');

    expect(source).toContain('buildAlertSilenceEntityPrefillFromFacade(');
    expect(source).toContain("entityId => api.entities.alerts(entityId, { pageIndex: 0, pageSize: 20, status: 'firing' })");
    expect(source).not.toContain("from '../../../lib/api-client'");
    expect(source).toContain("t('entity.noise-controls.authoring.silence.prefill-warning')");
    expect(source).toContain("t('entity.noise-controls.authoring.prefill-warning.no-entity-id')");
    expect(source).toContain('entityPrefillSource={entityPrefillSource}');
    expect(source).toContain('entityPrefillWarning={entityPrefillWarning}');
    expect(surfaceSource).toContain('data-alert-silence-entity-prefill=');
    expect(surfaceSource).toContain("t('entity.noise-controls.authoring.silence.title')");
    expect(surfaceSource).toContain("t('entity.noise-controls.authoring.silence.prefill-success')");
    expect(surfaceSource).toContain('prefillWarning={entityPrefillWarning}');
  });

  it('uses Angular edit failure notification for edit detail load fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/silence/alert-silence-page.tsx'), 'utf8');
    const editSource = source.slice(
      source.indexOf('async function handleEdit(silenceId?: number)'),
      source.indexOf('async function handleSave()')
    );

    expect(editSource).toContain('async function handleEdit(silenceId?: number)');
    expect(editSource).toContain('loadAlertSilenceDetailFromFacade(api.alertSilences.detail, targetId)');
    expect(editSource).toContain("setEditorError(error instanceof Error ? error.message : t('common.notify.edit-fail'))");
    expect(editSource).not.toContain('apiMessageGet');
    expect(editSource).not.toContain("t('common.load-failed')");
  });
});
