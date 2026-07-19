/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  classifyAlertInhibitWriteError,
  deleteAlertInhibit,
  saveAlertInhibit,
  updateAlertInhibitEnabled
} from '../alert-inhibit-api';
import {
  buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload,
  validateAlertInhibitDraft,
  type AlertInhibit,
  type AlertInhibitDraft,
  type AlertInhibitPage
} from '../alert-inhibit-model';
import {
  loadExactAlertInhibit,
  proveAlertInhibitMissing,
  requireAlertInhibitAbsent,
  requireAlertInhibitConvergence
} from '../alert-inhibit-write-proof';
import {
  useAlertInhibitEditorController,
  useAlertInhibitOperationGate,
  type AlertInhibitEditorController,
  type AlertInhibitOperationGate
} from './use-alert-inhibit-editor-controller';

export function useAlertInhibitCommandController(rereadAuthoritatively: () => Promise<AlertInhibitPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const gate = useAlertInhibitOperationGate();
  const editor = useAlertInhibitEditorController(gate);
  const notify = {
    validation: () => {
      void message.warning(t('alertInhibits.validation'));
    },
    saveSuccess: () => {
      void message.success(t('alertInhibits.saveSuccess'));
    },
    saveFailure: () => {
      void message.error(t('alertInhibits.saveFailed'));
    },
    operationSuccess: () => {
      void message.success(t('alertInhibits.operationSuccess'));
    },
    operationFailure: () => {
      void message.error(t('alertInhibits.operationFailed'));
    }
  };
  const context = { editor, gate, notify, rereadAuthoritatively };
  return {
    state: { command: gate.command, ...editor.state },
    actions: {
      ...editor.actions,
      submit: () => submitAlertInhibit(context, editor.controls.getDraft()),
      toggle: (inhibit: AlertInhibit, enable: boolean) => toggleAlertInhibit(context, inhibit, enable),
      remove: (id: number) => removeAlertInhibit(context, id)
    }
  };
}

type Notifications = {
  validation: () => void;
  saveSuccess: () => void;
  saveFailure: () => void;
  operationSuccess: () => void;
  operationFailure: () => void;
};

type CommandContext = {
  editor: AlertInhibitEditorController;
  gate: AlertInhibitOperationGate;
  notify: Notifications;
  rereadAuthoritatively: () => Promise<AlertInhibitPage>;
};

async function submitAlertInhibit(context: CommandContext, draft: AlertInhibitDraft | null) {
  if (!draft || validateAlertInhibitDraft(draft).length > 0) {
    context.notify.validation();
    return;
  }
  const owner = context.gate.begin('saving');
  if (!owner) return;
  context.editor.controls.invalidateDetail();
  context.editor.controls.setEditorFailure(undefined);
  try {
    await saveAlertInhibit(draft);
    if (!context.gate.isCurrent(owner)) return;
    if (draft.id !== undefined) {
      const canonical = await loadExactAlertInhibit(draft.id);
      if (!context.gate.isCurrent(owner)) return;
      requireAlertInhibitConvergence(canonical, { ...buildAlertInhibitPayload(draft), id: draft.id });
    }
    await context.rereadAuthoritatively();
    if (!context.gate.isCurrent(owner)) return;
    context.editor.controls.setDraft(null);
    context.notify.saveSuccess();
  } catch (reason) {
    if (!context.gate.isCurrent(owner)) return;
    context.editor.controls.setEditorFailure(classifyAlertInhibitWriteError(reason));
    context.notify.saveFailure();
  } finally {
    context.gate.end(owner);
  }
}

async function toggleAlertInhibit(context: CommandContext, inhibit: AlertInhibit, enable: boolean) {
  const owner = context.gate.begin('operating');
  if (!owner) return;
  context.editor.controls.invalidateDetail();
  try {
    const fresh = await loadExactAlertInhibit(inhibit.id);
    if (!context.gate.isCurrent(owner)) return;
    await updateAlertInhibitEnabled(fresh, enable);
    if (!context.gate.isCurrent(owner)) return;
    const canonical = await loadExactAlertInhibit(inhibit.id);
    if (!context.gate.isCurrent(owner)) return;
    requireAlertInhibitConvergence(canonical, buildAlertInhibitTogglePayload(fresh, enable));
    await context.rereadAuthoritatively();
    if (!context.gate.isCurrent(owner)) return;
    context.notify.operationSuccess();
  } catch {
    if (!context.gate.isCurrent(owner)) return;
    context.notify.operationFailure();
  } finally {
    context.gate.end(owner);
  }
}

async function removeAlertInhibit(context: CommandContext, id: number) {
  const owner = context.gate.begin('operating');
  if (!owner) return;
  context.editor.controls.invalidateDetail();
  try {
    await deleteAlertInhibit(id);
    if (!context.gate.isCurrent(owner)) return;
    await proveAlertInhibitMissing(id);
    if (!context.gate.isCurrent(owner)) return;
    requireAlertInhibitAbsent(await context.rereadAuthoritatively(), id);
    if (!context.gate.isCurrent(owner)) return;
    context.notify.operationSuccess();
  } catch {
    if (!context.gate.isCurrent(owner)) return;
    context.notify.operationFailure();
  } finally {
    context.gate.end(owner);
  }
}
