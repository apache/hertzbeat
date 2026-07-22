/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
