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

import { AutoComplete, Button, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { MetricRowFilter } from './metric-row-filter';
import type { ReactNode } from 'react';
import { MetricRowAdvanced } from './metric-row-advanced';
import { useTranslation } from 'react-i18next';
import type { MetricQueryRow } from '@/platform/perses';
import { EXPLORE_METRIC_AGGREGATIONS } from '../model/explore-submission-model';

import type { MetricPlanEditorProps } from './explore-metric-plan-editor-props';
import { MetricPlanMetricInput } from './metric-plan-metric-input';
import styles from './explore-metric-plan-editor.module.css';
type Props = MetricPlanEditorProps & { row: MetricQueryRow; discoveryControls?: ReactNode };
export function MetricPlanSourceRow(props: Props) {
  const { row, plan, onChange, activeRef, onActiveRefChange } = props;
  const { t } = useTranslation();
  const update = (patch: Partial<MetricQueryRow>) =>
    onChange({ ...plan, queries: plan.queries.map(item => (item.refId === row.refId ? { ...item, ...patch } : item)) });
  return (
    <div
      className={styles.source}
      role="group"
      aria-label={t('explore.metricComposition.queryOwner', { ref: row.refId })}
      data-metric-query-row={row.refId}
      onFocus={() => onActiveRefChange(row.refId)}
    >
      <div className={styles.row}>
        <Button
          type="text"
          aria-pressed={activeRef === row.refId}
          aria-label={t('explore.metricComposition.select', { ref: row.refId })}
          className={styles.reference ?? ''}
        >
          {row.refId}
        </Button>
        <MetricSourceFields {...props} update={update} />
        <Button
          type="text"
          icon={<DeleteOutlined />}
          aria-label={t('explore.metricComposition.removeQuery', { ref: row.refId })}
          title={t('explore.metricComposition.removeQuery', { ref: row.refId })}
          disabled={plan.queries.length === 1}
          onClick={() => {
            const queries = plan.queries.filter(item => item.refId !== row.refId);
            onChange({ ...plan, queries });
            if (activeRef === row.refId && queries[0]) onActiveRefChange(queries[0].refId);
          }}
        />
      </div>
    </div>
  );
}

function MetricSourceFields(props: Props & { update: (patch: Partial<MetricQueryRow>) => void }) {
  const { row, update, activeRef } = props;
  const { t } = useTranslation();
  return (
    <div className={styles.queryFields}>
      <label className={styles.metric}>
        <MetricPlanMetricInput row={row} onChange={metric => update({ metric })} />
      </label>
      <MetricRowFilter {...{ row, update, activeRef }} discoveryControls={props.discoveryControls} />
      <label className={styles.aggregation}>
        <Select
          aria-label={`${row.refId} ${t('exploreMetric.aggregation')}`}
          value={row.aggregation || 'sum'}
          options={EXPLORE_METRIC_AGGREGATIONS.map(value => ({ value, label: value }))}
          onChange={aggregation => update({ aggregation })}
        />
      </label>
      <label className={styles.groupBy} title={row.groupBy}>
        <span>{t('explore.metricComposition.byLabel')}</span>
        <AutoComplete
          aria-label={`${row.refId} ${t('exploreMetric.groupBy')}`}
          value={row.groupBy ?? ''}
          placeholder={t('explore.metricComposition.groupPlaceholder')}
          options={activeRef === row.refId ? (props.labelKeys?.items.map(value => ({ value })) ?? []) : []}
          onChange={groupBy => update({ groupBy })}
        />
      </label>
      <MetricRowAdvanced row={row} update={update} />
    </div>
  );
}
