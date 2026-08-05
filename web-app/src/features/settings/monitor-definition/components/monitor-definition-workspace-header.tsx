/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export function MonitorDefinitionWorkspaceHeader(props: {
  title: string;
  app: string;
  origin: string;
  revision: string;
  className: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={props.className}>
      <div>
        <Typography.Title level={4}>{props.title}</Typography.Title>
        <Typography.Text code>{props.app}</Typography.Text>
      </div>
      <Space wrap>
        <Tag>{t(`monitorDefinitions.originValue.${props.origin}`)}</Tag>
        <Typography.Text code>{props.revision}</Typography.Text>
      </Space>
    </div>
  );
}

export function MonitorDefinitionWorkspaceGuidance({ className }: { className: string }) {
  const { t } = useTranslation();
  return (
    <div className={className} role="status">
      <Typography.Title level={4}>{t('monitorDefinitions.workspaceEmptyTitle')}</Typography.Title>
      <Typography.Text type="secondary">{t('monitorDefinitions.workspaceEmpty')}</Typography.Text>
    </div>
  );
}
