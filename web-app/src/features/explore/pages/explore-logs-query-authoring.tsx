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

import { ExploreLogsQueryForm } from '../components/explore-logs-forms';
import { ExploreActiveFilters } from '../components/explore-active-filters';
import type { useExploreQueryCommand } from '../components/use-explore-query-command';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import type { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { useLogSearchSuggestions } from '../controller/use-log-search-suggestions';
import type { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
import type { useRecentLogSearches } from '../controller/use-recent-log-searches';
import type { ExploreQueryPatch } from '../model/explore-model';
import { ExploreLogAuthoring } from './explore-log-authoring';
import styles from './explore-logs-workspace.module.css';
import { validateCalculatedFields } from '../controller/use-log-calculated-validation';
import { useLogFacetCatalog } from '../controller/use-log-facets';
import { calculatedCatalogQuery } from '../model/explore-calculated-source-catalog';

type QueryAuthoringProps = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  editor: ReturnType<typeof useLogQueryBuilder>;
  history: ReturnType<typeof useRecentLogSearches>;
  searchSuggestions: ReturnType<typeof useLogSearchSuggestions>;
  suggestions?: ReturnType<typeof useLogScopeSuggestions>;
  command: ReturnType<typeof useExploreQueryCommand>;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
  openComparison: () => void;
  calculatedOpen: boolean;
  setCalculatedOpen: (open: boolean) => void;
  queryActions: ReactNode;
};

export function LogsQueryAuthoring(props: QueryAuthoringProps) {
  const { controller, t, editor, history, searchSuggestions, suggestions, command } = props;
  const { query, submission } = controller;
  const { queryRef } = command;
  const sourceCatalog = useLogFacetCatalog(
    calculatedCatalogQuery(query),
    controller.result,
    query.signal === 'logs',
    controller.transactions?.active ? controller.transactions.window : undefined
  );
  const removeActiveFilter = (key: keyof ExploreQueryPatch) => {
    submission.applyLogPatch({ [key]: undefined });
    return true;
  };
  const removeActiveFilters = (keys: (keyof ExploreQueryPatch)[]) => {
    submission.applyLogPatch(Object.fromEntries(keys.map(key => [key, undefined])));
  };
  return (
    <>
      <div ref={queryRef} className={styles.searchRegion} data-explore-region="query" data-explore-logs-region="search">
        <ExploreLogsQueryForm
          {...{ query, submission, editor, history, searchSuggestions, t }}
          suggestedService={suggestions?.serviceName.values[0]}
          {...command}
          validateCalculated={validateCalculatedFields}
          calculatedSources={sourceCatalog.fields.data?.fields ?? []}
          refresh={controller.refresh}
        />
      </div>
      {query.signal === 'logs' && (
        <ExploreActiveFilters
          query={query}
          t={t}
          updateQuery={controller.updateManualQuery}
          removeFilter={removeActiveFilter}
          removeFilters={removeActiveFilters}
        />
      )}
      <LogsAnalysisAuthoring {...props} />
    </>
  );
}

function LogsAnalysisAuthoring({
  controller,
  t,
  command,
  inspectorAnalysis,
  openComparison,
  calculatedOpen,
  setCalculatedOpen,
  queryActions
}: QueryAuthoringProps) {
  const { query } = controller;
  const { queryRef } = command;
  return (
    <div className={styles.authoringRegion} data-explore-logs-region="authoring">
      {queryActions && query.signal === 'logs' && query.logRecordUid && (
        <div className={styles.liveQueryActions}>{queryActions}</div>
      )}
      <ExploreLogAuthoring
        controller={controller}
        t={t}
        onAddComparison={openComparison}
        onAddCalculated={() => setCalculatedOpen(true)}
        focusIntent={inspectorAnalysis.focusIntent}
        onAnalysisFocused={inspectorAnalysis.onFocused}
        calculatedOpen={calculatedOpen}
        onCalculatedOpenChange={setCalculatedOpen}
        queryActions={queryActions}
        onQuery={() => queryRef.current?.querySelector('form')?.requestSubmit()}
      />
    </div>
  );
}
