/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { TopologyRedMetrics } from '../model/topology-contract';
import { TopologyMetricValue } from './topology-metric-value';
import styles from './topology-inspector.module.css';

export function TopologyInspectorMetrics({ metrics }: { metrics: TopologyRedMetrics }) {
  const { t } = useTranslation();
  const values = [
    ['requestRate', 'rate', metrics.requestRatePerSecond],
    ['errorRate', 'ratio', metrics.errorRate],
    ['latencyP95', 'latency', metrics.latencyP95Ms]
  ] as const;
  return (
    <section className={styles.inspectorSection}>
      <Typography.Text strong>{t('topology.detail.keyMetrics')}</Typography.Text>
      <div className={styles.metricGrid}>
        {values.map(([label, kind, value]) => (
          <div className={styles.metricCell} key={label}>
            <Typography.Text type="secondary">{t(`topology.metrics.${label}`)}</Typography.Text>
            <Typography.Text strong>
              <TopologyMetricValue kind={kind} value={value} />
            </Typography.Text>
          </div>
        ))}
      </div>
    </section>
  );
}
