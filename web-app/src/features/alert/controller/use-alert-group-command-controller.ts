/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import { validateAlertGroupDraft, type AlertGroupConverge, type AlertGroupPage } from '../alert-group-model';
import { submitAlertGroupCreate } from './alert-group-submit-command';
import {
  reportAlertGroupSubmitFailure,
  type AlertGroupNotifications,
  type AlertGroupSubmitStage
} from './alert-group-submit-failure';
import {
  removeAlertGroup,
  retryAlertGroupOperation,
  toggleAlertGroup,
  updateAlertGroup,
  type AlertGroupWriteContext
} from './alert-group-write-operations';
import { useAlertGroupCommandGate, useAlertGroupEditor } from './use-alert-group-editor-controller';

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
  const context: AlertGroupWriteContext = { rereadList, gate, editor, notifications };
  const submit = useAlertGroupSubmit(context);

  return {
    state: {
      command: gate.command,
      detail: editor.detail,
      draft: editor.draft,
      editorFailure: editor.editorFailure,
      createAcknowledged: editor.createAcknowledged,
      createProofFailure: editor.createProofFailure,
      recovery: gate.recovery
    },
    actions: {
      ...editor.actions,
      submit,
      toggle: (group: AlertGroupConverge, enable: boolean) => toggleAlertGroup(context, group, enable),
      remove: (id: number) => removeAlertGroup(context, id),
      retry: () => retryAlertGroupOperation(context)
    }
  };
}

function useAlertGroupSubmit(context: AlertGroupWriteContext) {
  const submit = async () => {
    const { editor, gate, notifications, rereadList } = context;
    const draft = editor.draft;
    if (!draft || validateAlertGroupDraft(draft).length > 0) {
      notifications.validation();
      return;
    }
    if (draft.id !== undefined) {
      await updateAlertGroup(context, { ...draft, id: draft.id });
      return;
    }
    if (!gate.begin('saving')) return;
    editor.invalidateDetail();
    editor.setEditorFailure(undefined);
    editor.setCreateProofFailure(undefined);
    let stage: AlertGroupSubmitStage = 'preflight';
    let createAcknowledged = editor.createProof !== null;
    const setStage = (next: AlertGroupSubmitStage) => {
      stage = next;
    };
    const acknowledgeCreate = () => {
      createAcknowledged = true;
    };
    try {
      await submitAlertGroupCreate(draft, gate, editor, setStage, acknowledgeCreate);
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
