/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Descriptions, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { DeploymentView } from '../model/deployment-contract';

export function DeploymentSummary({ deployment }: { deployment: DeploymentView }) {
  const { t } = useTranslation();
  return (
    <Descriptions bordered size="small" column={1}>
      <Descriptions.Item label={t('deployment.current.managementDatabase')}>
        <DatabaseTruth database={deployment.managementDatabase} />
      </Descriptions.Item>
      <Descriptions.Item label={t('deployment.current.greptimeDatabase')}>
        <DatabaseTruth database={deployment.greptimeDatabase} />
      </Descriptions.Item>
      <Descriptions.Item label={t('deployment.current.applyMode')}>
        {t(`deployment.applyMode.${deployment.applyMode}`)}
      </Descriptions.Item>
      <Descriptions.Item label={t('deployment.current.maintenanceMode')}>
        <Tag color={deployment.maintenanceMode === 'active' ? 'warning' : 'default'}>
          {t(`deployment.maintenance.${deployment.maintenanceMode}`)}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label={t('deployment.current.topology')}>
        {t(`deployment.topology.${deployment.topology}`)}
      </Descriptions.Item>
    </Descriptions>
  );
}

function DatabaseTruth({
  database
}: {
  database: DeploymentView['managementDatabase'] | DeploymentView['greptimeDatabase'];
}) {
  const { t } = useTranslation();
  const kind = databaseKindLabel(database.kind);
  return (
    <Space wrap>
      <Typography.Text strong>{kind ?? t('deployment.topology.unknown')}</Typography.Text>
      <Typography.Text type="secondary">{t(`deployment.source.${database.source}`)}</Typography.Text>
      {database.restartRequired && <Tag color="warning">{t('deployment.current.restartRequired')}</Tag>}
    </Space>
  );
}

function databaseKindLabel(kind: DeploymentView['managementDatabase']['kind'] | 'greptime') {
  if (kind === 'greptime') return 'GreptimeDB';
  if (kind === 'mysql') return 'MySQL';
  if (kind === 'postgresql') return 'PostgreSQL';
  if (kind === 'h2') return 'H2';
  return null;
}
