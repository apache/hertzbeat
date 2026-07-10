'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HzButton, HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorEditorSurface } from '../../../../components/pages/monitor-editor-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/monitor-api-facade';
import { buildMonitorEditCacheKey, loadMonitorEditorDraftFromFacade } from '@/lib/monitor-editor/controller';
import type { MonitorEditRouteState } from '@/lib/monitor-editor/query-state';
import { buildMonitorListReturnHref } from '@/lib/monitor-manage/navigation';

const MONITOR_EDIT_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_MONITOR_EDIT_ROUTE_STATE: MonitorEditRouteState = {
  returnContext: {}
};

export default function MonitorEditPage({
  monitorId,
  initialRouteState
}: {
  monitorId: string;
  initialRouteState?: MonitorEditRouteState;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const monitorEditRouteState = initialRouteState ?? EMPTY_MONITOR_EDIT_ROUTE_STATE;
  const { returnContext } = monitorEditRouteState;
  const monitorEditCacheKey = React.useMemo(() => buildMonitorEditCacheKey(monitorId), [monitorId]);
  const routeListReturnHref = React.useMemo(() => buildMonitorListReturnHref(returnContext), [returnContext]);

  const load = useCallback(async () => {
    return loadMonitorEditorDraftFromFacade(
      {
        readMonitorDetail: api.monitors.editorDetail,
        readCollectors: api.monitors.editorCollectors,
        readParamDefines: api.monitors.editorParamDefines
      },
      'edit',
      { monitorId }
    );
  }, [monitorId]);

  return (
    <div
      data-monitor-editor-app-source-contract="angular-route-context-hidden-field"
      data-monitor-editor-static-host-position-contract="angular-before-name"
      data-monitor-editor-field-order-contract="angular-monitor-form-sequence"
      data-monitor-editor-detect-payload-contract="angular-monitor-collector-params-no-grafana"
      data-monitor-editor-save-payload-contract="angular-monitor-collector-params-grafana"
      data-monitor-editor-payload-param-merge-contract="angular-params-advanced-sdparams"
      data-monitor-editor-payload-host-instance-contract="angular-host-param-as-instance"
      data-monitor-editor-service-discovery-params="angular-nonstatic-only"
      data-monitor-editor-ssl-port-notice="angular-info-notification"
      data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"
      data-monitor-editor-label-selector="angular-app-label-selector"
    >
      <ClientWorkbench
        load={load}
        loadingCopy={t('monitor.editor.loading.edit')}
        cacheKey={monitorEditCacheKey}
        cacheSettledTtlMs={MONITOR_EDIT_SETTLED_CACHE_TTL_MS}
        renderError={(message, retry) => (
          <section
            className="mx-auto w-full max-w-[1320px] px-3 py-6"
            data-monitor-editor-route-state="error"
            data-monitor-editor-route-state-owner="hertzbeat-ui-inline-feedback"
            data-monitor-editor-edit-error-state="angular-route-state"
          >
            <HzInlineFeedback
              tone="critical"
              title={t('monitor.route-state.form.error.title')}
              description={
                <>
                  {t('monitor.route-state.form.error.copy')}
                  <span className="sr-only">{message}</span>
                </>
              }
              variant="embedded"
              data-monitor-editor-route-state-feedback="error"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <HzButton
                size="sm"
                intent="primary"
                onClick={retry}
                data-monitor-editor-route-state-retry="true"
                data-monitor-editor-route-state-retry-owner="hertzbeat-ui-button"
              >
                {t('monitor.route-state.action.retry')}
              </HzButton>
              <HzButton
                size="sm"
                intent="secondary"
                onClick={() => router.push(routeListReturnHref)}
                data-monitor-editor-route-state-list-return="true"
                data-monitor-editor-route-state-list-return-owner="hertzbeat-ui-button"
                data-monitor-editor-route-state-list-return-target={routeListReturnHref}
              >
                {t('monitor.detail.back')}
              </HzButton>
            </div>
          </section>
        )}
      >
        {data => (
          <MonitorEditorSurface
            initial={data}
            mode="edit"
            returnContext={returnContext}
          />
        )}
      </ClientWorkbench>
    </div>
  );
}
