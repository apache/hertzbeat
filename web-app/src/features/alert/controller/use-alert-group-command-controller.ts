/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import { deleteAlertGroup, loadAlertGroup, updateAlertGroupEnabled } from '../alert-group-api';
import {
  AlertGroupContractError,
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
import { submitAlertGroupCreate, submitAlertGroupUpdate } from './alert-group-submit-command';
import {
  reportAlertGroupSubmitFailure,
  type AlertGroupNotifications,
  type AlertGroupSubmitStage
} from './alert-group-submit-failure';
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
    proofUnavailable: () => void message.warning(t('common.unavailable')),
    proofFailed: () => void message.error(t('common.routeError.description')),
    operationSuccess: () => void message.success(t('alertGroups.operationSuccess')),
    operationFailed: () => void message.error(t('alertGroups.operationFailed'))
  };
  const submit = useAlertGroupSubmit(rereadList, gate, editor, notifications);
  const operations = useAlertGroupOperations(rereadList, gate, editor, notifications);

  return {
    state: {
      command: gate.command,
      detail: editor.detail,
      draft: editor.draft,
      editorFailure: editor.editorFailure,
      createAcknowledged: editor.createAcknowledged,
      createProofFailure: editor.createProofFailure
    },
    actions: { ...editor.actions, submit, ...operations }
  };
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
    editor.setCreateProofFailure(undefined);
    let stage: AlertGroupSubmitStage = draft.id === undefined ? 'preflight' : 'write';
    let createAcknowledged = editor.createProof !== null;
    const setStage = (next: AlertGroupSubmitStage) => {
      stage = next;
    };
    const acknowledgeCreate = () => {
      createAcknowledged = true;
    };
    try {
      if (draft.id !== undefined) {
        await submitAlertGroupUpdate({ ...draft, id: draft.id }, gate, setStage);
      } else {
        await submitAlertGroupCreate(draft, gate, editor, setStage, acknowledgeCreate);
      }
      editor.setDraft(null);
      editor.clearCreateProof();
      notifications.saveSuccess();
      await refreshAlertGroupProjection(rereadList);
    } catch (reason) {
      if (!gate.isOwnerAlive()) return;
      reportAlertGroupSubmitFailure(reason, stage, createAcknowledged, editor, notifications);
    } finally {
      gate.end();
    }
  };
  return submit;
}

async function refreshAlertGroupProjection(rereadList: () => Promise<AlertGroupPage>) {
  try {
    await rereadList();
  } catch {
    // Canonical proof already completed; the list query owns this projection failure.
  }
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
      if (!gate.isOwnerAlive()) return;
      requireExactAlertGroupId(current.id, group.id);
      await updateAlertGroupEnabled(current, enable);
      if (!gate.isOwnerAlive()) return;
      const canonical = await loadAlertGroup(group.id);
      if (!gate.isOwnerAlive()) return;
      requireExactAlertGroupId(canonical.id, group.id);
      requireAlertGroupConvergence(canonical, buildAlertGroupTogglePayload(current, enable));
      await rereadList();
      if (!gate.isOwnerAlive()) return;
      notifications.operationSuccess();
    } catch {
      if (gate.isOwnerAlive()) notifications.operationFailed();
    } finally {
      gate.end();
    }
  };
  const remove = async (id: number) => {
    if (!gate.begin('operating')) return;
    editor.invalidateDetail();
    try {
      await deleteAlertGroup(id);
      if (!gate.isOwnerAlive()) return;
      await proveAlertGroupMissing(id);
      if (!gate.isOwnerAlive()) return;
      const canonical = await rereadList();
      if (!gate.isOwnerAlive()) return;
      if (canonical.content.some(record => record.id === id)) {
        throw new AlertGroupContractError('deleted id remains');
      }
      notifications.operationSuccess();
    } catch {
      if (gate.isOwnerAlive()) notifications.operationFailed();
    } finally {
      gate.end();
    }
  };
  return { toggle, remove };
}
