/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Input } from 'antd';
import type { TFunction } from 'i18next';

import type { ExploreSubmissionController } from '../hooks/use-explore-submission';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import { ExploreActiveFilters } from './explore-active-filters';
import { ExploreAdvancedFilters } from './explore-advanced-filters';
import styles from './explore-query-bar.module.css';

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  submission: ExploreSubmissionController;
};

export function ExploreQueryBar({ query, t, updateQuery, submission }: Props) {
  const { draft, errors, updateField } = submission;
  return (
    <form
      className={styles.form}
      onSubmit={event => {
        event.preventDefault();
        submission.submit();
      }}
    >
      <div className={styles.primaryRow}>
        <Input
          className={styles.queryInput ?? ''}
          value={draft.query}
          onChange={event => updateField({ field: 'query', value: event.target.value })}
          placeholder={t(`explore.queryPlaceholders.${query.signal}`)}
        />
        <Input
          value={draft.serviceName}
          onChange={event => updateField({ field: 'serviceName', value: event.target.value })}
          placeholder={t('explore.serviceName')}
        />
        <Input
          value={draft.environment}
          onChange={event => updateField({ field: 'environment', value: event.target.value })}
          placeholder={t('explore.environment')}
        />
        <Button className={styles.run ?? ''} type="primary" htmlType="submit">
          {t('common.query')}
        </Button>
      </div>
      <ExploreAdvancedFilters draft={draft} errors={errors} t={t} updateField={updateField} />
      <ExploreActiveFilters query={query} t={t} updateQuery={updateQuery} removeFilter={submission.removeFilter} />
    </form>
  );
}
