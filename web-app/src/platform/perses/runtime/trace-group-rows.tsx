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

import { useTranslation } from 'react-i18next';
import type { TraceGroups } from '../datasource/hertzbeat-trace-analytics-schema';
import styles from './trace-analytics-table.module.css';
export function TraceGroupRows({
  data,
  enabled,
  onGroup
}: {
  data: NonNullable<TraceGroups['data']>;
  enabled: boolean;
  onGroup?: ((value: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.scroll}>
      <table className={styles.table} aria-label={t('exploreTrace.analytics.groups')}>
        <thead>
          <tr>
            <th>{t(`exploreTrace.analytics.fields.${data.groupBy}`)}</th>
            <th>{t('exploreTrace.analytics.count')}</th>
            <th>{t('exploreTrace.analytics.errors')}</th>
          </tr>
        </thead>
        <tbody>
          {data.groups.map(group => (
            <tr key={JSON.stringify(group.value)}>
              <td>
                <GroupAction value={group.value} enabled={enabled} onGroup={onGroup} />
              </td>
              <td>{group.count.toLocaleString()}</td>
              <td>{group.errorCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function GroupAction({
  value,
  enabled,
  onGroup
}: {
  value: string | null;
  enabled: boolean;
  onGroup: ((value: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  if (!onGroup)
    return value === null ? t('exploreTrace.analytics.missingValue') : value || t('exploreTrace.analytics.emptyValue');
  const disabled = !enabled || !onGroup || !value || value.trim() !== value;
  const reason = disabled ? t('explore.logFacets.unavailableAction') : undefined;
  return (
    <span
      tabIndex={disabled ? 0 : undefined}
      role={disabled ? 'group' : undefined}
      aria-description={reason}
      title={reason}
    >
      <button disabled={disabled} onClick={() => value && value.trim() === value && onGroup?.(value)}>
        {value === null ? t('exploreTrace.analytics.missingValue') : value || t('exploreTrace.analytics.emptyValue')}
      </button>
    </span>
  );
}
