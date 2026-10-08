/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ExploreLogTransactionWorkspace } from './explore-log-transaction-workspace';
import { useLogWorkspaceSources } from '../controller/use-log-workspace-sources';
import { ExploreLogComparisonResult } from '../components/explore-log-comparison-result';
import { ExploreLogFormulaOnlyResult } from '../components/explore-log-formula-only-result';
import { comparisonNavigation, analysisNavigation } from '../controller/explore-log-comparison-navigation';
import { readAnalysis, workspaceAnalysis } from '../controller/explore-log-workspace-analysis';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreLogAnalysisResult } from '../components/explore-log-analysis-result';
import { ExploreLogQuerySetResult } from '../components/explore-log-query-set-result';
import { useCalculatedAnalysis } from '../controller/use-calculated-analysis';
import { ExploreCalculatedAnalysisResult } from '../components/explore-calculated-analysis-result';
import { draftFromQuery } from '../model/explore-submission-model';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  children: ReactNode;
};
export function ExploreLogWorkspaceResults({ controller, t, children }: Props) {
  if (
    controller.query.signal !== 'logs' ||
    (controller.query.live && controller.query.logAggregation !== 'transactions') ||
    controller.query.logRecordUid
  )
    return children;
  if (controller.query.logCalculatedV2 !== undefined || controller.query.logSubquery !== undefined)
    return (
      <CalculatedWorkspace controller={controller} t={t}>
        {children}
      </CalculatedWorkspace>
    );
  return (
    <ExploreLogTransactionWorkspace controller={controller} t={t}>
      <HistoricalLogWorkspace controller={controller} t={t}>
        {children}
      </HistoricalLogWorkspace>
    </ExploreLogTransactionWorkspace>
  );
}

function CalculatedWorkspace({ controller, t, children }: Props) {
  const { query, result } = controller;
  if (query.signal !== 'logs') return children;
  const analysis = readAnalysis(query.logAnalysis);
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  const window =
    'window' in evidence && 'signal' in evidence && evidence.signal === 'logs' ? evidence.window : undefined;
  const revision = 'revision' in evidence ? evidence.revision : 0;
  return <CalculatedAnalysisView {...{ controller, t, children, analysis, window, revision }} />;
}

function CalculatedAnalysisView({
  controller,
  t,
  children,
  analysis,
  window,
  revision
}: Props & {
  analysis: ReturnType<typeof readAnalysis>;
  window: { from: number; to: number } | undefined;
  revision: number;
}) {
  const { query, result } = controller;
  const active = query.signal === 'logs' && analysis.valid && analysis.value.representation === 'timeseries';
  const load = useCalculatedAnalysis(query as Extract<typeof query, { signal: 'logs' }>, window, active, revision);
  if (!active || !window) return children;
  const current =
    result.kind === 'ready' && JSON.stringify(controller.submission.draft) === JSON.stringify(draftFromQuery(query));
  return (
    <ExploreCalculatedAnalysisResult
      load={load}
      t={t}
      onTimeWindowChange={
        current && load.state === 'ready' && window
          ? selected => {
              if (selected.from >= window.from && selected.to <= window.to && selected.from < selected.to)
                controller.updateQuery({
                  start: selected.from,
                  end: selected.to,
                  windowMode: undefined,
                  pageIndex: undefined,
                  autoRefreshMs: undefined
                });
            }
          : undefined
      }
    />
  );
}

function HistoricalLogWorkspace({ controller, t, children }: Props) {
  const { query, result } = controller;
  const { valid, applied } = workspaceAnalysis(controller);
  const { window, enabled, load, comparison, querySet } = useLogWorkspaceSources(
    query,
    result,
    applied,
    valid,
    controller.handoff
  );
  const useAutomaticInterval = () =>
    controller.submission.applyLogPatch({ logAnalysis: JSON.stringify({ ...applied, intervalMs: undefined }) });
  const resultProps = {
    t,
    timeZone: query.timeZone,
    onUseAuto: useAutomaticInterval
  };
  const resultView = applied.querySet ? (
    <ExploreLogQuerySetResult
      load={querySet}
      t={t}
      onUseAuto={resultProps.onUseAuto}
      formulaFunctions={applied.querySet.formulas}
    />
  ) : applied.comparison?.search !== undefined ? (
    <ExploreLogComparisonResult
      key={JSON.stringify(applied.comparison)}
      load={comparison}
      hidden={applied.comparison.hidden}
      {...resultProps}
      {...comparisonNavigation(controller, comparison, applied, window)}
    />
  ) : applied.comparison?.formula ? (
    <ExploreLogFormulaOnlyResult
      load={load}
      formula={applied.comparison.formula}
      hidden={applied.comparison.hidden ?? []}
      {...resultProps}
      onTimeWindowChange={analysisNavigation(controller, load, window).onTimeWindowChange}
    />
  ) : (
    <ExploreLogAnalysisResult
      load={load}
      {...resultProps}
      representation={applied.representation}
      {...analysisNavigation(controller, load, window)}
    />
  );
  return !valid ? null : applied.representation === 'logs' ? children : enabled ? resultView : children;
}
