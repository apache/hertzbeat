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
import { useLogSearchSuggestions } from '../controller/use-log-search-suggestions';
import { useRecentLogSearches } from '../controller/use-recent-log-searches';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import type { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
import { ExploreLogMode } from '../components/explore-log-mode';
import { useExploreQueryCommand } from '../components/use-explore-query-command';
import { ExploreResultAnnouncer } from '../components/explore-result-announcer';
import { ExploreSignalTimeToolbar } from '../components/explore-signal-time-toolbar';
import { ExploreWorkbench } from '../components/explore-workbench';
import { buildExplorePath, exploreEvidenceScopeKey } from '../model/explore-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreLogsViewTrigger, ExploreLogsViewsRail } from '../components/explore-logs-saved-views';
import { ExploreLogsPanel } from './explore-logs-panel';
import styles from './explore-logs-workspace.module.css';
import { LogCalculatedFromFieldProvider } from '../components/explore-log-calculated-from-field-provider';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { calculatedDisabled } from '../components/explore-log-add-menu-items';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  savedQueries: SavedQueriesViewModel;
  editor: ReturnType<typeof useLogQueryBuilder>;
  suggestions: ReturnType<typeof useLogScopeSuggestions>;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
  results: ReactNode;
};

export function ExploreLogsWorkspace({
  controller,
  t,
  savedQueries,
  editor,
  suggestions,
  inspectorAnalysis,
  results
}: Props) {
  const { query, submission } = controller;
  const history = useRecentLogSearches();
  const searchSuggestions = useLogSearchSuggestions(query, controller.result);
  const command = useExploreQueryCommand({ submission, editor, history });
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return null;
  const calculatedFieldEnabled = canAddCalculatedField(query, submission.draft);
  return (
    <OperationalPage mode="workspace" inset="compact">
      <LogCalculatedFromFieldProvider enabled={calculatedFieldEnabled} identity={exploreEvidenceScopeKey(query)}>
        <div
          className={styles.workspace}
          data-explore-workspace="true"
          data-explore-logs-workspace="true"
          data-explore-query-layout="split"
          data-layout="continuous"
        >
          <ExploreLogsHeader controller={controller} t={t} savedQueries={savedQueries} />
          {!controller.transactions.active && (
            <ExploreResultAnnouncer result={controller.result} queryIdentity={buildExplorePath(query)} t={t} />
          )}
          <div className={styles.workArea}>
            <ExploreLogsViewsRail model={savedQueries} />
            <ExploreLogsPanel
              {...{
                controller,
                t,
                editor,
                suggestions,
                inspectorAnalysis,
                results,
                history,
                searchSuggestions,
                command
              }}
              queryActions={null}
            />
          </div>
        </div>
      </LogCalculatedFromFieldProvider>
    </OperationalPage>
  );
}

export function ExploreLogsHeader({
  controller,
  t,
  savedQueries
}: Pick<Props, 'controller' | 't'> & { savedQueries?: SavedQueriesViewModel }) {
  const { query, submission } = controller;
  if (query.signal !== 'logs') return null;
  return (
    <ExploreWorkbench
      query={query}
      t={t}
      actions={savedQueries ? <ExploreLogsViewTrigger model={savedQueries} /> : undefined}
      sourceControl={<ExploreSourceControl query={controller.query} updateQuery={controller.updateQuery} />}
      updateQuery={controller.updateQuery}
      openPath={controller.openPath}
      timeToolbar={
        <ExploreSignalTimeToolbar
          query={query}
          t={t}
          updateScope={controller.updateQuery}
          time={controller.time}
          refresh={controller.refresh}
          capability={query.live ? 'log_stream' : 'log_history'}
          mode={<ExploreLogMode query={query} draft={submission.draft} t={t} updateScope={controller.updateQuery} />}
        />
      }
    />
  );
}

function canAddCalculatedField(
  query: Extract<Props['controller']['query'], { signal: 'logs' }>,
  draft: Extract<Props['controller']['submission']['draft'], { signal: 'logs' }>
) {
  const draftAnalysis = readLogAnalysisDraft(draft.logAnalysis);
  const calculatedAddMounted = !query.live && !query.logRecordUid && draft.logAggregation !== 'calculated';
  return (
    calculatedAddMounted &&
    (draft.logAnalysis === undefined || Boolean(draftAnalysis)) &&
    !calculatedDisabled(draftAnalysis?.querySet, draftAnalysis?.comparison, draft.logCalculatedV2, calculatedAddMounted)
  );
}
