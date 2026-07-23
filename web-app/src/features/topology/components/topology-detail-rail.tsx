/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Descriptions, Drawer, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { TopologyMetricValue } from './topology-metric-value';
import styles from './topology-page.module.css';

export function TopologyInspector({
  compact,
  interaction,
  presentation,
  onClose
}: {
  compact: boolean;
  interaction: TopologyInteraction;
  presentation: TopologyPresentation;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const selected = resolveSelected(interaction, presentation);
  const title = t('topology.detail.title');
  if (compact) {
    return (
      <Drawer open={Boolean(selected)} title={title} onClose={onClose} destroyOnHidden>
        {selected ? <TopologyDetailContent selected={selected} presentation={presentation} /> : null}
      </Drawer>
    );
  }
  return (
    <aside className={styles.detailRail} aria-label={title}>
      <Typography.Title level={5}>{title}</Typography.Title>
      {!selected ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('topology.detail.none')} /> : null}
      {selected ? <TopologyDetailContent selected={selected} presentation={presentation} /> : null}
    </aside>
  );
}

function TopologyDetailContent({
  selected,
  presentation
}: {
  selected: NonNullable<ReturnType<typeof resolveSelected>>;
  presentation: TopologyPresentation;
}) {
  return selected.kind === 'node' ? (
    <NodeDetail node={selected.value} />
  ) : (
    <EdgeDetail edge={selected.value} presentation={presentation} />
  );
}

function NodeDetail({ node }: { node: TopologyPresentation['graph']['nodes'][number] }) {
  const { t } = useTranslation();
  return (
    <>
      <Typography.Text strong>{node.entityName}</Typography.Text>
      <Descriptions size="small" column={1} items={nodeItems(t, node)} />
      <MetricDetails metrics={node.redMetrics} />
    </>
  );
}

function EdgeDetail({
  edge,
  presentation
}: {
  edge: TopologyPresentation['graph']['edges'][number];
  presentation: TopologyPresentation;
}) {
  const { t } = useTranslation();
  const names = new Map(presentation.graph.nodes.map(node => [node.id, node.entityName]));
  return (
    <>
      <Typography.Text strong>{edge.relationType}</Typography.Text>
      <Descriptions
        size="small"
        column={1}
        items={[
          { key: 'source', label: t('topology.detail.source'), children: names.get(edge.sourceNodeId) },
          {
            key: 'target',
            label: t('topology.detail.target'),
            children: edge.targetNodeId ? names.get(edge.targetNodeId) : edge.targetRef
          },
          { key: 'status', label: t('topology.detail.status'), children: edge.status },
          { key: 'relationType', label: t('topology.detail.relationType'), children: edge.relationType },
          { key: 'relationSource', label: t('topology.detail.relationSource'), children: edge.relationSource }
        ]}
      />
      <MetricDetails metrics={edge.redMetrics} />
    </>
  );
}

function MetricDetails({ metrics }: { metrics: TopologyPresentation['graph']['nodes'][number]['redMetrics'] }) {
  const { t } = useTranslation();
  return (
    <Descriptions
      size="small"
      column={1}
      items={[
        metricItem('requestRate', <TopologyMetricValue kind="rate" value={metrics.requestRatePerSecond} />, t),
        metricItem('requestCount', <TopologyMetricValue kind="count" value={metrics.requestCount} />, t),
        metricItem('errorRate', <TopologyMetricValue kind="ratio" value={metrics.errorRate} />, t),
        metricItem('errorCount', <TopologyMetricValue kind="count" value={metrics.errorCount} />, t),
        metricItem('latencyP95', <TopologyMetricValue kind="latency" value={metrics.latencyP95Ms} />, t),
        metricItem('latencyAvg', <TopologyMetricValue kind="latency" value={metrics.latencyAvgMs} />, t)
      ]}
    />
  );
}

function nodeItems(t: (key: string) => string, node: TopologyPresentation['graph']['nodes'][number]) {
  return [
    { key: 'type', label: t('topology.detail.node'), children: node.entityType },
    { key: 'environment', label: t('topology.detail.environment'), children: node.environment },
    { key: 'namespace', label: t('topology.detail.namespace'), children: node.namespace },
    { key: 'status', label: t('topology.detail.status'), children: node.health }
  ];
}

function metricItem(key: string, children: React.ReactNode, t: (key: string) => string) {
  return { key, label: t(`topology.metrics.${key}`), children };
}

function resolveSelected(interaction: TopologyInteraction, presentation: TopologyPresentation) {
  const selected = interaction.selected;
  if (selected.kind === 'node') {
    const value = presentation.graph.nodes.find(node => node.id === selected.nodeId);
    return value ? ({ kind: 'node', value } as const) : undefined;
  }
  if (selected.kind === 'edge') {
    const value = presentation.graph.edges.find(edge => edge.id === selected.edgeId);
    return value ? ({ kind: 'edge', value } as const) : undefined;
  }
  return undefined;
}
