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

import { Alert, Button, Skeleton, Space } from 'antd';
import { useTranslation } from 'react-i18next';

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
  const { detail } = props.workspace;
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      <MonitorDefinitionWorkspaceHeader
        title={detail.label}
        origin={detail.origin}
        className={styles.header ?? ''}
        monitorListPath={buildMonitorListPath({ app: detail.app })}
        deleteDisabled={!props.canWrite || !detail.deletable}
        onDelete={() => props.onDelete(detail)}
      />
      <pre className={styles.readOnly}>{detail.definition}</pre>
    </Space>
  );
}
