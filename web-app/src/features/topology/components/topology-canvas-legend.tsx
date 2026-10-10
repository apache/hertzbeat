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

import { Badge, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import type { TopologyPresentation } from '../model/topology-view-model';
import styles from './topology-page.module.css';

type HealthKind = 'critical' | 'healthy' | 'warning';
const healthKinds: HealthKind[] = ['healthy', 'warning', 'critical'];
const statuses = { critical: 'error', healthy: 'success', warning: 'warning' } as const;

export function TopologyCanvasLegend({ presentation }: { presentation: TopologyPresentation }) {
  const { t } = useTranslation();
  const observed = new Set(presentation.graph.nodes.map(node => recognizedHealth(node.health)));
  const hasUnknown = observed.has(undefined);
  return (
    <Space className={styles.canvasLegend!} size={12} wrap>
      {healthKinds
        .filter(kind => observed.has(kind))
        .map(kind => (
          <Badge key={kind} status={statuses[kind]} text={t(`topology.legend.${kind}`)} />
        ))}
      {hasUnknown ? <Badge status="default" text={t('topology.legend.unknown')} /> : null}
      <Badge color="var(--ant-color-primary)" text={t('topology.legend.selected')} />
    </Space>
  );
}

function recognizedHealth(health: string): HealthKind | undefined {
  const normalized = health.trim().toLowerCase();
  return healthKinds.find(kind => kind === normalized);
}
