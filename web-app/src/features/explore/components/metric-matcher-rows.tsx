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

import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { readMetricMatchers, updateMetricMatcher, removeMetricMatcher } from '../model/metric-label-matchers';
import styles from './metric-matcher-rows.module.css';

export function MetricMatcherRows({
  filter,
  locked = [],
  onFilter
}: {
  filter: string;
  locked?: readonly string[] | undefined;
  onFilter: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);
  const matchers = readMetricMatchers(filter);
  if (!matchers) return <p>{t('explore.metricComposition.matcherRaw')}</p>;
  if (!matchers.length) return null;
  const publish = (value: string | undefined) => {
    setBlocked(value === undefined);
    if (value !== undefined) onFilter(value);
  };
  return (
    <div className={styles.matcherList} aria-label={t('explore.metricComposition.matchers')}>
      {blocked && <p role="alert">{t('explore.metricComposition.matcherLimit')}</p>}
      {matchers.map((item, index) => (
        <div key={item.field} className={styles.matcherRow} role="group" aria-label={item.field}>
          <strong>{item.field}</strong>
          <Select<'=' | '!='>
            aria-label={t('explore.metricComposition.matcherOperator', { field: item.field })}
            value={item.operator}
            disabled={locked.includes(item.field)}
            options={['=', '!='].map(value => ({ value, label: value }))}
            onChange={operator => publish(updateMetricMatcher(filter, index, { operator }, locked))}
          />
          <Input
            aria-label={t('explore.metricComposition.matcherValue', { field: item.field })}
            value={item.value}
            disabled={locked.includes(item.field)}
            onChange={event => publish(updateMetricMatcher(filter, index, { value: event.target.value }, locked))}
            onKeyDown={event => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          <Button
            disabled={locked.includes(item.field)}
            onClick={() => publish(removeMetricMatcher(filter, index, locked))}
          >
            {t('explore.metricComposition.removeMatcher', { field: item.field })}
          </Button>
          {locked.includes(item.field) && <span>{t('explore.metricComposition.matcherLocked')}</span>}
        </div>
      ))}
    </div>
  );
}
