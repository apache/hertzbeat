/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { parseLogView } from '@/platform/perses';
import { Button, Select } from 'antd';
import { useRef, useState, type RefObject } from 'react';
import { useLogPreferenceScope } from '../controller/use-log-preference-scope';

import { ExploreLogStatistics } from '../components/explore-log-statistics';
import historyStyles from '../components/explore-history-result.module.css';
import { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { readLogDisplayPreferences } from '../model/explore-log-display-preferences';
import { buildExplorePath, logTrendZoomPatch, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { focusLogSyntaxDiagnostic } from '../components/focus-log-syntax-diagnostic';
import { trendAction, trendFailureMessage } from './explore-log-trend-failure';
import {
  comparisonFacetContext,
  nextQuerySetTarget,
  querySetTimelineContext
} from './explore-workspace-log-facet-context';
import { facetRequestsEnabled, logFacetEvidenceWindow } from '../controller/use-log-facets';
import { useLogSourceTrend } from '../controller/use-log-source-trend';
import styles from './explore-logs-workspace.module.css';

export function ExploreLogTrendRegion({
  controller,
  t
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
}) {
  const scope = useLogPreferenceScope();
  const { query, result } = controller;
  const region = useRef<HTMLElement>(null);
  if (query.signal !== 'logs' || query.live || query.logRecordUid) return null;
  if (!timelineVisible(query.logView, scope)) return null;
  const showEvidence = currentLogEvidence(result);
  const state = result.kind === 'refreshing' ? 'refreshing' : showEvidence ? showEvidence.kind : result.kind;
  const hasQuerySet = hasLogQuerySet(controller);
  return (
    <section
      className={[historyStyles.logRegion, styles.trendShell].join(' ')}
      ref={region}
      data-explore-log-region="trend"
      data-trend-state={state}
      role="region"
      aria-label={t('exploreLog.trend')}
      aria-busy={state === 'loading' || state === 'refreshing'}
    >
      {hasQuerySet ? (
        <QuerySetTrend controller={controller} t={t} />
      ) : showEvidence ? (
        <CurrentTrend controller={controller} query={query} evidence={showEvidence} t={t} />
      ) : (
        <TrendPlaceholder controller={controller} region={region} state={state} t={t} />
      )}
    </section>
  );
}

function hasLogQuerySet(controller: Controller) {
  const query = controller.query;
  const draft = controller.submission?.draft;
  return Boolean(
    (query.signal === 'logs' && readLogAnalysisDraft(query.logAnalysis)?.querySet) ||
    (draft?.signal === 'logs' && readLogAnalysisDraft(draft.logAnalysis)?.querySet)
  );
}

function QuerySetTrend({ controller, t }: { controller: Controller; t: TFunction }) {
  const { query } = controller;
  if (query.signal !== 'logs') return null;
  return <QuerySetTrendForLogs controller={controller} query={query} t={t} />;
}

// eslint-disable-next-line complexity -- selected source, request state, and zoom share one timeline context.
function QuerySetTrendForLogs({
  controller,
  query,
  t
}: {
  controller: Controller;
  query: LogExploreQuery;
  t: TFunction;
}) {
  const [selection, setSelection] = useState<{ refs: string[]; ref: string }>({ refs: [], ref: 'a' });
  const first = comparisonFacetContext(controller, selection.ref);
  const refs = first.targets?.map(target => target.value) ?? [];
  const target = nextQuerySetTarget(refs, selection.refs, selection.ref);
  if (refs.join(',') !== selection.refs.join(',') || selection.ref !== target) setSelection({ refs, ref: target });
  const context = querySetTimelineContext(controller, target);
  const source = context.appliedSource;
  const window = context.window;
  const projected = context.query;
  const active = Boolean(
    source && context.draftSource && window && projected && facetRequestsEnabled(query, controller.result, window)
  );
  const sourcePending = Boolean(context.draftSource && !source);
  const refreshRevision =
    controller.result.kind === 'refreshing' || controller.result.kind === 'stale_error'
      ? controller.result.evidence.revision
      : controller.result.kind === 'ready' || controller.result.kind === 'empty'
        ? controller.result.revision
        : 0;
  const trend = useLogSourceTrend({ query, projected, window, refreshRevision, active });
  return (
    <>
      {active && trend.data && !trend.isError ? (
        <ExploreLogStatistics
          headerAction={
            <TimelineTargetControl refs={refs} target={target} onChange={ref => setSelection({ refs, ref })} t={t} />
          }
          statistics={trend.data}
          timeWindow={window!}
          runtimeIdentity={JSON.stringify(['querySet-source-trend', target, projected, window])}
          retry={trend.data.trend.kind === 'error' ? async () => void (await trend.refetch()) : undefined}
          onTimeWindowChange={next => {
            if (controller.result.kind !== 'ready' && controller.result.kind !== 'empty') return;
            if (trend.isFetching) return;
            const shift = source?.timeShiftMs ?? 0;
            const baseWindow = logFacetEvidenceWindow(query, controller.result);
            if (!baseWindow) return;
            const mapped = { from: next.from + shift, to: next.to + shift };
            const patch = logTrendZoomPatch(query, baseWindow, mapped);
            if (patch) controller.openPath(buildExplorePath(mergeExploreQuery(query, patch)));
          }}
          t={t}
        />
      ) : (
        <div className={styles.trendPlaceholder}>
          <TimelineTargetControl refs={refs} target={target} onChange={ref => setSelection({ refs, ref })} t={t} />
          <span role={trend.isPending && active ? 'status' : 'alert'}>
            {trend.isPending && active
              ? t('common.loading')
              : sourcePending
                ? t('explore.logComparison.sourceNotExecuted')
                : active || trend.isError
                  ? t('exploreLog.statisticsUnavailable')
                  : trendFailureMessage(controller.result, t, query)}
          </span>
          {active && trend.isError && (
            <Button size="small" onClick={() => void trend.refetch()}>
              {t('common.retry')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function TimelineTargetControl({
  refs,
  target,
  onChange,
  t
}: {
  refs: string[];
  target: string;
  onChange: (ref: string) => void;
  t: TFunction;
}) {
  return (
    <label className={styles.timelineTarget}>
      {t('explore.logComparison.timelineTarget')}{' '}
      <Select
        aria-label={t('explore.logComparison.timelineTarget')}
        value={target}
        onChange={onChange}
        options={refs.map(ref => ({ value: ref, label: t('explore.logComparison.queryTarget', { ref }) }))}
      />
    </label>
  );
}

function timelineVisible(logView: string | undefined, scope?: { workspaceId: string; username: string }) {
  if (logView === undefined) return readLogDisplayPreferences(scope).showTimeline !== false;
  try {
    return parseLogView(logView).showTimeline !== false;
  } catch {
    return true;
  }
}

type Result = ReturnType<typeof useExplorePageController>['result'];
type Controller = ReturnType<typeof useExplorePageController>;

function currentLogEvidence(result: Result) {
  if (result.kind === 'stale_error') return undefined;
  const evidence = result.kind === 'refreshing' ? result.evidence : result;
  return (evidence.kind === 'ready' || evidence.kind === 'empty') && evidence.signal === 'logs' ? evidence : undefined;
}

function CurrentTrend({
  controller,
  query,
  evidence,
  t
}: {
  controller: Controller;
  query: LogExploreQuery;
  evidence: NonNullable<ReturnType<typeof currentLogEvidence>>;
  t: TFunction;
}) {
  const { result, openPath } = controller;
  const current = result.kind === 'ready' || result.kind === 'empty';
  return (
    <ExploreLogStatistics
      defaultCollapsed={readLogAnalysisDraft(query.logAnalysis)?.representation === 'timeseries'}
      statistics={evidence.statistics}
      timeWindow={evidence.window}
      runtimeIdentity={
        createExploreLogPersesResult(query, evidence.data, evidence.window, evidence.revision).runtimeIdentity
      }
      retry={evidence.statistics.trend.kind === 'error' ? controller.refresh : undefined}
      onTimeWindowChange={
        current
          ? nextWindow => {
              const patch = logTrendZoomPatch(query, evidence.window, nextWindow);
              if (patch) openPath(buildExplorePath(mergeExploreQuery(query, patch)));
            }
          : undefined
      }
      t={t}
    />
  );
}

function TrendPlaceholder({
  controller,
  region,
  state,
  t
}: {
  controller: Controller;
  region: RefObject<HTMLElement | null>;
  state: string;
  t: TFunction;
}) {
  const result = controller.result;
  const action = trendAction(result);
  return (
    <div className={styles.trendPlaceholder}>
      <span role={state === 'loading' ? 'status' : 'alert'}>{trendFailureMessage(result, t, controller.query)}</span>
      {action === 'retry' && (
        <Button size="small" onClick={() => void controller.refresh()}>
          {t('common.retry')}
        </Button>
      )}
      {action === 'review' && (
        <Button size="small" onClick={() => focusCurrentQuery(region.current, result)}>
          {t('explore.recovery.reviewQuery')}
        </Button>
      )}
    </div>
  );
}

function focusCurrentQuery(region: HTMLElement | null, result: Result) {
  if (focusLogSyntaxDiagnostic(region, 'syntaxDiagnostic' in result ? result.syntaxDiagnostic : undefined)) return;
  region
    ?.closest('[data-explore-query-layout]')
    ?.querySelector<HTMLElement>('[data-log-comparison-source="a"] [data-log-search-input]')
    ?.focus();
}
