/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertInhibit, AlertInhibitPage } from '../model/alert-inhibit-model';
import {
  removeAlertInhibit,
  retryAlertInhibit,
  submitAlertInhibit,
  toggleAlertInhibit,
  type AlertInhibitWriteContext
} from './alert-inhibit-write-operations';
import { useAlertInhibitEditorController } from './use-alert-inhibit-editor-controller';
import { useAlertInhibitOperationController } from './use-alert-inhibit-operation-controller';

export function useAlertInhibitCommandController(rereadAuthoritatively: () => Promise<AlertInhibitPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const operation = useAlertInhibitOperationController();
  const editor = useAlertInhibitEditorController(operation);
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
      recovery: operation.getRecovery(),
      ...editor.state
    },
    controls: {
      isLocked: operation.isLocked
    },
    actions: {
      ...editor.actions,
      remove: (id: number) => removeAlertInhibit(context, id),
      retry: () => retryAlertInhibit(context),
      submit: () => submitAlertInhibit(context),
      toggle: (inhibit: AlertInhibit, enable: boolean) => toggleAlertInhibit(context, inhibit, enable)
    }
  };
}
