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

import { Input, Select } from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TraceFacet, TraceFacetField, TraceLoad } from '../model/explore-trace-analytics';
import styles from './explore-log-facets.module.css';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import { ExploreTraceHelp } from './explore-trace-help';
export function ExploreTraceFacets({
  load,
  field,
  onFieldChange,
  retry,
  action,
  controls
}: {
  controls?: ReactNode;
  load: TraceLoad<TraceFacet>;
  field: TraceFacetField;
  onFieldChange: (field: TraceFacetField) => void;
  retry: () => void;
  action: (value: string) => { disabled: boolean; selected: boolean; run: () => void };
}) {
  const { t } = useTranslation(),
    [search, setSearch] = useState('');
  const result = ['permission', 'idle'].includes(load.state) ? undefined : load.data,
    data = result?.state === 'ready' && result.data?.field === field ? result.data : null;
  return (
    <section className={styles.facets} aria-label={t('explore.logFacets.title')}>
      <h3>{t('explore.logFacets.title')}</h3>
      <Select
        aria-label={t('exploreTrace.analytics.field')}
        value={field}
        options={(['serviceName', 'operationName', 'environment'] as const).map(value => ({
          value,
          label: t(`exploreTrace.analytics.fields.${value}`)
        }))}
        onChange={value => {
          setSearch('');
          onFieldChange(value);
        }}
      />

      {controls}
      <TraceAnalyticsState load={load} retry={retry} />
      {result && <TraceCoverage coverage={result.coverage} />}
      {data && (
        <>
          <TraceFacetDetails
            {...{ data, search, setSearch, action }}
            population={result!.population}
            enabled={load.state === 'ready'}
          />
        </>
      )}
    </section>
  );
}

function TraceFacetValues({
  data,
  search,
  action,
  enabled
}: {
  data: NonNullable<TraceFacet['data']>;
  search: string;
  action: (value: string) => { disabled: boolean; selected: boolean; run: () => void };
  enabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <ul className={styles.values}>
      {data.values
        .filter(item => item.value.toLowerCase().includes(search.toLowerCase()))
        .map(item => {
          const control = action(item.value);
          const disabled = control.disabled || !enabled;
          const reason = disabled ? t('explore.logFacets.unavailableAction') : undefined;
          return (
            <li key={item.value}>
              <span className={styles.value} title={item.value}>
                {item.value || t('exploreTrace.analytics.emptyValue')}
              </span>
              <span>{item.count.toLocaleString()}</span>
              <span
                tabIndex={disabled ? 0 : undefined}
                role={disabled ? 'group' : undefined}
                aria-description={reason}
                title={reason}
              >
                <button
                  type="button"
                  aria-label={t(
                    control.selected ? 'exploreTrace.facets.removeValue' : 'exploreTrace.facets.toggleValue',
                    {
                      value: item.value || t('exploreTrace.analytics.emptyValue')
                    }
                  )}
                  aria-pressed={control.selected}
                  disabled={disabled}
                  onClick={control.run}
                >
                  {control.selected ? '−' : '+'}
                </button>
              </span>
            </li>
          );
        })}
    </ul>
  );
}

function TraceFacetDetails({
  data,
  search,
  setSearch,
  action,
  population,
  enabled
}: {
  data: NonNullable<TraceFacet['data']>;
  search: string;
  setSearch: (value: string) => void;
  action: (value: string) => { disabled: boolean; selected: boolean; run: () => void };
  population: TraceFacet['population'];
  enabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p>
        {t(`exploreTrace.analytics.${population}`)} · {data.totalCount.toLocaleString()}
      </p>
      {data.membership === 'multiple' && (
        <ExploreTraceHelp labelKey="exploreTrace.layout.countHelp">
          <p>{t('exploreTrace.analytics.membership')}</p>
        </ExploreTraceHelp>
      )}
      <Input
        aria-label={t('exploreTrace.analytics.search')}
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <TraceFacetValues data={data} search={search} action={action} enabled={enabled} />
      {!data.values.some(item => item.value.toLowerCase().includes(search.toLowerCase())) && (
        <p role="status">{t('exploreTrace.analytics.empty')}</p>
      )}
      <p>{t('exploreTrace.analytics.missing', { count: data.missingCount })}</p>
      {data.truncated && <p>{t('exploreTrace.analytics.topValues')}</p>}
    </>
  );
}
