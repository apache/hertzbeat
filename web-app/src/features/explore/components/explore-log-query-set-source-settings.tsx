/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Popover, Select } from 'antd';
import type { TFunction } from 'i18next';
import { DEFAULT_LOG_ANALYSIS, type LogAnalysisState, type LogQuerySource } from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';
import { ExploreLogMeasureControls } from './explore-log-measure-controls';
import { ExploreLogGroupingControls } from './explore-log-grouping-controls';
import { ExploreLogThroughputControl } from './explore-log-throughput-control';
import styles from './explore-log-add-authoring.module.css';

export function SourceSettings({
  source,
  fields,
  t,
  update
}: {
  source: LogQuerySource;
  fields: LogFacetField[];
  t: TFunction;
  update: (next: LogQuerySource) => void;
}) {
  const control: LogAnalysisState = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    ...source.analysis,
    measure: source.analysis.measure ?? undefined
  };
  const updateAnalysis = (next: LogAnalysisState) =>
    update({
      ...source,
      analysis: {
        ...(next.field ? { field: next.field } : {}),
        ...(next.grouping ? { grouping: next.grouping } : {}),
        ...(next.measure ? { measure: next.measure } : {}),
        ...(next.transform ? { transform: next.transform } : {}),
        limit: next.limit,
        order: next.order,
        minCount: next.minCount
      }
    });
  return (
    <div className={styles.settingsBody}>
      <ExploreLogMeasureControls value={control} fields={fields} onChange={updateAnalysis} t={t} />
      <ExploreLogGroupingControls value={control} fields={fields} onChange={updateAnalysis} t={t} />
      {(source.analysis.field || source.analysis.grouping) && (
        <SourceRankControls source={source} update={update} t={t} />
      )}
      <Popover
        trigger="click"
        content={
          <div className={styles.settingsBody}>
            <ExploreLogThroughputControl value={control} onChange={updateAnalysis} t={t} />
            <label>
              {t('explore.logAdd.timeShift')}
              <Select
                value={source.timeShiftMs ?? 0}
                options={[
                  { value: 0, label: t('explore.logComparison.sameWindow') },
                  { value: 3600000, label: t('explore.logComparison.hourEarlier') },
                  { value: 86400000, label: t('explore.logComparison.dayEarlier') },
                  { value: 604800000, label: t('explore.logComparison.weekEarlier') }
                ]}
                onChange={timeShiftMs => update({ ...source, timeShiftMs })}
              />
            </label>
          </div>
        }
      >
        <Button type="text">{t('explore.logAdd.functionsAndTime')}</Button>
      </Popover>
    </div>
  );
}

function SourceRankControls({
  source,
  update,
  t
}: {
  source: LogQuerySource;
  update: (next: LogQuerySource) => void;
  t: TFunction;
}) {
  return (
    <>
      <label>
        {t('explore.logAnalysis.order')}
        <Select
          value={source.analysis.order}
          options={[
            { value: source.analysis.measure ? 'measure-desc' : 'count-desc', label: t('explore.logAnalysis.top') },
            { value: source.analysis.measure ? 'measure-asc' : 'count-asc', label: t('explore.logAnalysis.bottom') }
          ]}
          onChange={order => update({ ...source, analysis: { ...source.analysis, order } })}
        />
      </label>
      <label>
        {t('explore.logAnalysis.limit')}
        <Select
          value={source.analysis.limit}
          disabled={Boolean(source.analysis.grouping)}
          options={[...new Set([5, 10, 20, 25, source.analysis.limit])]
            .sort((a, b) => a - b)
            .map(limit => ({ value: limit, label: limit }))}
          onChange={limit => update({ ...source, analysis: { ...source.analysis, limit } })}
        />
      </label>
    </>
  );
}
