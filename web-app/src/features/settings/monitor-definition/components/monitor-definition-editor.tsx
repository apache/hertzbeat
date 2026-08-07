/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Popconfirm, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import {
  YamlCodeEditor,
  type YamlCodeEditorHandle,
  type YamlEditorScrollPosition
} from '@/shared/yaml-editor/yaml-code-editor';

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
  // Comparison mode keeps both panes on the same YAML position. CodeMirror's
  // scroll mechanics stay behind the shared editor handle rather than leaking
  // DOM queries into this feature component.
  const currentEditorRef = useRef<YamlCodeEditorHandle>(null);
  const draftEditorRef = useRef<YamlCodeEditorHandle>(null);
  const syncCurrentEditor = (position: YamlEditorScrollPosition) =>
    currentEditorRef.current?.setScrollPosition(position);
  const syncDraftEditor = (position: YamlEditorScrollPosition) => draftEditorRef.current?.setScrollPosition(position);
  return (
    <Space direction="vertical" size="middle" className={styles.workspace ?? ''}>
      {authority ? (
        <>
          <MonitorDefinitionWorkspaceHeader
            title={authority.label}
            origin={authority.origin}
            className={styles.header ?? ''}
            actions={
              <>
                <Button href={buildMonitorListPath({ app: authority.app })}>{t('monitorDefinitions.monitors')}</Button>
                <Button
                  type="primary"
                  danger
                  disabled={!props.canWrite || !authority.deletable}
                  onClick={() => props.onDelete(authority)}
                >
                  {t('common.delete')}
                </Button>
              </>
            }
          />
        </>
      ) : (
        <Typography.Title level={4}>{editorTitle(workspace, t)}</Typography.Title>
      )}
      {workspace.failure && <EditorFailure {...props} workspace={workspace} />}
      {workspace.validation && (
        <Alert type="success" showIcon message={t('monitorDefinitions.validated', { app: workspace.validation.app })} />
      )}
      <div className={workspace.authority ? styles.editorGrid : styles.editorSingle}>
        {workspace.authority && (
          <YamlField
            editorRef={currentEditorRef}
            label={t('monitorDefinitions.authoritative')}
            value={workspace.authority.definition}
            readOnly
            onScrollPositionChange={syncDraftEditor}
          />
        )}
        <YamlField
          editorRef={draftEditorRef}
          label={t('monitorDefinitions.draft')}
          value={workspace.draft.definition}
          readOnly={workspace.pending !== null || workspace.writeRecovery !== null}
          onChange={props.onChange}
          {...(workspace.authority ? { onScrollPositionChange: syncCurrentEditor } : {})}
        />
      </div>
      <EditorActions {...props} workspace={workspace} />
    </Space>
  );
}

function YamlField({
  editorRef,
  label,
  value,
  readOnly,
  onChange,
  onScrollPositionChange
}: {
  editorRef: RefObject<YamlCodeEditorHandle | null>;
  label: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
  onScrollPositionChange?: (position: YamlEditorScrollPosition) => void;
}) {
  return (
    <div className={styles.editorPane}>
      <span className={styles.editorLabel}>{label}</span>
      <YamlCodeEditor
        ref={editorRef}
        ariaLabel={label}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        onScrollPositionChange={onScrollPositionChange}
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
