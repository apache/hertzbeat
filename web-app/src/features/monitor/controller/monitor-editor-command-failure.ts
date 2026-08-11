/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { classifyMonitorEditorCommandFailure, monitorEditorBackendDiagnostic } from '../api/monitor-editor-api-failure';
import type { MonitorEditorCommandInput } from './monitor-editor-command-model';
import { isCurrentMonitorEditorOperation, type MonitorEditorActiveOperation } from './monitor-editor-command-operation';

export function failMonitorCommand(
  action: 'detect' | 'save',
  error: unknown,
  input: MonitorEditorCommandInput,
  current: MonitorEditorActiveOperation | null,
  active: MonitorEditorActiveOperation
) {
  if (!isCurrentMonitorEditorOperation(current, active) || active.controller.signal.aborted) return null;
  if (action === 'save' && isUncertainMonitorSave(error)) {
    void input.message.warning(input.text.saveUnknown);
    return 'save-unknown' as const;
  }
  const diagnostic = action === 'detect' ? monitorEditorBackendDiagnostic(error) : undefined;
  void input.message.error(
    action === 'save'
      ? input.text.saveFailed
      : diagnostic
        ? `${input.text.detectFailed}: ${diagnostic}`
        : input.text.detectFailed
  );
  return {
    kind: 'failure' as const,
    action,
    failure: classifyMonitorEditorCommandFailure(error),
    ...(diagnostic ? { diagnostic } : {})
  };
}

function isUncertainMonitorSave(error: unknown) {
  return error instanceof ApiMessageError && apiMessageWriteOutcome(error) === 'uncertain';
}
