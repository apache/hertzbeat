/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { saveAlertGroup } from '../alert-group-api';
import { alertGroupWriteOutcome, buildAlertGroupPayload, type AlertGroupDraft } from '../alert-group-model';
import { prepareAlertGroupCreateProof, proveAlertGroupCreated } from '../alert-group-write-proof';
import type { AlertGroupSubmitStage } from './alert-group-submit-failure';
import type { AlertGroupCommandGate, AlertGroupEditor } from './use-alert-group-editor-controller';

export async function submitAlertGroupCreate(
  draft: AlertGroupDraft,
  gate: AlertGroupCommandGate,
  editor: AlertGroupEditor,
  setStage: (stage: AlertGroupSubmitStage) => void,
  markAcknowledged: () => void
) {
  const proof = editor.createProof ?? (await prepareAlertGroupCreateProof(buildAlertGroupPayload(draft)));
  assertActiveCommandOwner(gate);
  if (!editor.createProof) {
    setStage('write');
    try {
      await saveAlertGroup(draft);
    } catch (reason) {
      assertActiveCommandOwner(gate);
      // A transport failure can arrive after the server commits a void POST.
      // Retain the proof owner so retry can only reread, never duplicate POST.
      if (createCommitMayBeAmbiguous(reason)) {
        editor.acknowledgeCreate(proof);
        markAcknowledged();
      }
      throw reason;
    }
    assertActiveCommandOwner(gate);
    editor.acknowledgeCreate(proof);
    markAcknowledged();
  }
  setStage('create-proof');
  await proveAlertGroupCreated(proof);
  assertActiveCommandOwner(gate);
}

function assertActiveCommandOwner(gate: AlertGroupCommandGate) {
  if (!gate.isOwnerAlive()) throw new AlertGroupCommandOwnerRetiredError();
}

class AlertGroupCommandOwnerRetiredError extends Error {}

function createCommitMayBeAmbiguous(reason: unknown) {
  return alertGroupWriteOutcome(reason) === 'uncertain';
}
