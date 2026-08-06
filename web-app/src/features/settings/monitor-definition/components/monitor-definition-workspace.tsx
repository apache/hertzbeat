/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Skeleton, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

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
  type MonitorDefinitionCatalogItem,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import styles from './monitor-definition-workspace.module.css';
import {
  MonitorDefinitionWorkspaceGuidance,
  MonitorDefinitionWorkspaceHeader
} from './monitor-definition-workspace-header';

type WorkspaceProps = {
  canWrite: boolean;
  workspace: MonitorDefinitionWorkspace | null;
  onCancel: () => void;
  onChange: (value: string) => void;
  onDelete: (item: MonitorDefinitionCatalogItem) => void;
  onRefreshAuthoritativeDraft: () => void;
  onRetryCatalogProof: () => void;
  onRetry: () => void;
  onSave: () => void;
  onValidate: () => void;
};

export function MonitorDefinitionWorkspaceView(props: WorkspaceProps) {
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
  return <DefinitionEditor {...props} workspace={props.workspace} />;
}

function DefinitionReadView(
  props: WorkspaceProps & { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'view' }> }
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

function DefinitionEditor(
  props: WorkspaceProps & { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }> }
) {
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
            app={authority.app}
            origin={authority.origin}
            className={styles.header ?? ''}
          />
          <Space wrap>
            <Link to={buildMonitorListPath({ app: authority.app })}>{t('monitorDefinitions.monitors')}</Link>
            <Button danger disabled={!props.canWrite || !authority.deletable} onClick={() => props.onDelete(authority)}>
              {t('common.delete')}
            </Button>
          </Space>
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
          onScrollPositionChange={workspace.authority ? syncCurrentEditor : undefined}
        />
      </div>
      <EditorActions {...props} workspace={workspace} />
    </Space>
  );
}

function YamlField(props: {
  editorRef: RefObject<YamlCodeEditorHandle | null>;
  label: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
  onScrollPositionChange?: (position: YamlEditorScrollPosition) => void;
}) {
  return (
    <div className={styles.editorPane}>
      <span className={styles.editorLabel}>{props.label}</span>
      <YamlCodeEditor
        ref={props.editorRef}
        ariaLabel={props.label}
        value={props.value}
        readOnly={props.readOnly}
        onChange={props.onChange}
        onScrollPositionChange={props.onScrollPositionChange}
        minHeight="clamp(320px, calc(100dvh - var(--hb-shell-header-height, 46px) - 280px), 620px)"
      />
    </div>
  );
}

function EditorFailure(props: WorkspaceProps & { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }> }) {
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

function definitionFailureAction(
  workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>,
  props: WorkspaceProps,
  t: TFunction
) {
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

function EditorActions(props: WorkspaceProps & { workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }> }) {
  const { t } = useTranslation();
  const locked = props.workspace.pending !== null || props.workspace.writeRecovery !== null;
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
      <Button
        type="primary"
        onClick={props.onSave}
        loading={props.workspace.pending === 'save'}
        disabled={
          !props.workspace.draft.definition.trim() || !monitorDefinitionWorkspaceIsDirty(props.workspace) || locked
        }
      >
        {t('common.save')}
      </Button>
    </Space>
  );
}

function editorTitle(workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>, t: TFunction) {
  return workspace.draft.mode === 'create'
    ? t('monitorDefinitions.create')
    : t('monitorDefinitions.editTitle', { app: workspace.draft.expectedApp });
}
