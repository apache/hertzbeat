/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ArrowDownOutlined, ArrowUpOutlined, ExportOutlined, LineChartOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { TopologyPageActions } from '../model/topology-page-contract';
import type { TopologyInspectorRelation, TopologyInspectorSelection } from '../model/topology-inspector-model';
import { TopologyInspectorMetrics } from './topology-inspector-metrics';
import { TopologyMetricValue } from './topology-metric-value';
import styles from './topology-inspector.module.css';

type Props = {
  selected: TopologyInspectorSelection;
  window: ExactTimeWindow | undefined;
  actions: Pick<TopologyPageActions, 'openEntity' | 'querySignals'>;
};

export function TopologyInspectorContent({ selected, window, actions }: Props) {
  return selected.kind === 'node' ? (
    <NodeInspector selected={selected} window={window} actions={actions} />
  ) : (
    <EdgeInspector selected={selected} window={window} actions={actions} />
  );
}

function NodeInspector({
  selected,
  window,
  actions
}: Props & { selected: Extract<TopologyInspectorSelection, { kind: 'node' }> }) {
  const { t } = useTranslation();
  const { node } = selected;
  return (
    <div className={styles.inspectorContent}>
      <InspectorTitle title={node.entityName} tags={[node.entityType, node.environment]} />
      <InspectorSection title={t('topology.detail.identity')}>
        <Descriptions size="small" column={1} items={nodeIdentityItems(t, node)} />
      </InspectorSection>
      <TopologyInspectorMetrics metrics={node.redMetrics} />
      <RelationSection
        title={t('topology.detail.upstream', { count: selected.upstream.length })}
        icon={<ArrowUpOutlined />}
        relations={selected.upstream}
      />
      <RelationSection
        title={t('topology.detail.downstream', { count: selected.downstream.length })}
        icon={<ArrowDownOutlined />}
        relations={selected.downstream}
      />
      <InspectorActions
        openLabel={t('topology.detail.openEntity')}
        queryLabel={t('topology.detail.querySignals')}
        canQuery={Boolean(window && node.entityType === 'service')}
        onOpen={() => actions.openEntity(node.entityId)}
        onQuery={() => {
          if (window) actions.querySignals(node, window);
        }}
      />
    </div>
  );
}

function EdgeInspector({
  selected,
  window,
  actions
}: Props & { selected: Extract<TopologyInspectorSelection, { kind: 'edge' }> }) {
  const { t } = useTranslation();
  const { edge, source } = selected;
  const target = selected.target?.entityName ?? selected.externalTarget;
  return (
    <div className={styles.inspectorContent}>
      <InspectorTitle title={edge.relationType} tags={[edge.relationSource, edge.status]} />
      <InspectorSection title={t('topology.detail.identity')}>
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'source', label: t('topology.detail.source'), children: source?.entityName ?? edge.sourceNodeId },
            { key: 'target', label: t('topology.detail.target'), children: nullable(target) },
            { key: 'relationId', label: t('topology.detail.relationId'), children: nullable(edge.relationId) },
            { key: 'firstSeen', label: t('topology.detail.firstSeen'), children: nullable(edge.firstSeen) },
            { key: 'lastSeen', label: t('topology.detail.lastSeen'), children: nullable(edge.lastSeen) }
          ]}
        />
      </InspectorSection>
      <TopologyInspectorMetrics metrics={edge.redMetrics} />
      {source ? (
        <InspectorActions
          openLabel={t('topology.detail.openSourceEntity')}
          queryLabel={t('topology.detail.querySourceSignals')}
          canQuery={Boolean(window && source.entityType === 'service')}
          onOpen={() => actions.openEntity(source.entityId)}
          onQuery={() => {
            if (window) actions.querySignals(source, window);
          }}
        />
      ) : null}
    </div>
  );
}

function InspectorTitle({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className={styles.inspectorTitle}>
      <Typography.Title level={4}>{title}</Typography.Title>
      <Space size={4} wrap>
        {tags.filter(Boolean).map(tag => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>
    </div>
  );
}

function RelationSection({
  title,
  icon,
  relations
}: {
  title: string;
  icon: React.ReactNode;
  relations: TopologyInspectorRelation[];
}) {
  const { t } = useTranslation();
  return (
    <InspectorSection title={title}>
      {relations.length ? (
        <List
          size="small"
          bordered
          dataSource={relations}
          renderItem={relation => (
            <List.Item>
              <List.Item.Meta
                avatar={icon}
                title={relation.counterpart?.entityName ?? relation.externalTarget ?? t('topology.metrics.unavailable')}
                description={relation.counterpart?.entityType ?? relation.edge.relationType}
              />
              <TopologyMetricValue kind="rate" value={relation.edge.redMetrics.requestRatePerSecond} />
            </List.Item>
          )}
        />
      ) : (
        <Typography.Text type="secondary">{t('topology.detail.noRelations')}</Typography.Text>
      )}
    </InspectorSection>
  );
}

function InspectorActions({
  openLabel,
  queryLabel,
  canQuery,
  onOpen,
  onQuery
}: {
  openLabel: string;
  queryLabel: string;
  canQuery: boolean;
  onOpen: () => void;
  onQuery: () => void;
}) {
  return (
    <div className={styles.inspectorActions}>
      <Divider />
      <Button type="primary" block icon={<ExportOutlined />} aria-label={openLabel} onClick={onOpen}>
        {openLabel}
      </Button>
      <Button block icon={<LineChartOutlined />} aria-label={queryLabel} disabled={!canQuery} onClick={onQuery}>
        {queryLabel}
      </Button>
    </div>
  );
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.inspectorSection}>
      <Typography.Text strong>{title}</Typography.Text>
      {children}
    </section>
  );
}

function nodeIdentityItems(
  t: (key: string) => string,
  node: Extract<TopologyInspectorSelection, { kind: 'node' }>['node']
) {
  return [
    { key: 'entityId', label: t('topology.detail.entityId'), children: node.entityId },
    { key: 'type', label: t('topology.detail.node'), children: node.entityType },
    { key: 'environment', label: t('topology.detail.environment'), children: nullable(node.environment) },
    { key: 'namespace', label: t('topology.detail.namespace'), children: nullable(node.namespace) }
  ];
}

function nullable(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : value;
}
