/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TopologyEdgePage } from '../model/topology-contract';
import type { TopologyPageActions } from '../model/topology-page-contract';
import { topologyPageSizes } from '../model/topology-model';
import type { TopologyMetricRow, TopologyInteraction } from '../model/topology-view-model';
import { TopologyMetricValue } from './topology-metric-value';
import styles from './topology-page.module.css';

type Props = {
  rows: TopologyMetricRow[];
  interaction: TopologyInteraction;
  edgePage: TopologyEdgePage;
  actions: Pick<TopologyPageActions, 'changePage' | 'clearHover' | 'drilldown' | 'hoverEdge' | 'hoverNode'>;
};

export function TopologyMetricTable({ rows, interaction, edgePage, actions }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  return (
    <section className={styles.evidenceSection}>
      <div className={styles.evidenceHeading}>
        <div>
          <Typography.Text strong>{t('topology.table.title')}</Typography.Text>
          <Typography.Text type="secondary"> ({rows.length})</Typography.Text>
        </div>
        <Button
          type="text"
          icon={expanded ? <DownOutlined /> : <UpOutlined />}
          aria-label={t('topology.table.toggle')}
          aria-expanded={expanded}
          aria-controls="topology-evidence-table"
          onClick={() => setExpanded(value => !value)}
        >
          {t('topology.table.toggle')}
        </Button>
      </div>
      {expanded ? (
        <TopologyMetricTableBody rows={rows} interaction={interaction} edgePage={edgePage} actions={actions} />
      ) : null}
    </section>
  );
}

function TopologyMetricTableBody({ rows, interaction, edgePage, actions }: Props) {
  const { t } = useTranslation();
  const { pageIndex, pageSize, totalElements, hasNext } = edgePage;
  return (
    <div id="topology-evidence-table" className={styles.evidenceBody}>
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
      <Space {...(styles.pagination ? { className: styles.pagination } : {})}>
        <Button disabled={pageIndex === 0} onClick={() => actions.changePage(pageIndex - 1, pageSize)}>
          {t('topology.pagination.previous')}
        </Button>
        <Typography.Text>{t('topology.pagination.page', { page: pageIndex + 1 })}</Typography.Text>
        <Typography.Text type="secondary">{t('topology.pagination.total', { total: totalElements })}</Typography.Text>
        <Button disabled={!hasNext} onClick={() => actions.changePage(pageIndex + 1, pageSize)}>
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
