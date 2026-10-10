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

import { useContext } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { LogFacetField } from '../model/explore-log-facets';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { readDraftSubquery, type LogSubquery } from '../model/explore-log-subquery';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { SubqueryChild } from './explore-log-subquery-child';
import { fieldLabel } from './log-subquery-field-label';
import styles from './explore-log-subquery-authoring.module.css';

type Props = {
  value: LogSubquery;
  t: TFunction;
  onChange: (next: LogSubquery) => void;
  onRemove: () => void;
  onSubmit?: (() => void) | undefined;
  error?: boolean | undefined;
  fields?: LogFacetField[] | undefined;
  suggestions?: LogSearchSuggestions | undefined;
};
type Controls = Pick<Props, 'value' | 't' | 'onChange' | 'fields'> & {
  options: Array<{ value: string; label: string }>;
};

export function ExploreLogSubqueryAuthoring({
  value,
  t,
  onChange,
  onRemove,
  onSubmit,
  error,
  fields = [],
  suggestions
}: Props) {
  const visibleFacets = useContext(LogFacetVisibilityContext);
  const options = fieldOptions(value, visibleFacets?.displayedFacetIds, t);
  return (
    <div className={styles.root} role="group" aria-label={t('explore.logSubquery.label')} data-log-subquery-authoring>
      <div className={styles.line}>
        <div className={styles.predicate}>
          <SubqueryMain {...{ value, options, t, onChange }} />
          <SubqueryRank {...{ value, options, t, onChange, fields }} />
        </div>
        <SubqueryChild {...{ value, t, onChange, onSubmit, fields, suggestions }} />
        <Button
          type="text"
          className={styles.remove ?? ''}
          onClick={onRemove}
          aria-label={t('explore.logSubquery.remove')}
        >
          <CloseOutlined aria-hidden="true" />
        </Button>
      </div>
      {error && <p role="alert">{t('explore.logSubquery.invalid')}</p>}
    </div>
  );
}

function SubqueryMain({ value, options, t, onChange }: Controls) {
  return (
    <>
      <span className={styles.keyword}>{t('explore.logSubquery.where')}</span>
      <Select
        className={styles.field ?? ''}
        aria-label={t('explore.logSubquery.mainField')}
        popupMatchSelectWidth={false}
        virtual={false}
        value={value.mainField}
        options={options}
        onChange={mainField => onChange({ ...value, mainField })}
      />
      <Select
        className={styles.operator ?? ''}
        aria-label={t('explore.logSubquery.operator')}
        popupMatchSelectWidth={false}
        value={value.operator}
        options={[
          { value: 'in', label: t('explore.logSubquery.in') },
          { value: 'not_in', label: t('explore.logSubquery.notIn') }
        ]}
        onChange={operator => onChange({ ...value, operator })}
      />
    </>
  );
}

function SubqueryRank({ value, options, t, onChange }: Controls) {
  return (
    <>
      <Select
        className={styles.direction ?? ''}
        aria-label={t('explore.logSubquery.rank')}
        popupMatchSelectWidth={false}
        value={value.rank.direction}
        options={[
          { value: 'top', label: t('explore.logSubquery.top') },
          { value: 'bottom', label: t('explore.logSubquery.bottom') }
        ]}
        onChange={direction => onChange({ ...value, rank: { ...value.rank, direction } })}
      />
      <Select
        aria-label={t('explore.logSubquery.limit')}
        value={value.rank.limit}
        virtual={false}
        options={rankLimitOptions(value.rank.limit)}
        onChange={limit => onChange({ ...value, rank: { ...value.rank, limit } })}
      />
      <Select
        className={styles.field ?? ''}
        aria-label={t('explore.logSubquery.childField')}
        popupMatchSelectWidth={false}
        virtual={false}
        value={value.child.field}
        options={options}
        onChange={field => onChange({ ...value, child: { ...value.child, field } })}
      />
    </>
  );
}

function rankLimitOptions(current: number) {
  const limits = [2, 5, 10, 15, 25, 30, 50, 100, 250, 500, 1000];
  if (!limits.includes(current)) limits.push(current);
  return limits
    .sort((left, right) => left - right)
    .map(limit => ({ value: limit, label: limit === 1000 ? '1K' : String(limit) }));
}

function fieldOptions(value: LogSubquery, displayedFacetIds: string[] | undefined, t: TFunction) {
  const ids = new Set([value.mainField, value.child.field, ...(displayedFacetIds ?? [])]);
  return [...ids].map(id => ({ value: id, label: fieldLabel(id, t) }));
}

export function ExploreLogSubqueryDraft({
  submission,
  t,
  onSubmit,
  fields,
  suggestions
}: {
  submission: ExploreSubmissionViewModel;
  t: TFunction;
  onSubmit?: (() => void) | undefined;
  fields?: LogFacetField[] | undefined;
  suggestions?: LogSearchSuggestions | undefined;
}) {
  const draft = submission.draft;
  if (draft.signal !== 'logs' || draft.logSubquery === undefined) return null;
  return (
    <ExploreLogSubqueryAuthoring
      value={readDraftSubquery(draft.logSubquery)}
      t={t}
      error={Boolean(submission.errors.logSubquery)}
      onSubmit={onSubmit}
      fields={fields}
      suggestions={suggestions}
      onChange={value => submission.updateField({ field: 'logSubquery', value: JSON.stringify(value) })}
      onRemove={() => submission.updateField({ field: 'logSubquery', value: undefined })}
    />
  );
}
