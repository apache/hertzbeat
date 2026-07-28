/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import { canRetryAlertInhibitRecovery } from '../model/alert-inhibit-recovery-capability';
import type { AlertInhibit, AlertInhibitManagementContext, AlertInhibitPage } from '../model/alert-inhibit-model';
import {
  removeAlertInhibit,
  removeAlertInhibits,
  retryAlertInhibit,
  submitAlertInhibit,
  toggleAlertInhibit,
  type AlertInhibitWriteContext
} from './alert-inhibit-write-operations';
import { useAlertInhibitEditorController } from './use-alert-inhibit-editor-controller';
import { useAlertInhibitOperationController } from './use-alert-inhibit-operation-controller';
import { useAlertInhibitPrefillController } from './use-alert-inhibit-prefill-controller';

export function useAlertInhibitCommandController(
  rereadAuthoritatively: () => Promise<AlertInhibitPage>,
  management: AlertInhibitManagementContext | null = null,
  capabilities: AlertActionCapabilities = { canWrite: false, canDelete: false }
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const operation = useAlertInhibitOperationController();
  const editor = useAlertInhibitEditorController(operation);
  const prefill = useAlertInhibitPrefillController(management, editor, operation);
  useAlertInhibitRoleLossRetirement(capabilities.canWrite, prefill.retire, editor.controls.retire);
  const notify = {
    validation: () => void message.warning(t('alertInhibits.validation')),
    saveSuccess: () => void message.success(t('alertInhibits.saveSuccess')),
    saveFailure: (kind: 'unavailable' | 'error') =>
      void message.error(t(kind === 'unavailable' ? 'common.unavailable' : 'alertInhibits.saveFailed')),
    operationSuccess: () => void message.success(t('alertInhibits.operationSuccess')),
    operationFailure: (kind: 'unavailable' | 'error') =>
      void message.error(t(kind === 'unavailable' ? 'common.unavailable' : 'alertInhibits.operationFailed'))
  };
  const context: AlertInhibitWriteContext = {
    editor,
    operation,
    notify,
    reread: rereadAuthoritatively
  };
  return {
    state: {
      command: operation.command,
      prefill: prefill.state,
      recovery: operation.getRecovery(),
      ...editor.state
    },
    controls: {
      isLocked: operation.isLocked
    },
    actions: {
      closeDraft: () => {
        if (capabilities.canWrite) editor.actions.closeDraft();
      },
      create: () => {
        if (capabilities.canWrite) prefill.create();
      },
      edit: (id: number) => (capabilities.canWrite ? editor.actions.edit(id) : Promise.resolve()),
      remove: (id: number) => (capabilities.canDelete ? removeAlertInhibit(context, id) : Promise.resolve()),
      removeMany: (ids: number[]) => (capabilities.canDelete ? removeAlertInhibits(context, ids) : Promise.resolve()),
      retry: () =>
        canRetryAlertInhibitRecovery(operation.getRecovery(), capabilities)
          ? retryAlertInhibit(context)
          : Promise.resolve(),
      retryDetail: () => (capabilities.canWrite ? editor.actions.retryDetail() : Promise.resolve()),
      submit: () => (capabilities.canWrite ? submitAlertInhibit(context) : Promise.resolve()),
      toggle: (inhibit: AlertInhibit, enable: boolean) =>
        capabilities.canWrite ? toggleAlertInhibit(context, inhibit, enable) : Promise.resolve(),
      updateDraft: (patch: Parameters<typeof editor.actions.updateDraft>[0]) => {
        if (capabilities.canWrite) editor.actions.updateDraft(patch);
      }
    }
  };
}

function useAlertInhibitRoleLossRetirement(canWrite: boolean, retirePrefill: () => void, retireEditor: () => void) {
  const previousCanWriteRef = useRef(canWrite);
  useEffect(() => {
    const lostWriteAccess = previousCanWriteRef.current && !canWrite;
    previousCanWriteRef.current = canWrite;
    if (!lostWriteAccess) return;
    retirePrefill();
    retireEditor();
  }, [canWrite, retireEditor, retirePrefill]);
}
