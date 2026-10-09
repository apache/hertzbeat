/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';
import { useId, type ReactNode } from 'react';

import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogExploreSubmissionDraft } from '../model/explore-submission-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import type { RecentLogSearch } from '../model/explore-recent-log-searches';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { ExploreLogPrimarySourceActions } from './explore-log-query-set-row-actions';
import styles from './explore-logs-search-controls.module.css';
import { ExploreQueryRow } from './explore-query-row';

type Props = {
  draft: LogExploreSubmissionDraft;
  queryError?: ExploreSubmissionViewModel['errors']['query'];
  t: TFunction;
  updateField: ExploreSubmissionViewModel['updateField'];
  recent: ReactNode;
  recentQueries?: RecentLogSearch[] | undefined;
  restoreRecentQuery?: ((entry: RecentLogSearch) => void) | undefined;
  onBlurSubmit: boolean;
  suggestions: LogSearchSuggestions | undefined;
  suggestedService?: string | undefined;
  actions: ReactNode;
  addAction?: ReactNode;
  draftPending: boolean;
};

export function ExploreLogsSearchControls({
  draft,
  queryError,
  t,
  updateField,
  recent,
  recentQueries,
  restoreRecentQuery,
  onBlurSubmit,
  suggestions,
  suggestedService,
  actions,
  addAction,
  draftPending
}: Props) {
  const errorId = useId();
  const comparison = readLogAnalysisDraft(draft.logAnalysis)?.comparison;
  const querySet = readLogAnalysisDraft(draft.logAnalysis)?.querySet;
  const primary = querySet?.queries[0];
  return (
    <ExploreQueryRow className={styles.searchControls} data-log-command-fields>
      <div className={styles.searchInput} data-log-comparison-source="a">
        {(comparison || querySet) && <span className={styles.queryRef}>{primary?.refId ?? 'a'}</span>}
        <ExploreLogSearchInput
          invalid={Boolean(queryError)}
          errorId={errorId}
          value={primary ? (primary.search ?? '') : draft.query}
          syntax={primary ? primary.searchSyntax : draft.searchSyntax}
          onChange={value => updatePrimarySearch(draft, value, updateField)}
          recent={recent}
          recentQueries={recentQueries}
          restoreRecentQuery={restoreRecentQuery}
          onBlurSubmit={onBlurSubmit}
          suggestions={suggestions}
          suggestedService={suggestedService}
          t={t}
        />
        {querySet && (
          <ExploreLogPrimarySourceActions
            raw={draft.logAnalysis}
            onChange={value => updateField({ field: 'logAnalysis', value })}
            t={t}
          />
        )}
        <LogsDraftStatus pending={draftPending} t={t} />
      </div>
      {addAction}
      {actions}
      <SearchError id={errorId} error={queryError} t={t} />
    </ExploreQueryRow>
  );
}

function SearchError({ id, error, t }: { id: string; error: Props['queryError']; t: TFunction }) {
  if (!error) return null;
  return (
    <p id={id} className={styles.queryError} role="alert">
      {t('explore.logAuthoring.syntaxIssue.unclosed_quote')}
    </p>
  );
}

function updatePrimarySearch(draft: LogExploreSubmissionDraft, value: string, updateField: Props['updateField']) {
  const analysis = readLogAnalysisDraft(draft.logAnalysis);
  const querySet = analysis?.querySet;
  const primary = querySet?.queries[0];
  if (!querySet || !primary) {
    updateField({ field: 'query', value });
    return;
  }
  updateField({
    field: 'logAnalysis',
    value: JSON.stringify({
      ...analysis,
      querySet: {
        ...querySet,
        queries: querySet.queries.map(source =>
          source.refId === primary.refId ? { ...source, search: value } : source
        )
      }
    })
  });
}

function LogsDraftStatus({ pending, t }: { pending: boolean; t: TFunction }) {
  const message = t('exploreMetric.pendingDraft');
  return (
    <span role="status" aria-live="polite" className={styles.draftStatus}>
      {pending && (
        <>
          <span className={styles.draftStatusText}>{message}</span>
          <Tooltip title={message} trigger={['hover', 'focus', 'click']}>
            <Button type="text" icon={<InfoCircleOutlined aria-hidden />} aria-label={message} />
          </Tooltip>
        </>
      )}
    </span>
  );
}

type AddedSummaryProps = {
  draft: LogExploreSubmissionDraft;
  t: TFunction;
  onAddComparison: () => void;
  onAddCalculated: () => void;
};

export function ExploreLogsAddedSummary({ draft, t, onAddComparison, onAddCalculated }: AddedSummaryProps) {
  const comparison = readLogAnalysisDraft(draft.logAnalysis)?.comparison;
  return (
    <div className={styles.addedSummary} data-log-search-summary>
      {comparison && (
        <span data-log-comparison-summary>
          {t('explore.logComparison.source', { source: 'b' })}
          {comparison.search && <b title={comparison.search}>: {comparison.search}</b>}
          {comparison.formula && (
            <b title={comparison.formula}>
              {t('explore.logComparison.formula')}: {comparison.formula}
            </b>
          )}
          <button type="button" onClick={onAddComparison}>
            {t('common.edit')}
          </button>
        </span>
      )}
      {draft.logAggregation === 'calculated' && (
        <span data-log-calculated-summary>
          {t('explore.logCalculated.mode')}
          <button type="button" onClick={onAddCalculated}>
            {t('common.edit')}
          </button>
        </span>
      )}
    </div>
  );
}
