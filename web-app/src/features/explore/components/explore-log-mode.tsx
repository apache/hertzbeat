/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Radio } from 'antd';
import type { TFunction } from 'i18next';

import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreQueryField } from './explore-query-field';
import styles from './explore-query-bar.module.css';

export function ExploreLogMode({
  query,
  draft,
  t,
  updateScope
}: {
  query: ExploreQuery;
  draft: ExploreSubmissionViewModel['draft'];
  t: TFunction;
  updateScope: (changes: ExploreQueryPatch) => void;
}) {
  const live = query.signal === 'logs' && Boolean(query.live);
  const liveReason = historyOnlyReason(draft, query);
  return (
    <ExploreQueryField slot="mode" label={t('exploreLog.mode')}>
      <div className={styles.logMode} role="radiogroup" aria-label={t('exploreLog.mode')}>
        <Radio.Group
          name="log-mode"
          value={live ? 'live' : 'history'}
          onChange={event => updateScope(event.target.value === 'live' ? { live: true } : { live: undefined })}
        >
          <Radio.Button value="history">{t('exploreLog.history')}</Radio.Button>
          <Radio.Button value="live" disabled={Boolean(liveReason)} title={liveReason ? t(liveReason) : ''}>
            {t('exploreLog.live')}
          </Radio.Button>
        </Radio.Group>
      </div>
    </ExploreQueryField>
  );
}

function historyOnlyReason(draft: ExploreSubmissionViewModel['draft'], query: ExploreQuery) {
  if (draft.signal !== 'logs') return undefined;
  if (['transactions', 'patterns', 'calculated'].includes(draft.logAggregation ?? ''))
    return 'explore.logPatterns.historyOnly';
  if (draft.logCalculatedV2 !== undefined || (query.signal === 'logs' && query.logCalculatedV2 !== undefined))
    return 'explore.logAdd.historyOnly';
  if (hasSubquery(draft, query)) return 'explore.logSubquery.historyOnly';
  const analyses = [draft.logAnalysis, query.signal === 'logs' ? query.logAnalysis : undefined].map(
    readLogAnalysisDraft
  );
  if (analyses.some(analysis => analysis?.comparison?.search !== undefined)) return 'explore.logComparison.historyOnly';
  if (analyses.some(analysis => analysis?.comparison || analysis?.querySet)) return 'explore.logAdd.historyOnly';
  return undefined;
}

function hasSubquery(draft: ExploreSubmissionViewModel['draft'], query: ExploreQuery) {
  return (
    draft.signal === 'logs' &&
    (draft.logSubquery !== undefined || (query.signal === 'logs' && query.logSubquery !== undefined))
  );
}
