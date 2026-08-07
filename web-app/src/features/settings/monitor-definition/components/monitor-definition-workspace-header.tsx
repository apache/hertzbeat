/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './monitor-definition-workspace.module.css';

export function MonitorDefinitionWorkspaceHeader(props: {
  title: string;
  origin: string;
  className: string;
  actions: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={props.className} data-monitor-definition-workspace-header>
      <Typography.Title level={4}>{props.title}</Typography.Title>
      <div className={styles.headerActions}>
        <Tag>{t(`monitorDefinitions.originValue.${props.origin}`)}</Tag>
        {props.actions}
      </div>
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
