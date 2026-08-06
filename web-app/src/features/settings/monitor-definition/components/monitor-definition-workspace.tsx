/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Skeleton, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buildMonitorListPath } from '@/shared/navigation/app-paths';

import { monitorDefinitionFailureMessageKey, type MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import { MonitorDefinitionEditor } from './monitor-definition-editor';
import styles from './monitor-definition-workspace.module.css';
import type { MonitorDefinitionWorkspaceProps } from './monitor-definition-workspace-contract';
import {
  MonitorDefinitionWorkspaceGuidance,
  MonitorDefinitionWorkspaceHeader
} from './monitor-definition-workspace-header';

export function MonitorDefinitionWorkspaceView(props: MonitorDefinitionWorkspaceProps) {
  const { t } = useTranslation();
  if (!props.workspace) return <MonitorDefinitionWorkspaceGuidance className={styles.guidance ?? ''} />;
  if (props.workspace.kind === 'loading') return <Skeleton active paragraph={{ rows: 12 }} />;
  if (props.workspace.kind === 'error') {
    return (
      <Alert
        showIcon
        type="error"
        message={t(monitorDefinitionFailureMessageKey(props.workspace.failure))}
        action={<Button onClick={props.onRetry}>{t('common.retry')}</Button>}
      />
    );
  }
  if (props.workspace.kind === 'view') return <DefinitionReadView {...props} workspace={props.workspace} />;
  return <MonitorDefinitionEditor {...props} workspace={props.workspace} />;
}

function DefinitionReadView(
  props: MonitorDefinitionWorkspaceProps & { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'view' }> }
) {
  const { t } = useTranslation();
  const { detail } = props.workspace;
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      <MonitorDefinitionWorkspaceHeader
        title={detail.label}
        app={detail.app}
        origin={detail.origin}
        className={styles.header ?? ''}
      />
      <Space wrap>
        <Link to={buildMonitorListPath({ app: detail.app })}>{t('monitorDefinitions.monitors')}</Link>
        <Button danger disabled={!props.canWrite || !detail.deletable} onClick={() => props.onDelete(detail)}>
          {t('common.delete')}
        </Button>
      </Space>
      <pre className={styles.readOnly}>{detail.definition}</pre>
    </Space>
  );
}
