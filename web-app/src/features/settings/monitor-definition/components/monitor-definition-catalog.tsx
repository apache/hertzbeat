/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Space, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorDefinitionCatalogItem } from '../model/monitor-definition-model';

export function MonitorDefinitionCatalog(props: {
  canWrite: boolean;
  items: MonitorDefinitionCatalogItem[];
  onDelete: (item: MonitorDefinitionCatalogItem) => void;
  onEdit: (app: string) => void;
  onView: (app: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Table
      rowKey="app"
      dataSource={props.items}
      pagination={false}
      locale={{ emptyText: t('monitorDefinitions.searchEmpty') }}
      columns={[
        {
          title: t('monitorDefinitions.app'),
          dataIndex: 'app',
          render: (app: string, item) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{item.label}</Typography.Text>
              <Typography.Text type="secondary">{app}</Typography.Text>
            </Space>
          )
        },
        {
          title: t('monitorDefinitions.origin'),
          dataIndex: 'origin',
          width: 150,
          render: origin => <Tag>{t(`monitorDefinitions.originValue.${origin}`)}</Tag>
        },
        {
          title: t('monitorDefinitions.revision'),
          dataIndex: 'revision',
          width: 180,
          render: revision => <Typography.Text code>{String(revision).slice(0, 12)}</Typography.Text>
        },
        {
          title: t('common.actions'),
          key: 'actions',
          width: 260,
          render: (_, item) => <DefinitionActions item={item} {...props} />
        }
      ]}
    />
  );
}

function DefinitionActions(
  props: Parameters<typeof MonitorDefinitionCatalog>[0] & { item: MonitorDefinitionCatalogItem }
) {
  const { t } = useTranslation();
  const { item } = props;
  return (
    <Space wrap>
      <Button onClick={() => props.onView(item.app)} aria-label={t('monitorDefinitions.viewApp', { app: item.label })}>
        {t('common.view')}
      </Button>
      <Button
        disabled={!props.canWrite || !item.editable}
        onClick={() => props.onEdit(item.app)}
        aria-label={t('monitorDefinitions.editApp', { app: item.label })}
      >
        {t('common.edit')}
      </Button>
      <Button
        danger
        disabled={!props.canWrite || !item.deletable}
        onClick={() => props.onDelete(item)}
        aria-label={t('monitorDefinitions.deleteApp', { app: item.label })}
      >
        {t('common.delete')}
      </Button>
    </Space>
  );
}
