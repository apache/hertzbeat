import type { SpanFilterControls } from '../model/explore-span-filter';
import { buildTraceLogsPath } from '../model/explore-trace-log-return';
/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { OperationalResultRegion } from '@/shared/operational-page';
import type { SharedTimeValue } from '@/shared/time';

import { ExploreLogInvestigationView } from '../components/explore-log-investigation-view';
import { InvestigationRequestState } from '../components/explore-investigation-request-state';
import { ExploreTraceInvestigationView } from '../components/explore-trace-investigation-view';
import { ExploreWorkbench } from '../components/explore-workbench';
import { useLogInvestigationController } from '../controller/use-log-investigation-controller';
import { useTraceInvestigationController } from '../controller/use-trace-investigation-controller';
import type { InvestigationLogRecord } from '../model/explore-investigation-contract';
import {
  buildLogInvestigationMetricsPath,
  buildLogInvestigationTopologyPath,
  buildTraceInvestigationMetricsPath,
  buildTraceInvestigationTopologyPath
} from '../model/explore-investigation-handoff-model';
import {
  buildExplorePath,
  mergeExploreQuery,
  normalizeExploreReturnTo,
  signalSelectionPatch
} from '../model/explore-model';
import type { ExploreQueryPatch, LogExploreQuery, TraceExploreQuery } from '../model/explore-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreLogsViewTrigger, ExploreLogsViewsRail } from '../components/explore-logs-saved-views';
import logWorkspaceStyles from './explore-logs-workspace.module.css';

type CommonProps = {
  embedded?: boolean;
  actions?: ReactNode;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  time: SharedTimeValue | null | undefined;
  openPath: (path: string) => void;
};

export function ExploreFocusedTracePage({
  query,
  ...common
}: CommonProps & SpanFilterControls & { query: TraceExploreQuery }) {
  const investigation = useTraceInvestigationController(query);
  const state = investigation.state;
  const metricsPath = state.kind === 'ready' ? buildTraceInvestigationMetricsPath(query, state.snapshot) : undefined;
  const topologyPath = state.kind === 'ready' ? buildTraceInvestigationTopologyPath(state.snapshot) : undefined;
  return (
    <>
      {!common.embedded && <ExploreWorkbench {...common} query={query} />}
      <OperationalResultRegion>
        {state.kind === 'ready' ? (
          <ExploreTraceInvestigationView
            drawerPresentation={common.embedded === true}
            onAddSpanFilter={common.onAddSpanFilter}
            spanFilterDisabledReason={common.spanFilterDisabledReason}
            onApplySpanFilters={common.onApplySpanFilters}
            spanFilterPending={common.spanFilterPending}
            state={state}
            evidenceCurrent={investigation.evidenceCurrent}
            evidenceIdentity={investigation.evidenceIdentity}
            onBack={() => common.openPath(backToResultsPath(query))}
            onRefresh={() => void investigation.refetch()}
            onSelectSpan={spanId => common.openPath(buildExplorePath(mergeExploreQuery(query, { spanId })))}
            onOpenLogs={() => common.openPath(buildTraceLogsPath(query, state.snapshot.traceId, undefined))}
            onOpenSpanLogs={() =>
              common.openPath(
                buildTraceLogsPath(query, state.snapshot.traceId, state.snapshot.selectedSpanId ?? undefined)
              )
            }
            {...(metricsPath ? { onOpenMetrics: () => common.openPath(metricsPath) } : {})}
            {...(topologyPath ? { onOpenTopology: () => common.openPath(topologyPath) } : {})}
          />
        ) : (
          <InvestigationRequestState state={state.kind} retry={investigation.refetch} t={common.t} />
        )}
      </OperationalResultRegion>
    </>
  );
}

export function ExploreFocusedLogPage({
  query,
  savedQueries,
  ...common
}: CommonProps & { query: LogExploreQuery; savedQueries?: SavedQueriesViewModel }) {
  const investigation = useLogInvestigationController(query);
  const state = investigation.state;
  const metricsPath = state.kind === 'ready' ? buildLogInvestigationMetricsPath(query, state.snapshot) : undefined;
  const topologyPath = state.kind === 'ready' ? buildLogInvestigationTopologyPath(state.snapshot) : undefined;
  return (
    <>
      <div className={logWorkspaceStyles.workspace} data-explore-workspace="true">
        <ExploreWorkbench
          {...common}
          query={query}
          actions={savedQueries ? <ExploreLogsViewTrigger model={savedQueries} /> : common.actions}
        />
        <div className={logWorkspaceStyles.workArea}>
          {savedQueries && <ExploreLogsViewsRail model={savedQueries} />}
          <div className={logWorkspaceStyles.panel}>
            <OperationalResultRegion>
              {state.kind === 'ready' ? (
                <ExploreLogInvestigationView
                  state={state}
                  evidenceCurrent={investigation.evidenceCurrent}
                  onBack={() => common.openPath(backToResultsPath(query))}
                  onRefresh={() => void investigation.refetch()}
                  onFocusTrace={() => common.openPath(logTracePath(query, state.snapshot.selectedLog.log))}
                  {...(metricsPath ? { onOpenMetrics: () => common.openPath(metricsPath) } : {})}
                  {...(topologyPath ? { onOpenTopology: () => common.openPath(topologyPath) } : {})}
                />
              ) : (
                <InvestigationRequestState state={state.kind} retry={investigation.refetch} t={common.t} />
              )}
            </OperationalResultRegion>
          </div>
        </div>
      </div>
    </>
  );
}

function backToResultsPath(query: TraceExploreQuery | LogExploreQuery) {
  const returnTo = normalizeExploreReturnTo(query.returnTo);
  if (returnTo) return returnTo;
  return buildExplorePath(
    mergeExploreQuery(query, {
      traceId: undefined,
      spanId: undefined,
      logRecordUid: undefined,
      returnTo: undefined
    })
  );
}

function logTracePath(query: LogExploreQuery, log: InvestigationLogRecord | null) {
  return buildExplorePath(
    mergeExploreQuery(query, {
      ...signalSelectionPatch('traces'),
      traceId: log?.traceId ?? undefined,
      spanId: log?.spanId ?? undefined,
      returnTo: backToResultsPath(query)
    })
  );
}
