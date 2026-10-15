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

import { Select } from 'antd';
import type { TFunction } from 'i18next';
import { fieldLabel } from './log-subquery-field-label';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogFacetField } from '../model/explore-log-facets';
import type { LogSubquery } from '../model/explore-log-subquery';
import { ExploreLogSearchInput } from './explore-log-search-input';
import styles from './explore-log-subquery-authoring.module.css';

export function SubqueryChild({
  value,
  t,
  onChange,
  onSubmit,
  fields,
  suggestions
}: {
  value: LogSubquery;
  t: TFunction;
  onChange: (value: LogSubquery) => void;
  onSubmit: (() => void) | undefined;
  fields: LogFacetField[];
  suggestions: LogSearchSuggestions | undefined;
}) {
  return (
    <div className={styles.meta}>
      <span className={styles.keyword}>{t('explore.logSubquery.from')}</span>
      <div className={styles.search}>
        <ExploreLogSearchInput
          value={value.child.search}
          syntax={value.child.searchSyntax}
          suggestions={suggestions}
          t={t}
          onChange={search => onChange({ ...value, child: { ...value.child, search } })}
          onSubmit={onSubmit}
        />
      </div>
      <span className={styles.keyword}>{t('explore.logSubquery.sortedBy')}</span>
      <span className={styles.keyword}>
        {t(
          value.rank.measure.function === 'count_all'
            ? 'explore.logSubquery.countOf'
            : 'explore.logSubquery.countUniqueOf'
        )}
      </span>
      <Select
        className={styles.field ?? ''}
        aria-label={t('explore.logSubquery.sortedBy')}
        popupMatchSelectWidth={false}
        virtual={false}
        value={value.rank.measure.function === 'count_all' ? 'all' : value.rank.measure.field}
        options={[{ value: 'all', label: t('explore.logSubquery.allLogs') }, ...metricFieldOptions(value, fields, t)]}
        onChange={field =>
          onChange({
            ...value,
            rank: {
              ...value.rank,
              measure: field === 'all' ? { function: 'count_all' } : { function: 'count_distinct', field }
            }
          })
        }
      />
    </div>
  );
}

function metricFieldOptions(value: LogSubquery, fields: LogFacetField[], t: TFunction) {
  const options: Array<{ value: string; label: string; disabled?: boolean }> = fields
    .filter(field => field.scalar === true)
    .map(field => ({ value: field.id, label: fieldLabel(field.id, t) }));
  const measure = value.rank.measure;
  if (measure.function === 'count_distinct' && !options.some(field => field.value === measure.field)) {
    options.push({ value: measure.field, label: fieldLabel(measure.field, t), disabled: true });
  }
  return options;
}
