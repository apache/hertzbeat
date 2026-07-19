/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  classifyAlertGroupReadError,
  classifyAlertGroupWriteError,
  deleteAlertGroup,
  loadAlertGroup,
  saveAlertGroup,
  updateAlertGroupEnabled
} from '../alert-group-api';
import {
  AlertGroupContractError,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  validateAlertGroupDraft,
  type AlertGroupConverge,
  type AlertGroupPage
} from '../alert-group-model';
import {
  proveAlertGroupMissing,
  requireAlertGroupConvergence,
  requireExactAlertGroupId
} from '../alert-group-write-proof';
import {
  useAlertGroupCommandGate,
  useAlertGroupEditor,
  type AlertGroupCommandGate,
  type AlertGroupEditor
} from './use-alert-group-editor-controller';

export function useAlertGroupCommandController(rereadList: () => Promise<AlertGroupPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const gate = useAlertGroupCommandGate();
  const editor = useAlertGroupEditor(gate);
  const notifications: AlertGroupNotifications = {
    validation: () => void message.warning(t('alertGroups.validation')),
    saveSuccess: () => void message.success(t('alertGroups.saveSuccess')),
    saveFailed: () => void message.error(t('alertGroups.saveFailed')),
    operationSuccess: () => void message.success(t('alertGroups.operationSuccess')),
    operationFailed: () => void message.error(t('alertGroups.operationFailed'))
  };
  const submit = useAlertGroupSubmit(rereadList, gate, editor, notifications);
  const operations = useAlertGroupOperations(rereadList, gate, editor, notifications);

  return {
    state: { command: gate.command, detail: editor.detail, draft: editor.draft, editorFailure: editor.editorFailure },
    actions: { ...editor.actions, submit, ...operations }
  };
}

type AlertGroupNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  saveFailed: () => void;
  operationSuccess: () => void;
  operationFailed: () => void;
};
type AlertGroupSubmitStage = 'write' | 'detail-proof' | 'list-proof';

function classifyAlertGroupSubmitFailure(stage: AlertGroupSubmitStage, reason: unknown) {
  if (stage === 'detail-proof') return classifyAlertGroupReadError(reason);
  return classifyAlertGroupWriteError(reason);
}

function useAlertGroupSubmit(
  rereadList: () => Promise<AlertGroupPage>,
  gate: AlertGroupCommandGate,
  editor: AlertGroupEditor,
  notifications: AlertGroupNotifications
) {
  const submit = async () => {
    const draft = editor.draft;
    if (!draft || validateAlertGroupDraft(draft).length > 0) {
      notifications.validation();
      return;
    }
    if (!gate.begin('saving')) return;
    editor.invalidateDetail();
    editor.setEditorFailure(undefined);
    let stage: AlertGroupSubmitStage = 'write';
    try {
      await saveAlertGroup(draft);
      if (draft.id !== undefined) {
        stage = 'detail-proof';
        const canonical = await loadAlertGroup(draft.id);
        requireAlertGroupConvergence(canonical, { ...buildAlertGroupPayload(draft), id: draft.id });
      }
      stage = 'list-proof';
      await rereadList();
      editor.setDraft(null);
      notifications.saveSuccess();
    } catch (reason) {
      editor.setEditorFailure(classifyAlertGroupSubmitFailure(stage, reason));
      notifications.saveFailed();
    } finally {
      gate.end();
    }
  };
  return submit;
}

function useAlertGroupOperations(
  rereadList: () => Promise<AlertGroupPage>,
  gate: AlertGroupCommandGate,
  editor: AlertGroupEditor,
  notifications: AlertGroupNotifications
) {
  const toggle = async (group: AlertGroupConverge, enable: boolean) => {
    if (!gate.begin('operating')) return;
    editor.invalidateDetail();
    try {
      const current = await loadAlertGroup(group.id);
      requireExactAlertGroupId(current.id, group.id);
      await updateAlertGroupEnabled(current, enable);
      const canonical = await loadAlertGroup(group.id);
      requireExactAlertGroupId(canonical.id, group.id);
      requireAlertGroupConvergence(canonical, buildAlertGroupTogglePayload(current, enable));
      await rereadList();
      notifications.operationSuccess();
    } catch {
      notifications.operationFailed();
    } finally {
      gate.end();
    }
  };
  const remove = async (id: number) => {
    if (!gate.begin('operating')) return;
    editor.invalidateDetail();
    try {
      await deleteAlertGroup(id);
      await proveAlertGroupMissing(id);
      const canonical = await rereadList();
      if (canonical.content.some(record => record.id === id)) {
        throw new AlertGroupContractError('deleted id remains');
      }
      notifications.operationSuccess();
    } catch {
      notifications.operationFailed();
    } finally {
      gate.end();
    }
  };
  return { toggle, remove };
}
