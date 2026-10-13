/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
