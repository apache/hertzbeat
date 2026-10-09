/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { AdditionalMeasureHeaders, AdditionalMeasureCells } from './log-additional-measure-cells';
import { isLogPercentile } from '../../logs/log-measure';
import { groupIdentity } from '../../logs/log-grouping';
import { type LogAnalysisGroup, type LogAnalysisResult, type LogAnalysisState } from '../../logs/log-analysis';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import { LogMeasureValue, LogAnalysisRankBar } from './log-measure-value';

import { groupValueLabel, logAnalysisGroupLabel, logGroupingFieldLabel } from './log-grouping-display';

import styles from './log-analysis.module.css';
export type GroupActions = {
  onGroup?: ((group: LogAnalysisGroup) => void) | undefined;
  canOpenGroup?: ((group: LogAnalysisGroup) => boolean) | undefined;
};
export function AnalysisGroups({
  data,
  representation,
  t,
  ...actions
}: GroupActions & {
  data: LogAnalysisResult;
  representation: LogAnalysisState['representation'];
  t: TFunction;
}) {
  return (
    <div className={styles.scroll}>
      <table
        className={styles.table}
        style={{
          minWidth:
            (data.grouping?.dimensions.length ?? 1) * 160 +
            (data.measure ? 330 : 110) +
            (data.additionalMeasures?.length ?? 0) * 140
        }}
      >
        <AnalysisColumnHeaders data={data} t={t} />
        <tbody>
          {data.groups.map(group => (
            <tr key={groupIdentity(group)}>
              <td>
                <AnalysisGroupValue group={group} t={t} {...actions} />
                {representation === 'toplist' && <LogAnalysisRankBar group={group} data={data} />}
              </td>
              {group.keys?.slice(1).map(key => (
                <td key={key.field}>
                  <span className={styles.label} title={groupValueLabel(key, t)}>
                    {groupValueLabel(key, t)}
                  </span>
                </td>
              ))}
              <td data-log-stat>{group.count.toLocaleString()}</td>
              {data.measure && (
                <>
                  <td data-log-stat>
                    <LogMeasureValue
                      measurement={group.measurement!}
                      approximate={isLogPercentile(data.measure)}
                      t={t}
                    />
                  </td>
                  <td data-log-stat>{group.measurement!.sampleCount.toLocaleString()}</td>
                </>
              )}
              <AdditionalMeasureCells measures={data.additionalMeasures} values={group.additionalMeasurements} t={t} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisColumnHeaders({ data, t }: { data: LogAnalysisResult; t: TFunction }) {
  return (
    <thead>
      <tr>
        {data.grouping ? (
          data.grouping.dimensions.map(item => (
            <th key={item.field}>
              <span className={styles.label} title={item.field}>
                {logGroupingFieldLabel(item.field, t)}
              </span>
            </th>
          ))
        ) : (
          <th>{t('explore.logAnalysis.value')}</th>
        )}
        <th data-log-stat>{t('explore.logAnalysis.count')}</th>
        {data.measure && (
          <>
            <th data-log-stat>
              {t('explore.logAnalysis.measureValue', {
                function: t(`explore.logAnalysis.${data.measure.function}`),
                field: data.measure.field
              })}
            </th>
            <th data-log-stat>{t('explore.logAnalysis.samples')}</th>
          </>
        )}
        <AdditionalMeasureHeaders measures={data.additionalMeasures} t={t} />
      </tr>
    </thead>
  );
}
function AnalysisGroupValue({
  group,
  t,
  onGroup,
  canOpenGroup
}: GroupActions & { group: LogAnalysisGroup; t: TFunction }) {
  const label = group.keys ? groupValueLabel(group.keys[0]!, t) : logAnalysisGroupLabel(group, t);
  if (!onGroup)
    return (
      <span className={styles.label} title={label}>
        {label}
      </span>
    );
  if (!canOpenGroup?.(group))
    return (
      <>
        <span className={styles.label} title={label}>
          {label}
        </span>
        <small>{t('explore.logAnalysis.unsupportedGroup')}</small>
      </>
    );
  return (
    <Button
      type="link"
      title={label}
      className={styles.label ?? ''}
      aria-label={t('explore.logAnalysis.openGroup', { value: logAnalysisGroupLabel(group, t) })}
      onClick={() => onGroup(group)}
    >
      {label}
    </Button>
  );
}
