/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState, type ReactNode } from 'react';
import { Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TraceFacet, TraceLoad, TraceFacetField } from '../model/explore-trace-analytics';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import { ExploreTraceHelp } from './explore-trace-help';
import styles from './explore-log-facets.module.css';
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
          <p>
            {t(`exploreTrace.analytics.${result!.population}`)} · {data.totalCount.toLocaleString()}
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
          <TraceFacetValues data={data} search={search} action={action} enabled={load.state === 'ready'} />
          {!data.values.some(item => item.value.toLowerCase().includes(search.toLowerCase())) && (
            <p role="status">{t('exploreTrace.analytics.empty')}</p>
          )}
          <p>{t('exploreTrace.analytics.missing', { count: data.missingCount })}</p>
          {data.truncated && <p>{t('exploreTrace.analytics.topValues')}</p>}
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
