'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorEditorSurface } from '../../../components/pages/monitor-editor-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/monitor-api-facade';
import { buildMonitorEditorCollectorsUrl, buildMonitorEditorParamDefinesUrl, loadMonitorEditorDraftFromFacade } from '@/lib/monitor-editor/controller';
import type { MonitorNewRouteState } from '@/lib/monitor-editor/query-state';

const MONITOR_NEW_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_MONITOR_NEW_ROUTE_STATE: MonitorNewRouteState = {
  app: 'website',
  returnContext: {}
};

export default function MonitorNewPage({ initialRouteState }: { initialRouteState?: MonitorNewRouteState } = {}) {
  const { t } = useI18n();
  const monitorNewRouteState = initialRouteState ?? EMPTY_MONITOR_NEW_ROUTE_STATE;
  const { app, returnContext } = monitorNewRouteState;
  const monitorNewCollectorsUrl = React.useMemo(() => buildMonitorEditorCollectorsUrl(), []);
  const monitorNewParamsUrl = React.useMemo(() => buildMonitorEditorParamDefinesUrl(app), [app]);
  const monitorNewCacheKey = React.useMemo(
    () => ['monitor-editor-new', monitorNewCollectorsUrl, monitorNewParamsUrl].join(':'),
    [monitorNewCollectorsUrl, monitorNewParamsUrl]
  );

  const load = useCallback(
    async () =>
      loadMonitorEditorDraftFromFacade(
        {
          readCollectors: api.monitors.editorCollectors,
          readParamDefines: api.monitors.editorParamDefines
        },
        'new',
        { app }
      ),
    [app]
  );

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
        loadingCopy={t('monitor.editor.loading.new')}
        cacheKey={monitorNewCacheKey}
        cacheSettledTtlMs={MONITOR_NEW_SETTLED_CACHE_TTL_MS}
      >
        {data => (
          <MonitorEditorSurface
            initial={data}
            mode="new"
            returnContext={returnContext}
          />
        )}
      </ClientWorkbench>
    </div>
  );
}
