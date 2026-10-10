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

import { alertGroupFailureKind } from '../model/alert-group-model';
import type { AlertGroupEditor } from './use-alert-group-editor-controller';

export type AlertGroupNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  saveFailed: () => void;
  proofUnavailable: () => void;
  proofFailed: () => void;
  operationSuccess: () => void;
  operationFailed: () => void;
};

export type AlertGroupSubmitStage = 'preflight' | 'write' | 'create-proof';

export function reportAlertGroupSubmitFailure(
  reason: unknown,
  stage: AlertGroupSubmitStage,
  createAcknowledged: boolean,
  editor: AlertGroupEditor,
  notifications: AlertGroupNotifications
) {
  if (!createAcknowledged) {
    const failure = stage === 'write' ? classifyWriteFailure(reason) : classifyReadProofFailure(stage, reason);
    editor.setEditorFailure(failure);
    notifications.saveFailed();
    return;
  }
  const failure = alertGroupFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
  editor.setCreateProofFailure(failure);
  if (failure === 'unavailable') notifications.proofUnavailable();
  else notifications.proofFailed();
}

function classifyReadProofFailure(stage: AlertGroupSubmitStage, reason: unknown) {
  const failure = alertGroupFailureKind(reason);
  return stage === 'preflight' && failure === 'missing' ? 'error' : failure;
}

function classifyWriteFailure(reason: unknown) {
  return alertGroupFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
}
