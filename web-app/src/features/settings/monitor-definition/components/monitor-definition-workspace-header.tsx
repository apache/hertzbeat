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

import { Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import styles from './monitor-definition-workspace.module.css';

export function MonitorDefinitionWorkspaceHeader(props: {
  title: string;
  origin: string;
  className: string;
  monitorListPath: string;
  deleteDisabled: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className={props.className} data-monitor-definition-workspace-header>
      <Typography.Title level={4}>{props.title}</Typography.Title>
      <div className={styles.headerActions}>
        <Tag>{t(`monitorDefinitions.originValue.${props.origin}`)}</Tag>
        <Button onClick={() => void navigate(props.monitorListPath)}>{t('monitorDefinitions.monitors')}</Button>
        <Button type="primary" danger disabled={props.deleteDisabled} onClick={props.onDelete}>
          {t('common.delete')}
        </Button>
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
