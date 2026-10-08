/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { FormEvent, ReactNode } from 'react';

import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogQueryBuilderViewModel } from '../model/explore-log-builder-model';
import type { ExploreQuery } from '../model/explore-model';
import type { RecentLogSearchesViewModel } from '../model/explore-recent-log-searches';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreLogOrderRecovery } from './explore-log-order-recovery';
import { ExploreQueryActions } from './explore-query-command';
import { ExploreLogsSearchControls } from './explore-logs-search-controls';
import { ExploreRecentLogSearches } from './explore-recent-log-searches';
import { draftFromQuery } from '../model/explore-submission-model';
import { hasUnsupportedLegacyLogAnalysis, readLogAnalysisDraft } from '../model/explore-log-analysis';
import { ExploreLogAddMenu } from './explore-log-add-authoring';
import { ExploreLogCalculatedV2Chips } from './explore-log-calculated-v2-chips';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { LogFacetField } from '../model/explore-log-facets';
import { defaultLogSubquery, validLogSubqueryQuery } from '../model/explore-log-subquery';

type LogsQueryFormProps = {
  query: ExploreQuery;
  submission: ExploreSubmissionViewModel;
  editor: LogQueryBuilderViewModel;
  history: RecentLogSearchesViewModel;
  restore: (entry: LogExploreSubmissionDraft) => void;
  submit: (event: FormEvent) => void;
  refresh: () => Promise<void>;
  t: TFunction;
  searchSuggestions: LogSearchSuggestions | undefined;
  suggestedService?: string | undefined;
  validateCalculated?: ValidateCalculatedFields | undefined;
  calculatedSources?: LogFacetField[] | undefined;
};

export function ExploreLogsQueryForm({
  query,
  submission,
  editor,
  history,
  restore,
  submit,
  refresh,
  t,
  searchSuggestions,
  suggestedService,
  validateCalculated,
  calculatedSources = []
}: LogsQueryFormProps) {
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return null;
  const unsupportedLegacy = [query.logAnalysis, submission.draft.logAnalysis].some(hasUnsupportedLegacyLogAnalysis);
  const onBlurSubmit = hasPendingLogSearch(query, submission.draft);
  return (
    <>
      <form
        tabIndex={-1}
        aria-label={t('explore.queryToolbar')}
        onSubmit={event => submitSupportedLogQuery(event, unsupportedLegacy, submit)}
      >
        <ExploreLogsSearchControls
          draft={submission.draft}
          queryError={submission.errors.query}
          updateField={submission.updateField}
          t={t}
          suggestions={searchSuggestions}
          suggestedService={suggestedService}
          recent={<ExploreRecentLogSearches history={history} t={t} restore={restore} />}
          recentQueries={history.entries}
          restoreRecentQuery={restore}
          onBlurSubmit={onBlurSubmit}
          actions={
            <ExploreQueryActions
              {...{ query, submission, editor, refresh, t }}
              compactReset
              runDisabled={unsupportedLegacy}
            />
          }
          addAction={<LogAddAction {...{ query, submission, t, validateCalculated }} sources={calculatedSources} />}
          draftPending={JSON.stringify(submission.draft) !== JSON.stringify(draftFromQuery(query))}
        />
      </form>
      {validateCalculated && (
        <ExploreLogCalculatedV2Chips
          submission={submission}
          t={t}
          validate={validateCalculated}
          sources={calculatedSources}
        />
      )}
      <ExploreLogOrderRecovery query={query} submission={submission} t={t} />
    </>
  );
}

function submitSupportedLogQuery(event: FormEvent, unsupportedLegacy: boolean, submit: (event: FormEvent) => void) {
  if (unsupportedLegacy) event.preventDefault();
  else submit(event);
}

function hasPendingLogSearch(query: Extract<ExploreQuery, { signal: 'logs' }>, draft: LogExploreSubmissionDraft) {
  const appliedSource = readLogAnalysisDraft(query.logAnalysis)?.querySet?.queries[0];
  const draftSource = readLogAnalysisDraft(draft.logAnalysis)?.querySet?.queries[0];
  return (
    searchValue(draftSource, draft.query, draft.searchSyntax) !==
    searchValue(appliedSource, query.query, query.searchSyntax)
  );
}

function searchValue(
  source: { search?: string | undefined; searchSyntax?: string | undefined } | undefined,
  query: string | undefined,
  syntax?: string
) {
  return JSON.stringify([source?.search ?? query, source?.searchSyntax ?? syntax ?? '']);
}

function LogAddAction({
  query,
  submission,
  t,
  validateCalculated,
  sources
}: {
  query: ExploreQuery;
  submission: ExploreSubmissionViewModel;
  t: TFunction;
  validateCalculated?: ValidateCalculatedFields | undefined;
  sources: LogFacetField[];
}) {
  if (
    query.signal !== 'logs' ||
    submission.draft.signal !== 'logs' ||
    query.live ||
    query.logRecordUid ||
    submission.draft.logAggregation === 'calculated'
  )
    return null;
  return (
    <ExploreLogAddMenu
      raw={submission.draft.logAnalysis}
      query={submission.draft.query}
      searchSyntax={submission.draft.searchSyntax}
      onChange={value => submission.updateField({ field: 'logAnalysis', value })}
      onQueryChange={value => submission.updateField({ field: 'query', value })}
      calculatedRaw={submission.draft.logCalculatedV2}
      subqueryRaw={submission.draft.logSubquery}
      onSubqueryChange={value => submission.updateField({ field: 'logSubquery', value })}
      subqueryAvailable={validLogSubqueryQuery({
        ...submission.draft,
        logSubquery: JSON.stringify(defaultLogSubquery())
      })}
      onCalculatedChange={value => submission.updateField({ field: 'logCalculatedV2', value })}
      onSyntaxChange={value => submission.updateField({ field: 'searchSyntax', value })}
      validateCalculated={validateCalculated}
      sources={sources}
      t={t}
    />
  );
}

type ExploreLogsFacetRailProps = {
  submission: ExploreSubmissionViewModel;
  facets: ReactNode;
  t: TFunction;
  className: string;
  hidden?: boolean | undefined;
};

export function ExploreLogsFacetRail({ submission, facets, t, className, hidden }: ExploreLogsFacetRailProps) {
  if (submission.draft.signal !== 'logs') return null;
  return (
    <div className={className} aria-label={t('explore.addFilters')} hidden={hidden}>
      {facets}
    </div>
  );
}
