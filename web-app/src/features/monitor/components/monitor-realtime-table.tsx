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

import { Button, Spin, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorMetricOption } from '../model/monitor-contract';
import type { monitorRealtimeRows } from '../model/monitor-detail-model';
import { monitorFieldLabel, type MonitorMetricLabels } from '../model/monitor-metric-labels';
import { MonitorMetricValue } from './monitor-metric-value';
import { MatrixRealtimeTable } from './monitor-realtime-matrix-table';
import styles from './monitor-realtime-table.module.css';

type RealtimeRow = ReturnType<typeof monitorRealtimeRows>[number];
type CompactRow = {
  key: string;
  field: string;
  displayName: string;
  unit: string | null;
  value: string;
  metricKey: string | undefined;
};

export function MonitorRealtimeTable({
  rows,
  pending,
  group,
  labels,
  metricOptions = [],
  selectedMetricKey,
  onSelectMetric
}: {
  rows: RealtimeRow[];
  pending: boolean;
  group?: string | undefined;
  labels?: MonitorMetricLabels | undefined;
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
          labels={labels}
          metricOptions={metricOptions}
          selectedMetricKey={selectedMetricKey}
          onSelectMetric={onSelectMetric}
        />
      ) : (
        <MatrixRealtimeTable key={group} rows={rows} pending={pending} group={group} labels={labels} />
      )}
    </div>
  );
}

function CompactRealtimeTable({
  rows,
  pending,
  group,
  labels,
  metricOptions,
  selectedMetricKey,
  onSelectMetric
}: {
  rows: RealtimeRow[];
  pending: boolean;
  group?: string | undefined;
  labels?: MonitorMetricLabels | undefined;
  metricOptions: MonitorMetricOption[];
  selectedMetricKey?: string | undefined;
  onSelectMetric?: ((metricKey: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  const data = compactRows(rows, metricOptions, group, labels);
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
            {renderField(row.displayName, row.unit, row.field)}
          </Button>
        ) : (
          renderField(row.displayName, row.unit, row.field)
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
  group: string | undefined,
  translations: MonitorMetricLabels | undefined
): CompactRow[] {
  const labels: CompactRow[] = Object.entries(rows[0]?.labels ?? {}).map(([field, value]) => ({
    key: `label:${field}`,
    field,
    displayName: monitorFieldLabel(translations, group, field),
    unit: null,
    value,
    metricKey: undefined
  }));
  return [
    ...labels,
    ...rows.map(row => ({
      key: row.key,
      field: row.field,
      displayName: monitorFieldLabel(translations, group, row.field),
      unit: row.unit,
      value: row.value,
      metricKey: metricOptions.find(option => option.group === group && option.field === row.field)?.key
    }))
  ];
}

function renderField(field: string, unit?: string | null, identity?: string) {
  return (
    <span className={styles.realtimeField}>
      <span title={identity}>{field}</span>
      {unit ? <Tag bordered={false}>{unit}</Tag> : null}
    </span>
  );
}

function sampleKey(row: RealtimeRow) {
  const separator = row.key.indexOf(':');
  return separator < 0 ? row.key : row.key.slice(0, separator);
}
