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
import { logGroupingFieldLabel, type LogQuerySet, type LogQuerySource } from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { SourceActions } from './explore-log-query-set-row-actions';
import { SourceSettings } from './explore-log-query-set-source-settings';
import styles from './explore-log-add-authoring.module.css';

export function SourceRow({
  source,
  value,
  fields,
  t,
  update,
  remove,
  onSubmit
}: {
  source: LogQuerySource;
  value: LogQuerySet;
  fields: LogFacetField[];
  t: TFunction;
  update: (next: LogQuerySource) => void;
  remove: () => void;
  onSubmit?: (() => void) | undefined;
}) {
  const primary = value.queries[0]?.refId === source.refId;
  return (
    <div
      className={styles.source}
      role="group"
      aria-label={t('explore.logComparison.source', { source: source.refId })}
      data-log-query-source={source.refId}
    >
      {!primary && (
        <div className={styles.row}>
          <span className={styles.label}>{source.refId}</span>
          <div className={styles.queryInput}>
            <ExploreLogSearchInput
              value={source.search ?? ''}
              syntax={source.searchSyntax}
              onChange={search => update({ ...source, search })}
              onSubmit={onSubmit}
              t={t}
            />
          </div>
          <SourceActions {...{ source, value, update, remove, onSubmit, t }} />
        </div>
      )}
      <details className={styles.settings} open>
        <summary>
          {source.refId} · {t('explore.logAdd.configuration')} ·{' '}
          {t(`explore.logAnalysis.${source.analysis.measure?.function ?? 'count'}`)}
          {source.analysis.measure && ` · ${logGroupingFieldLabel(source.analysis.measure.field, t)}`}
          {source.analysis.transform === 'throughput' && ` · ${t('explore.logAnalysis.throughput')}`}
          {source.analysis.grouping?.dimensions.map(item => ` · ${logGroupingFieldLabel(item.field, t)}`).join('') ??
            (source.analysis.field ? ` · ${logGroupingFieldLabel(source.analysis.field, t)}` : '')}
        </summary>
        <SourceSettings {...{ source, fields, t, update }} />
      </details>
    </div>
  );
}
