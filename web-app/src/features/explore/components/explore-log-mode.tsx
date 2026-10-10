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
