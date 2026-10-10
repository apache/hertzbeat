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
import { Select } from 'antd';
import type { LogComparison } from '@/platform/perses';
import styles from './explore-log-comparison-editor.module.css';
const choices = [
  [3600000, 'hourEarlier'],
  [86400000, 'dayEarlier'],
  [604800000, 'weekEarlier']
] as const;
export function ExploreLogComparisonTimeShiftControl({
  comparison,
  change,
  t
}: {
  comparison: LogComparison;
  change: (value: LogComparison) => void;
  t: TFunction;
}) {
  return (
    <label className={styles.offset}>
      {t('explore.logComparison.timeShift')}
      <Select<number | ''>
        value={comparison.timeShiftMs ?? ''}
        popupMatchSelectWidth={false}
        onChange={timeShift => change({ ...comparison, timeShiftMs: timeShift === '' ? undefined : timeShift })}
        options={[
          { value: '', label: t('explore.logComparison.sameWindow') },
          ...choices.map(([value, key]) => ({ value, label: t(`explore.logComparison.${key}`) })),
          ...(comparison.timeShiftMs !== undefined && !choices.some(([value]) => value === comparison.timeShiftMs)
            ? [{ value: comparison.timeShiftMs, label: comparison.timeShiftMs }]
            : [])
        ]}
      />
    </label>
  );
}
