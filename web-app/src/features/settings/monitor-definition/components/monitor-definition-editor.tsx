/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Popconfirm, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import { YamlDiffEditor, YamlEditor } from '@/shared/yaml-editor/yaml-editor';

import {
  monitorDefinitionCanRefreshAuthoritativeDraft,
  monitorDefinitionFailureMessageKey,
  monitorDefinitionWorkspaceIsDirty,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import styles from './monitor-definition-workspace.module.css';
import type { MonitorDefinitionWorkspaceProps } from './monitor-definition-workspace-contract';
import { MonitorDefinitionWorkspaceHeader } from './monitor-definition-workspace-header';

type EditorWorkspace = Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>;
type EditorProps = MonitorDefinitionWorkspaceProps & { workspace: EditorWorkspace };

export function MonitorDefinitionEditor(props: EditorProps) {
  const { t } = useTranslation();
  const { workspace } = props;
  const authority = workspace.authority;
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      {authority ? (
        <>
          <MonitorDefinitionWorkspaceHeader
            title={authority.label}
            origin={authority.origin}
            className={styles.header ?? ''}
            monitorListPath={buildMonitorListPath({ app: authority.app })}
            deleteDisabled={!props.canWrite || !authority.deletable}
            onDelete={() => props.onDelete(authority)}
          />
        </>
      ) : (
        <Typography.Title level={4}>{editorTitle(workspace, t)}</Typography.Title>
      )}
      {workspace.failure && <EditorFailure {...props} workspace={workspace} />}
      {workspace.validation && (
        <Alert type="success" showIcon message={t('monitorDefinitions.validated', { app: workspace.validation.app })} />
      )}
      {workspace.authority ? (
        <YamlComparison
          currentLabel={t('monitorDefinitions.authoritative')}
          currentValue={workspace.authority.definition}
          draftLabel={t('monitorDefinitions.draft')}
          draftValue={workspace.draft.definition}
          readOnly={workspace.pending !== null || workspace.writeRecovery !== null}
          onChange={props.onChange}
        />
      ) : (
        <YamlField
          label={t('monitorDefinitions.draft')}
          value={workspace.draft.definition}
          readOnly={workspace.pending !== null || workspace.writeRecovery !== null}
          onChange={props.onChange}
        />
      )}
      <EditorActions {...props} workspace={workspace} />
    </Space>
  );
}

function YamlComparison({
  currentLabel,
  currentValue,
  draftLabel,
  draftValue,
  readOnly,
  onChange
}: {
  currentLabel: string;
  currentValue: string;
  draftLabel: string;
  draftValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.editorPane}>
      <div className={styles.editorLabels} aria-hidden="true">
        <span className={styles.editorLabel}>{currentLabel}</span>
        <span className={styles.editorLabel}>{draftLabel}</span>
      </div>
      <YamlDiffEditor
        originalAriaLabel={currentLabel}
        modifiedAriaLabel={draftLabel}
        originalValue={currentValue}
        modifiedValue={draftValue}
        readOnly={readOnly}
        onChange={onChange}
        minHeight="clamp(320px, calc(100dvh - var(--hb-shell-header-height, 46px) - 280px), 620px)"
      />
    </div>
  );
}

function YamlField({
  label,
  value,
  readOnly,
  onChange
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className={styles.editorPane}>
      <span className={styles.editorLabel}>{label}</span>
      <YamlEditor
        ariaLabel={label}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        minHeight="clamp(320px, calc(100dvh - var(--hb-shell-header-height, 46px) - 280px), 620px)"
      />
    </div>
  );
}

function EditorFailure(props: EditorProps) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      message={t(monitorDefinitionFailureMessageKey(props.workspace.failure!))}
      action={definitionFailureAction(props.workspace, props, t)}
    />
  );
}

function definitionFailureAction(workspace: EditorWorkspace, props: MonitorDefinitionWorkspaceProps, t: TFunction) {
  if (workspace.writeRecovery === 'uncertain') {
    return (
      <Button loading={workspace.pending === 'proof'} onClick={props.onRetryCatalogProof}>
        {t('common.refresh')}
      </Button>
    );
  }
  if (monitorDefinitionCanRefreshAuthoritativeDraft(workspace)) {
    return <Button onClick={props.onRefreshAuthoritativeDraft}>{t('monitorDefinitions.refreshConflict')}</Button>;
  }
}

function EditorActions(props: EditorProps) {
  const { t } = useTranslation();
  const locked = props.workspace.pending !== null || props.workspace.writeRecovery !== null;
  const saveDisabled =
    !props.workspace.draft.definition.trim() || !monitorDefinitionWorkspaceIsDirty(props.workspace) || locked;
  const saveButton = (
    <Button
      type="primary"
      onClick={props.workspace.draft.mode === 'create' ? props.onSave : undefined}
      loading={props.workspace.pending === 'save'}
      disabled={saveDisabled}
    >
      {t('common.save')}
    </Button>
  );
  return (
    <Space wrap>
      <Button
        onClick={props.onCancel}
        disabled={Boolean(props.workspace.pending && props.workspace.pending !== 'proof')}
      >
        {t('common.cancel')}
      </Button>
      <Button onClick={props.onValidate} loading={props.workspace.pending === 'validate'} disabled={locked}>
        {t('monitorDefinitions.validate')}
      </Button>
      {props.workspace.draft.mode === 'update' ? (
        <Popconfirm
          title={t('monitorDefinitions.saveApplyConfirm', { app: props.workspace.draft.expectedApp })}
          okText={t('common.save')}
          cancelText={t('common.cancel')}
          onConfirm={props.onSave}
        >
          {saveButton}
        </Popconfirm>
      ) : (
        saveButton
      )}
    </Space>
  );
}

function editorTitle(workspace: EditorWorkspace, t: TFunction) {
  return workspace.draft.mode === 'create'
    ? t('monitorDefinitions.create')
    : t('monitorDefinitions.editTitle', { app: workspace.draft.expectedApp });
}
