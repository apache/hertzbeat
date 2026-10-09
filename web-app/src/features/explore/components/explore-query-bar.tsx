/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ExploreLogOrderRecovery } from './explore-log-order-recovery';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogScopeSuggestions } from '../model/explore-log-scope-suggestions';
import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';
import { OperationalCommandBar } from '@/shared/operational-page';
import type { SharedTimeValue } from '@/shared/time';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import type { MetricPlanEditorProps } from './explore-metric-plan-editor';
import { ExploreActiveFilters } from './explore-active-filters';
import { ExploreAdvancedFilters, ExploreGuidedFilters } from './explore-advanced-filters';
import { ExploreLogQueryBuilder, type LogQueryEditorMode } from './explore-log-query-builder';
import type { RecentLogSearchesViewModel } from '../model/explore-recent-log-searches';
import type { LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreRecentLogSearches } from './explore-recent-log-searches';
import { ExploreQueryControls } from './explore-query-controls';
import { ExploreTraceStructureEditor } from './explore-trace-structure-editor';
import { ExploreQueryBody } from './explore-query-body';
import { ExploreQueryActions } from './explore-query-command';
import { useExploreQueryCommand } from './use-explore-query-command';
import styles from './explore-query-bar.module.css';
import layout from './explore-query-layout.module.css';
import { ExploreMetricQueryDisclosure } from './explore-metric-query-disclosure';

type Props = {
  history: RecentLogSearchesViewModel;
  searchSuggestions?: LogSearchSuggestions | undefined;
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  updateScope: (changes: ExploreQueryPatch) => void;
  refresh: () => Promise<void>;
  time: SharedTimeValue | null | undefined;
  submission: ExploreSubmissionViewModel;
  editor: LogQueryBuilderViewModel;
  suggestions?: LogScopeSuggestions | undefined;
  results?: ReactNode;
  facets?: ReactNode;
  logAuthoring?: ReactNode;
  logTrend?: ReactNode;
  metricEditor?: MetricPlanEditorProps | undefined;
};

export function ExploreQueryBar(props: Props) {
  const { query, t, submission, editor, results, history } = props;
  const [logFiltersOpen, setLogFiltersOpen] = useState(false);
  const { mode, lossless, changeMode, submit, restore, queryRef } = useExploreQueryCommand({
    submission,
    editor,
    history
  });
  const activeFilters = activeFiltersForQuery(props);
  return (
    <div
      ref={queryRef}
      className={[styles.form, results && layout.queryWorkspace].filter(Boolean).join(' ')}
      data-explore-query-layout={results ? 'split' : 'stack'}
    >
      <form tabIndex={-1} className={layout.commandForm} aria-label={t('explore.queryToolbar')} onSubmit={submit}>
        <ExploreQueryCommand
          {...props}
          restore={restore}
          recent={
            submission.draft.signal === 'logs' ? (
              <ExploreRecentLogSearches history={history} t={t} restore={restore} />
            ) : undefined
          }
          mode={mode}
          lossless={lossless}
          changeMode={changeMode}
        />
      </form>
      <ExploreLogOrderRecovery query={query} submission={submission} t={t} />
      {query.signal !== 'logs' && activeFilters}
      {props.logAuthoring}
      {props.logTrend}
      <ExploreQueryBody
        query={query}
        draft={submission.draft}
        facets={props.facets}
        activeFilters={query.signal === 'logs' ? activeFilters : undefined}
        results={results}
        submit={submit}
        t={t}
      >
        {query.signal === 'logs' ? (
          <details
            className={styles.logFilterDisclosure}
            open={logFiltersOpen || mode === 'code' || !editor.valid}
            onToggle={event => setLogFiltersOpen(event.currentTarget.open)}
          >
            <summary>{t('explore.logFacets.core.moreFilters')}</summary>
            <ExploreQueryFilters {...props} mode={mode} />
          </details>
        ) : (
          <ExploreQueryFilters {...props} mode={mode} />
        )}
      </ExploreQueryBody>
    </div>
  );
}

function ExploreQueryCommand(
  props: Props & {
    recent?: ReactNode;
    restore: (entry: LogExploreSubmissionDraft) => void;
    mode: LogQueryEditorMode;
    lossless: boolean;
    changeMode: (mode: LogQueryEditorMode) => void;
  }
) {
  const { query, t, refresh, submission, editor, metricEditor, history, restore } = props;
  if (metricEditor) {
    return (
      <ExploreQueryControls
        {...props}
        metricRows
        draft={submission.draft}
        updateField={submission.updateField}
        actions={<ExploreQueryActions refreshFirst {...{ query, submission, editor, refresh, t }} />}
      />
    );
  }
  if (query.signal === 'traces') {
    return (
      <ExploreQueryControls
        {...props}
        draft={submission.draft}
        updateField={submission.updateField}
        actions={<ExploreQueryActions {...{ query, submission, editor, refresh, t }} />}
      />
    );
  }
  return (
    <OperationalCommandBar
      primary={
        <ExploreQueryControls
          {...props}
          metricRows={Boolean(metricEditor)}
          draft={submission.draft}
          updateField={submission.updateField}
          recentQueries={history.entries}
          restoreRecentQuery={restore}
        />
      }
      secondary={<ExploreQueryActions {...{ query, submission, editor, refresh, t }} />}
    />
  );
}

function ExploreQueryFilters(props: Props & { mode: LogQueryEditorMode }) {
  const { draft, errors, updateField } = props.submission;
  const { t, editor, mode } = props;
  if (draft.signal === 'metrics' && props.metricEditor) {
    return <ExploreMetricQueryDisclosure submission={props.submission} metricEditor={props.metricEditor} t={t} />;
  }
  return (
    <>
      {draft.signal === 'logs' ? (
        <ExploreLogQueryBuilder
          draft={draft}
          mode={mode}
          t={t}
          updateField={updateField}
          editor={editor}
          suggestions={props.suggestions}
        />
      ) : draft.signal === 'traces' && draft.traceStructure !== undefined ? (
        <ExploreTraceStructureEditor draft={draft} errors={errors} t={t} updateField={updateField} />
      ) : (
        <>
          {!props.metricEditor && (
            <ExploreGuidedFilters
              appliedTraceView={props.query.signal === 'traces' ? props.query.traceView : undefined}
              metricRows={Boolean(props.metricEditor)}
              draft={draft}
              errors={errors}
              t={t}
              updateField={updateField}
            />
          )}
          <ExploreAdvancedFilters
            metricRows={Boolean(props.metricEditor)}
            draft={draft}
            errors={errors}
            t={t}
            updateField={updateField}
          />
        </>
      )}
    </>
  );
}

function activeFiltersForQuery({ query, t, updateQuery, submission }: Props) {
  return (
    <ExploreActiveFilters
      query={query}
      t={t}
      updateQuery={updateQuery}
      removeFilter={submission.removeFilter}
      removeFilters={submission.removeFilters}
    />
  );
}
