/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Drawer, Input, Skeleton, Space, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { monitorDefinitionFailureMessageKey } from '../model/monitor-definition-model';
import type { MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import styles from './monitor-definition-workspace.module.css';

export function MonitorDefinitionWorkspaceView(props: {
  workspace: MonitorDefinitionWorkspace | null;
  onCancel: () => void;
  onChange: (value: string) => void;
  onRefreshConflict: () => void;
  onRetry: () => void;
  onSave: () => void;
  onValidate: () => void;
}) {
  const { t } = useTranslation();
  const workspace = props.workspace;
  const commandPending = workspace?.kind === 'edit' && workspace.pending !== null;
  return (
    <Drawer
      width={720}
      open={workspace !== null}
      onClose={props.onCancel}
      closable={!commandPending}
      maskClosable={!commandPending}
      title={workspaceTitle(workspace, t)}
      destroyOnHidden
    >
      <WorkspaceBody {...props} />
    </Drawer>
  );
}

function WorkspaceBody(props: Parameters<typeof MonitorDefinitionWorkspaceView>[0]) {
  const { t } = useTranslation();
  const workspace = props.workspace;
  if (workspace?.kind === 'loading') return <Skeleton active paragraph={{ rows: 10 }} />;
  if (workspace?.kind === 'error') {
    return (
      <Alert
        showIcon
        type="error"
        message={t(monitorDefinitionFailureMessageKey(workspace.failure))}
        action={<Button onClick={props.onRetry}>{t('common.retry')}</Button>}
      />
    );
  }
  if (workspace?.kind === 'view') return <DefinitionReadView workspace={workspace} />;
  if (workspace?.kind === 'edit') return <DefinitionEditor {...props} workspace={workspace} />;
  return null;
}

function DefinitionEditor(
  props: Parameters<typeof MonitorDefinitionWorkspaceView>[0] & {
    workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>;
  }
) {
  const { t } = useTranslation();
  const { workspace } = props;
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      {workspace.failure && (
        <Alert
          type="error"
          showIcon
          message={t(monitorDefinitionFailureMessageKey(workspace.failure))}
          action={
            workspace.failure === 'revision-conflict' ? (
              <Button onClick={props.onRefreshConflict}>{t('monitorDefinitions.refreshConflict')}</Button>
            ) : undefined
          }
        />
      )}
      {workspace.validation && (
        <Alert type="success" showIcon message={t('monitorDefinitions.validated', { app: workspace.validation.app })} />
      )}
      <label htmlFor="monitor-definition-yaml">{t('monitorDefinitions.definition')}</label>
      <Input.TextArea
        id="monitor-definition-yaml"
        className={styles.editor ?? ''}
        value={workspace.draft.definition}
        disabled={workspace.pending !== null}
        onChange={event => props.onChange(event.target.value)}
        autoSize={{ minRows: 18, maxRows: 30 }}
        spellCheck={false}
      />
      <Space wrap>
        <Button onClick={props.onCancel} disabled={workspace.pending !== null}>
          {t('common.cancel')}
        </Button>
        <Button onClick={props.onValidate} loading={workspace.pending === 'validate'}>
          {t('monitorDefinitions.validate')}
        </Button>
        <Button
          type="primary"
          onClick={props.onSave}
          loading={workspace.pending === 'save'}
          disabled={!workspace.draft.definition.trim()}
        >
          {t('common.save')}
        </Button>
      </Space>
    </Space>
  );
}

function DefinitionReadView({ workspace }: { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'view' }> }) {
  const { t } = useTranslation();
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      <Space wrap>
        <Tag>{t(`monitorDefinitions.originValue.${workspace.detail.origin}`)}</Tag>
        <Typography.Text code>{workspace.detail.revision}</Typography.Text>
      </Space>
      <pre className={styles.readOnly}>{workspace.detail.definition}</pre>
    </Space>
  );
}

function workspaceTitle(workspace: MonitorDefinitionWorkspace | null, t: TFunction) {
  if (!workspace) return '';
  if (workspace.kind === 'loading') return t('monitorDefinitions.loadingDetail');
  if (workspace.kind === 'error') return t('monitorDefinitions.loadFailedTitle');
  if (workspace.kind === 'view') return workspace.detail.label;
  return workspace.draft.mode === 'create'
    ? t('monitorDefinitions.create')
    : t('monitorDefinitions.editTitle', { app: workspace.draft.expectedApp });
}
