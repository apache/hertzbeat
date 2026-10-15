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

import { formatComparisonTimestamp } from './log-timeshift-display';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogComparisonResult } from '../../logs/log-comparison-result';
import styles from './log-comparison-windows.module.css';
export function ExploreLogComparisonWindows({
  data,
  timeZone,
  t
}: {
  data: LogComparisonResult;
  timeZone?: string | undefined;
  t: TFunction;
}) {
  return (
    <div className={styles.windows}>
      {(['a', 'b'] as const).map(source => {
        const window = source === 'a' ? data.window : (data.bWindow ?? data.window);
        const label = t('explore.logComparison.sourceWindow', {
          source,
          start: formatComparisonTimestamp(window.start, timeZone),
          end: formatComparisonTimestamp(window.end, timeZone)
        });
        return (
          <span key={source} title={label}>
            {label}
          </span>
        );
      })}
      {data.bTimeShiftMs !== undefined && (
        <small>{t('explore.logComparison.fixedTimeShift', { hours: data.bTimeShiftMs / 3600000 })}</small>
      )}
      {data.bTimeShiftMs !== undefined && data.window.end - data.window.start > data.bTimeShiftMs && (
        <small>{t('explore.logComparison.overlappingWindows')}</small>
      )}
    </div>
  );
}
export function ExploreLogComparisonFacetWindow({
  window,
  source,
  timeZone,
  t
}: {
  window: ExactTimeWindow;
  source: 'a' | 'b';
  timeZone?: string | undefined;
  t: TFunction;
}) {
  const label = t('explore.logComparison.appliedFacetWindow', {
    source,
    start: formatComparisonTimestamp(window.from, timeZone),
    end: formatComparisonTimestamp(window.to, timeZone)
  });
  return (
    <p className={styles.facet} title={label}>
      {label}
    </p>
  );
}
