/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Spin, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorMetricOption } from '../model/monitor-contract';
import type { monitorRealtimeRows } from '../model/monitor-detail-model';
import { MonitorMetricValue } from './monitor-metric-value';
import { MatrixRealtimeTable } from './monitor-realtime-matrix-table';
import styles from './monitor-realtime-table.module.css';

type RealtimeRow = ReturnType<typeof monitorRealtimeRows>[number];
type CompactRow = {
  key: string;
  field: string;
  unit: string | null;
  value: string;
  metricKey: string | undefined;
};

export function MonitorRealtimeTable({
  rows,
  pending,
  group,
  metricOptions = [],
  selectedMetricKey,
  onSelectMetric
}: {
  rows: RealtimeRow[];
  pending: boolean;
  group?: string | undefined;
  metricOptions?: MonitorMetricOption[] | undefined;
  selectedMetricKey?: string | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  const sampleKeys = new Set(rows.map(sampleKey));
  return (
    <div className={styles.realtimeTable}>
      {sampleKeys.size <= 1 ? (
        <CompactRealtimeTable
          rows={rows}
          pending={pending}
          group={group}
          metricOptions={metricOptions}
          selectedMetricKey={selectedMetricKey}
          onSelectMetric={onSelectMetric}
        />
      ) : (
        <MatrixRealtimeTable rows={rows} pending={pending} />
      )}
    </div>
  );
}

function CompactRealtimeTable({
  rows,
  pending,
  group,
  metricOptions,
  selectedMetricKey,
  onSelectMetric
}: {
  rows: RealtimeRow[];
  pending: boolean;
  group?: string | undefined;
  metricOptions: MonitorMetricOption[];
  selectedMetricKey?: string | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  const data = compactRows(rows, metricOptions, group);
  return (
    <Spin spinning={pending}>
      <table className={styles.compactMetricTable}>
        <caption className={styles.visuallyHidden}>{t('monitorMetrics.currentValues')}</caption>
        <colgroup>
          <col className={styles.metricIdentityColumn} data-metric-column="identity" />
          <col />
        </colgroup>
        <tbody>
          {data.map(row => (
            <CompactRealtimeRow
              key={row.key}
              row={row}
              selectedMetricKey={selectedMetricKey}
              onSelectMetric={onSelectMetric}
            />
          ))}
        </tbody>
      </table>
    </Spin>
  );
}

function CompactRealtimeRow({
  row,
  selectedMetricKey,
  onSelectMetric
}: {
  row: CompactRow;
  selectedMetricKey?: string | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  const metricKey = row.metricKey;
  const selected = metricKey === selectedMetricKey;
  return (
    <tr
      className={selected ? styles.selectedMetricRow : undefined}
      {...(metricKey ? { 'data-monitor-metric': metricKey } : {})}
    >
      <td>
        {metricKey && onSelectMetric ? (
          <Button
            type="text"
            className={styles.metricFieldButton ?? ''}
            aria-label={metricKey}
            onClick={() => onSelectMetric(metricKey)}
          >
            {renderField(row.field, row.unit)}
          </Button>
        ) : (
          renderField(row.field, row.unit)
        )}
      </td>
      <td className={styles.metricValue}>
        <MonitorMetricValue field={row.field} value={row.value} />
      </td>
    </tr>
  );
}

function compactRows(
  rows: RealtimeRow[],
  metricOptions: MonitorMetricOption[],
  group: string | undefined
): CompactRow[] {
  const labels: CompactRow[] = Object.entries(rows[0]?.labels ?? {}).map(([field, value]) => ({
    key: `label:${field}`,
    field,
    unit: null,
    value,
    metricKey: undefined
  }));
  return [
    ...labels,
    ...rows.map(row => ({
      key: row.key,
      field: row.field,
      unit: row.unit,
      value: row.value,
      metricKey: metricOptions.find(option => option.group === group && option.field === row.field)?.key
    }))
  ];
}

function renderField(field: string, unit?: string | null) {
  return (
    <span className={styles.realtimeField}>
      <span>{field}</span>
      {unit ? <Tag bordered={false}>{unit}</Tag> : null}
    </span>
  );
}

function sampleKey(row: RealtimeRow) {
  const separator = row.key.indexOf(':');
  return separator < 0 ? row.key : row.key.slice(0, separator);
}
