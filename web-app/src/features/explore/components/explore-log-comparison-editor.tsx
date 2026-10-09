/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ExploreLogComparisonTimeShiftControl } from './explore-log-comparison-timeshift-control';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import {
  DEFAULT_LOG_ANALYSIS,
  logComparisonSchema,
  type LogAnalysisState,
  type LogComparison
} from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';

import { ExploreLogSearchInput } from './explore-log-search-input';
import styles from './explore-log-comparison-editor.module.css';
type Props = Pick<ExploreSubmissionViewModel, 'updateField'> & {
  draft: LogExploreSubmissionDraft;
  t: TFunction;
  allowInvalidLocalDraft?: boolean;
};
export function ExploreLogComparisonEditor({ draft, updateField, t, allowInvalidLocalDraft }: Props) {
  const analysis =
    readLogAnalysisDraft(draft.logAnalysis) ??
    (allowInvalidLocalDraft ? readLocalComparisonDraft(draft.logAnalysis) : undefined) ??
    DEFAULT_LOG_ANALYSIS;
  const comparison = analysis.comparison;
  const change = (next: typeof comparison) =>
    updateField({
      field: 'logAnalysis',
      value: JSON.stringify({
        ...analysis,
        representation: analysis.representation === 'timeseries' ? 'timeseries' : 'table',
        comparison: next
      })
    });
  if (!comparison)
    return (
      <button
        type="button"
        className={styles.add}
        disabled={Boolean(draft.searchSyntax && draft.searchSyntax !== 'structured-v1')}
        onClick={() =>
          change({
            version: 1,
            search: draft.query,
            ...(draft.searchSyntax === 'structured-v1' ? { searchSyntax: draft.searchSyntax } : {})
          })
        }
      >
        {t('explore.logComparison.add')}
      </button>
    );
  return (
    <div className={styles.editor} data-log-comparison-editor>
      <div
        data-log-comparison-source="b"
        className={styles.row}
        role="group"
        aria-label={t('explore.logComparison.source', { source: 'b' })}
      >
        <span className={styles.letter}>b</span>
        <ExploreLogSearchInput
          value={comparison.search ?? ''}
          syntax={comparison.searchSyntax}
          onChange={search => change({ ...comparison, search })}
          t={t}
        />
        <ExploreLogComparisonTimeShiftControl comparison={comparison} change={change} t={t} />
        <button type="button" onClick={() => change(undefined)} aria-label={t('explore.logComparison.remove')}>
          ×
        </button>
      </div>
      <ComparisonFormula comparison={comparison} change={change} t={t} />
      <small>{t('explore.logComparison.anchor')}</small>
    </div>
  );
}

function readLocalComparisonDraft(raw: string | undefined): LogAnalysisState | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('comparison' in parsed)) return undefined;
    const comparison = parsed.comparison;
    if (
      !comparison ||
      typeof comparison !== 'object' ||
      !('search' in comparison) ||
      typeof comparison.search !== 'string'
    )
      return undefined;
    // The drawer owns this local JSON; the full schema still gates Confirm.
    return parsed as LogAnalysisState;
  } catch {
    return undefined;
  }
}

function ComparisonFormula({
  comparison,
  change,
  t
}: {
  comparison: LogComparison;
  change: (value: LogComparison) => void;
  t: TFunction;
}) {
  return (
    <>
      {comparison.formula === undefined ? (
        <button type="button" className={styles.add} onClick={() => change({ ...comparison, formula: 'b/a' })}>
          {t('explore.logComparison.addFormula')}
        </button>
      ) : (
        <div className={styles.row}>
          <label className={styles.formula}>
            {t('explore.logComparison.formula')}
            <input
              aria-label={t('explore.logComparison.formula')}
              value={comparison.formula}
              aria-invalid={!logComparisonSchema.safeParse(comparison).success || undefined}
              onChange={event => change({ ...comparison, formula: event.target.value })}
            />
          </label>
          <button
            type="button"
            onClick={() => change({ ...comparison, formula: undefined })}
            aria-label={t('explore.logComparison.removeFormula')}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
