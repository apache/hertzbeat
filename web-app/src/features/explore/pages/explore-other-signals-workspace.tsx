/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { ExploreSourceControl } from './explore-source-control';
import { OperationalPage } from '@/shared/operational-page';
import { ExploreResultAnnouncer } from '../components/explore-result-announcer';
import { ExploreSignalTimeToolbar } from '../components/explore-signal-time-toolbar';
import { ExploreWorkbench } from '../components/explore-workbench';
import workbenchStyles from '../components/explore-workbench.module.css';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import type { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
import type { useMetricPlanEditor } from '../controller/use-metric-plan-editor';
import type { useTraceAnalytics } from '../controller/use-trace-analytics';
import { buildExplorePath } from '../model/explore-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreActions } from './explore-actions';
import { ExploreWorkspaceQuery } from './explore-workspace-query';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  savedQueries: SavedQueriesViewModel;
  editor: ReturnType<typeof useLogQueryBuilder>;
  metricEditor: ReturnType<typeof useMetricPlanEditor>;
  suggestions: ReturnType<typeof useLogScopeSuggestions>;
  traceAnalytics: ReturnType<typeof useTraceAnalytics>;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
  results: ReactNode;
};

export function ExploreOtherSignalsWorkspace({
  controller,
  t,
  savedQueries,
  editor,
  metricEditor,
  suggestions,
  traceAnalytics,
  inspectorAnalysis,
  results
}: Props) {
  const split = controller.query.signal !== 'metrics';
  return (
    <OperationalPage mode="workspace" inset="compact">
      <div
        className={workbenchStyles.workspace}
        data-explore-workspace="true"
        data-explore-signal={controller.query.signal}
        data-layout="continuous"
      >
        <OtherSignalsHeader controller={controller} t={t} savedQueries={savedQueries} />
        {!controller.transactions.active && (
          <ExploreResultAnnouncer result={controller.result} queryIdentity={buildExplorePath(controller.query)} t={t} />
        )}
        <section
          className={workbenchStyles.signalPanel}
          role="region"
          id={`explore-panel-${controller.query.signal}`}
          aria-labelledby={`explore-heading-${controller.query.signal}`}
          data-layout="continuous"
        >
          <section
            className={split ? workbenchStyles.splitQueryRegion : workbenchStyles.queryRegion}
            data-explore-region="query"
          >
            <ExploreWorkspaceQuery
              {...{ controller, t, editor, metricEditor, suggestions, traceAnalytics, inspectorAnalysis }}
              results={split ? results : undefined}
            />
          </section>
          {!split && results}
        </section>
      </div>
    </OperationalPage>
  );
}

function OtherSignalsHeader({ controller, t, savedQueries }: Pick<Props, 'controller' | 't' | 'savedQueries'>) {
  return (
    <ExploreWorkbench
      query={controller.query}
      t={t}
      sourceControl={<ExploreSourceControl query={controller.query} updateQuery={controller.updateQuery} />}
      updateQuery={controller.updateQuery}
      openPath={controller.openPath}
      actions={<ExploreActions controller={controller} savedQueries={savedQueries} />}
      timeToolbar={
        <ExploreSignalTimeToolbar
          query={controller.query}
          t={t}
          updateScope={controller.updateQuery}
          time={controller.time}
          refresh={controller.refresh}
        />
      }
    />
  );
}
