/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useLogSearchSuggestions } from '../controller/use-log-search-suggestions';
import { useRecentLogSearches } from '../controller/use-recent-log-searches';
import type { useTraceAnalytics } from '../controller/use-trace-analytics';
import { ExploreWorkspaceTraceFacets } from './explore-workspace-trace-facets';
import { ExploreWorkspaceLogFacets } from './explore-workspace-log-facets';
import { ExploreLogAuthoring } from './explore-log-authoring';
import { ExploreLogTrendRegion } from './explore-log-trend-region';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { ExploreMetricPlanInvalid } from '../components/explore-metric-plan-invalid';
import { ExploreQueryBar } from '../components/explore-query-bar';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useMetricPlanEditor } from '../controller/use-metric-plan-editor';
import type { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  editor: ReturnType<typeof useLogQueryBuilder>;
  metricEditor: ReturnType<typeof useMetricPlanEditor>;
  suggestions: ReturnType<typeof useLogScopeSuggestions>;
  results: ReactNode;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
  traceAnalytics?: ReturnType<typeof useTraceAnalytics>;
};

function workspaceFacets({
  controller,
  traceAnalytics,
  editor
}: Pick<Props, 'controller' | 'editor'> & { traceAnalytics: Props['traceAnalytics'] }) {
  if (
    controller.query.signal === 'traces' &&
    controller.query.traceStructure === undefined &&
    controller.submission.draft.signal === 'traces' &&
    controller.submission.draft.traceStructure === undefined &&
    traceAnalytics
  )
    return <ExploreWorkspaceTraceFacets controller={controller} analytics={traceAnalytics} />;
  if (controller.query.signal === 'logs')
    return <ExploreWorkspaceLogFacets controller={controller} enabled={editor.valid} />;
  return undefined;
}

export function ExploreWorkspaceQuery({
  controller,
  t,
  editor,
  metricEditor,
  traceAnalytics,
  suggestions,
  results,
  inspectorAnalysis
}: Props) {
  const history = useRecentLogSearches();
  const searchSuggestions = useLogSearchSuggestions(controller.query, controller.result);
  return metricEditor?.invalid ? (
    <ExploreMetricPlanInvalid reset={() => controller.submission.updateField({ field: 'metricPlan', value: '' })} />
  ) : (
    <ExploreQueryBar
      history={history}
      searchSuggestions={searchSuggestions}
      query={controller.query}
      t={t}
      updateQuery={controller.updateManualQuery}
      updateScope={controller.updateQuery}
      refresh={controller.refresh}
      time={controller.time}
      submission={controller.submission}
      editor={editor}
      metricEditor={metricEditor && !metricEditor.invalid ? metricEditor : undefined}
      suggestions={suggestions}
      logAuthoring={
        controller.query.signal === 'logs' ? (
          <ExploreLogAuthoring
            controller={controller}
            t={t}
            focusIntent={inspectorAnalysis.focusIntent}
            onAnalysisFocused={inspectorAnalysis.onFocused}
          />
        ) : undefined
      }
      logTrend={
        controller.query.signal === 'logs' ? <ExploreLogTrendRegion controller={controller} t={t} /> : undefined
      }
      facets={workspaceFacets({ controller, traceAnalytics, editor })}
      results={results}
    />
  );
}
