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

import { TraceGroupRows } from '@/platform/perses';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { SignalEmptyState } from './signal-result-frame';
import { useTranslation } from 'react-i18next';
import type { TraceGroups, TraceLoad } from '../model/explore-trace-analytics';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import styles from './explore-trace-population.module.css';
export function ExploreTraceGroups({
  load,
  retry,
  onGroup
}: {
  load: TraceLoad<TraceGroups>;
  retry: () => void;
  onGroup: ((value: string) => void) | undefined;
}) {
  const { t } = useTranslation(),
    result = ['permission', 'idle'].includes(load.state) ? undefined : load.data,
    data = result?.state === 'ready' ? result.data : null;
  return (
    <div className={styles.result}>
      <TraceAnalyticsState load={load} retry={retry} />
      {result && <TraceCoverage coverage={result.coverage} />}
      {data && (
        <>
          {data.membership === 'multiple' && <p className={styles.hint}>{t('exploreTrace.analytics.membership')}</p>}
          {!data.groups.length && (
            <SignalEmptyState
              title={t('exploreTrace.analytics.empty')}
              hint={t('explore.recovery.traces')}
              reviewQueryLabel={t('explore.recovery.reviewQuery')}
            />
          )}
          {onGroup && data.groups.length > 0 && <p className={styles.hint}>{t('exploreTrace.layout.groupAction')}</p>}
          <TraceGroupRows data={data} enabled={load.state === 'ready'} onGroup={onGroup} />
          {data.truncated && <p className={styles.hint}>{t('exploreTrace.analytics.topValues')}</p>}
        </>
      )}
    </div>
  );
}
