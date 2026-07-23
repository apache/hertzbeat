/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { TopologyPageController } from '../controller/use-topology-page-controller';
import { topologyPageSizes } from '../model/topology-model';
import type { TopologyMetricRow, TopologyInteraction } from '../model/topology-view-model';
import { TopologyMetricValue } from './topology-metric-value';
import styles from './topology-page.module.css';

type Props = {
  rows: TopologyMetricRow[];
  interaction: TopologyInteraction;
  edgeCount: number;
  pageIndex: number;
  pageSize: number;
  actions: Pick<
    TopologyPageController['actions'],
    'changePage' | 'clearHover' | 'drilldown' | 'hoverEdge' | 'hoverNode'
  >;
};

export function TopologyMetricTable({ rows, interaction, edgeCount, pageIndex, pageSize, actions }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <Table<TopologyMetricRow>
        rowKey="rowKey"
        size="small"
        dataSource={rows}
        columns={columns(t)}
        rowClassName={row => (matches(row, interaction) ? styles.topologyRowActive! : '')}
        onRow={row => ({
          tabIndex: 0,
          onClick: () => actions.drilldown(row),
          onKeyDown: event => {
            if (event.key === 'Enter') actions.drilldown(row);
          },
          onMouseEnter: () => hoverRow(row, actions),
          onMouseLeave: actions.clearHover
        })}
        pagination={false}
      />
      <Space className={styles.pagination}>
        <Button disabled={pageIndex === 0} onClick={() => actions.changePage(pageIndex - 1, pageSize)}>
          {t('topology.pagination.previous')}
        </Button>
        <Typography.Text>{t('topology.pagination.page', { page: pageIndex + 1 })}</Typography.Text>
        <Button disabled={edgeCount < pageSize} onClick={() => actions.changePage(pageIndex + 1, pageSize)}>
          {t('topology.pagination.next')}
        </Button>
        <Select
          value={pageSize}
          aria-label={t('topology.pagination.pageSize')}
          options={topologyPageSizes.map(value => ({ value, label: String(value) }))}
          onChange={size => actions.changePage(0, size)}
        />
      </Space>
    </div>
  );
}

function columns(t: (key: string) => string): ColumnsType<TopologyMetricRow> {
  return [
    {
      title: t('topology.table.kind'),
      dataIndex: 'kind',
      width: 90,
      render: (kind: TopologyMetricRow['kind']) => <Tag>{t(`topology.values.${kind}`)}</Tag>
    },
    {
      title: t('topology.table.name'),
      render: (_, row) => (row.kind === 'node' ? row.name : row.targetName || t('topology.table.externalTarget'))
    },
    {
      title: t('topology.table.type'),
      width: 150,
      render: (_, row) => (row.kind === 'node' ? row.entityType : row.relationType)
    },
    {
      title: t('topology.table.requestRate'),
      width: 110,
      align: 'right',
      render: (_, row) => <TopologyMetricValue kind="rate" value={row.metrics.requestRatePerSecond} />
    },
    {
      title: t('topology.table.errorRate'),
      width: 110,
      align: 'right',
      render: (_, row) => <TopologyMetricValue kind="ratio" value={row.metrics.errorRate} />
    },
    {
      title: t('topology.table.latencyP95'),
      width: 120,
      align: 'right',
      render: (_, row) => <TopologyMetricValue kind="latency" value={row.metrics.latencyP95Ms} />
    }
  ];
}

function matches(row: TopologyMetricRow, interaction: TopologyInteraction) {
  const targets = [interaction.selected, interaction.hover];
  return targets.some(target => {
    if (row.kind === 'node' && target.kind === 'node') return target.nodeId === row.nodeId;
    if (row.kind === 'edge' && target.kind === 'edge') return target.edgeId === row.edgeId;
    return false;
  });
}

function hoverRow(row: TopologyMetricRow, actions: Props['actions']) {
  if (row.kind === 'node') actions.hoverNode(row.nodeId);
  else actions.hoverEdge(row.edgeId);
}
