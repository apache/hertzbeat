'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { HzIncidentWorkbench } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { useI18n } from '../../components/providers/i18n-provider';
import { apiMessageGet, apiMessagePut } from '../../lib/api-client';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { formatTime } from '../../lib/format';
import {
  INCIDENT_WORKBENCH_DEFAULT_QUERY,
  type IncidentTransitionState,
  loadIncidentWorkbenchData,
  transitionIncidentStatus,
  type IncidentWorkbenchData
} from '../../lib/incidents-surface/controller';
import type { StatusIncidentListQuery } from '../../lib/setting-status/controller';

const INCIDENT_WORKBENCH_SETTLED_CACHE_TTL_MS = 10_000;
const INCIDENT_TRANSITION_STATES: IncidentTransitionState[] = [1, 2, 3];

function IncidentWorkbenchSurface({
  state,
  onTransition
}: {
  state: IncidentWorkbenchData;
  onTransition: (incident: NonNullable<IncidentWorkbenchData['selectedIncident']>, nextState: IncidentTransitionState) => Promise<void>;
}) {
  const coldOpsVisual = hzOpsCatalogVisual;
  const { t } = useI18n();
  const [transitionBusy, setTransitionBusy] = useState<IncidentTransitionState | null>(null);
  const transitionDisabled = state.transitionState !== 'ready' || !state.selectedIncident || transitionBusy != null;

  async function handleTransition(nextState: IncidentTransitionState) {
    if (!state.selectedIncident || transitionBusy != null) {
      return;
    }
    setTransitionBusy(nextState);
    try {
      await onTransition(state.selectedIncident, nextState);
    } finally {
      setTransitionBusy(null);
    }
  }

  return (
    <main
      className={coldOpsVisual.entry.main}
      data-incidents-route="incident-workbench-api-ui-lab-shared"
      data-incidents-style-baseline={coldOpsVisual.canvasName}
      data-incidents-workbench="hertzbeat-ui"
      data-incidents-api-owner="status-page-incident-api"
      data-incidents-api-source={state.apiSource}
      data-incidents-api-state={state.apiState}
      data-incidents-api-total={state.totalElements}
      data-incidents-detail-owner="status-page-incident-detail-api"
      data-incidents-detail-source={state.detailSource}
      data-incidents-detail-state={state.detailState}
      data-incidents-detail-id={state.detailId || ''}
      data-incidents-transition-owner="status-page-incident-put-api"
      data-incidents-transition-source="/status/page/incident"
      data-incidents-transition-state={state.transitionState}
      data-incidents-transition-pending={transitionBusy == null ? 'none' : String(transitionBusy)}
      data-incidents-query-contract="angular-search-pagination"
      data-incidents-query-label={state.queryLabel}
    >
      <div className={coldOpsVisual.entry.container}>
        <HzIncidentWorkbench
          data-incidents-shared-workbench="hertzbeat-ui"
          title={state.title}
          subtitle={state.subtitle}
          sourceLabel={state.kicker}
          queryLabel={state.queryLabel}
          metrics={state.metrics}
          incidents={state.incidents}
          timeline={state.timelineRows.map((item, index) => ({
            id: item.id || `incident-timeline-${index + 1}`,
            title: item.title,
            copy: item.copy,
            meta: item.meta,
            tone: item.tone || (index === 0 ? 'warning' : 'info')
          }))}
          ownership={state.ownershipRows.map((item, index) => ({
            id: item.id || `incident-owner-${index + 1}`,
            owner: item.owner,
            queue: item.queue,
            copy: item.copy,
            meta: item.meta,
            tone: item.tone || (index === 0 ? 'info' : 'neutral')
          }))}
          selectedIncidentId={state.selectedIncidentId}
          emptyLabel={t('incidents.table.empty')}
          actions={state.nextHops.map(action => ({
            label: action.label,
            href: action.href,
            variant: action.variant === 'default' ? 'default' : action.variant
          }))}
          transitionLabel={t('common.status')}
          labels={{
            incident: t('incidents.table.incident'),
            severity: t('incidents.table.severity'),
            stage: t('incidents.table.stage'),
            owner: t('incidents.table.owner'),
            impact: t('incidents.table.impact'),
            timeline: t('incidents.table.timeline'),
            ownership: t('incidents.table.ownership')
          }}
          transitionActions={INCIDENT_TRANSITION_STATES.map(nextState => ({
            id: `state-${nextState}`,
            label: t(`status.incident.state.${nextState}`),
            state: nextState,
            variant: nextState === 3 ? 'primary' : 'default',
            disabled: transitionDisabled,
            pending: transitionBusy === nextState,
            onClick: () => {
              void handleTransition(nextState);
            }
          }))}
        />
      </div>
    </main>
  );
}

export default function IncidentsPage({ initialQuery = INCIDENT_WORKBENCH_DEFAULT_QUERY }: { initialQuery?: StatusIncidentListQuery } = {}) {
  const { t } = useI18n();
  const [refreshTick, setRefreshTick] = useState(0);
  const query = useMemo(
    () => ({
      search: initialQuery.search || '',
      pageIndex: initialQuery.pageIndex ?? INCIDENT_WORKBENCH_DEFAULT_QUERY.pageIndex,
      pageSize: initialQuery.pageSize ?? INCIDENT_WORKBENCH_DEFAULT_QUERY.pageSize
    }),
    [initialQuery.pageIndex, initialQuery.pageSize, initialQuery.search]
  );
  const incidentWorkbenchCacheKey = useMemo(
    () => ['incident-workbench', query.search, query.pageIndex, query.pageSize, refreshTick].join(':'),
    [query, refreshTick]
  );
  const load = useCallback(() => {
    void refreshTick;
    return loadIncidentWorkbenchData(apiMessageGet, t, formatTime, query);
  }, [query, refreshTick, t]);
  const handleTransition = useCallback(async (incident: NonNullable<IncidentWorkbenchData['selectedIncident']>, nextState: IncidentTransitionState) => {
    await transitionIncidentStatus(
      apiMessagePut,
      incident,
      nextState,
      `${t(`status.incident.state.${nextState}`)} · /incidents`
    );
    setRefreshTick(value => value + 1);
  }, [t]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('common.workbench.loading.copy')}
      cacheKey={incidentWorkbenchCacheKey}
      cacheSettledTtlMs={INCIDENT_WORKBENCH_SETTLED_CACHE_TTL_MS}
    >
      {state => <IncidentWorkbenchSurface state={state} onTransition={handleTransition} />}
    </ClientWorkbench>
  );
}
