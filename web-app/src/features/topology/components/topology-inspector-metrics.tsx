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
