/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Dropdown, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  monitorMetricHistoryRanges,
  type MonitorHistoryChart,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import styles from './monitor-history-results.module.css';
import { MonitorSegmentedSwitch } from './monitor-segmented-switch';

export function SelectedHistoryControls({
  chart,
  actions,
  investigationSignals
}: {
  chart: MonitorHistoryChart;
  actions: MonitorMetricWorkbenchController['actions'];
  investigationSignals: MonitorMetricWorkbenchController['state']['investigationSignals'];
}) {
  const { t } = useTranslation();
  const aggregated = chart.interval;
  return (
    <div className={styles.selectedHistoryControls}>
      <Select
        size="small"
        value={chart.history}
        aria-label={t('monitorMetrics.historyRange')}
        onChange={value => actions.setHistoryChartRange(chart.metric.key, value)}
        options={monitorMetricHistoryRanges.map(value => ({ value, label: value }))}
      />
      <MonitorSegmentedSwitch<'raw' | 'aggregated'>
        label={t('monitorMetrics.historyMode')}
        value={aggregated ? 'aggregated' : 'raw'}
        options={[
          { value: 'raw', label: t('monitorMetrics.rawValues') },
          { value: 'aggregated', label: t('monitorMetrics.aggregatedValues') }
        ]}
        size="small"
        onChange={value => actions.setHistoryChartMode(chart.metric.key, value === 'aggregated')}
      />
      <Button
        type="text"
        size="small"
        icon={<ReloadOutlined />}
        aria-label={t('monitorMetrics.refreshHistory')}
        onClick={() => actions.refreshHistoryChart(chart.metric.key)}
      />
      <InvestigationMenu signals={investigationSignals} actions={actions} />
    </div>
  );
}

function InvestigationMenu({
  signals,
  actions
}: {
  signals: MonitorMetricWorkbenchController['state']['investigationSignals'];
  actions: MonitorMetricWorkbenchController['actions'];
}) {
  const { t } = useTranslation();
  if (signals.length === 0) return null;
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: signals.map(signal => ({ key: signal, label: t(`explore.signals.${signal}`) })),
        onClick: item => actions.openInvestigationSignal(item.key as (typeof signals)[number])
      }}
    >
      <Button
        size="small"
        icon={<DownOutlined />}
        iconPosition="end"
        aria-label={t('monitorMetrics.investigation.open')}
      >
        {t('monitorMetrics.investigation.open')}
      </Button>
    </Dropdown>
  );
}
