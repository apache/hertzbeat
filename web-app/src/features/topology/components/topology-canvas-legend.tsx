/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
