/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  captureBulletinCreateBaseline,
  createBulletin,
  deleteBulletin,
  proveBulletinCreated,
  proveBulletinDeleted,
  proveBulletinUpdated,
  updateBulletin
} from '../api/bulletin-api';
import { classifyBulletinFailure, isBulletinWriteRejection } from '../model/bulletin-failure';
import type { Bulletin, BulletinDraft } from '../model/bulletin-model';
import type { BulletinRecovery } from '../model/bulletin-operation-state';
import type { BulletinOperationGate, BulletinOperationOwner } from './bulletin-editor-controller';

export type BulletinProofResult = { operation: 'save'; saved: Bulletin } | { operation: 'delete'; id: number };

export async function saveBulletinWithProof(
  draft: BulletinDraft,
  gate: BulletinOperationGate,
  owner: BulletinOperationOwner
): Promise<Bulletin | null> {
  return draft.id == null
    ? createWithProof(copyDraft(draft), gate, owner)
    : updateWithProof(copyUpdate(draft), gate, owner);
}

export async function deleteBulletinWithProof(id: number, gate: BulletinOperationGate, owner: BulletinOperationOwner) {
  // Retain the exact identity before DELETE so every later continuation is GET-only.
  const recovery: BulletinRecovery = { stage: 'delete-proof', id, failure: 'error' };
  if (!gate.setRecovery(owner, recovery)) return false;
  try {
    await deleteBulletin(id);
  } catch (reason) {
    if (isBulletinWriteRejection(reason)) {
      gate.clearRecovery(owner);
      throw reason;
    }
  }
  if (!gate.isCurrent(owner)) return false;
  await proveDelete(recovery, gate, owner);
  return gate.isCurrent(owner);
}

export async function retryBulletinProof(
  recovery: Exclude<BulletinRecovery, { stage: 'projection' }>,
  gate: BulletinOperationGate,
  owner: BulletinOperationOwner
): Promise<BulletinProofResult | null> {
  if (recovery.stage === 'delete-proof') {
    await proveDelete(recovery, gate, owner);
    return gate.isCurrent(owner) ? { operation: 'delete', id: recovery.id } : null;
  }
  const saved = await proveSave(recovery, gate, owner);
  return gate.isCurrent(owner) ? { operation: 'save', saved } : null;
}

async function createWithProof(draft: BulletinDraft, gate: BulletinOperationGate, owner: BulletinOperationOwner) {
  // Capture the identity baseline before issuing POST. If this read fails,
  // no mutation started and there is no ambiguous receipt to recover.
  const beforeIds = await captureBulletinCreateBaseline(draft.name);
  if (!gate.isCurrent(owner)) return null;
  const recovery: BulletinRecovery = { stage: 'create-proof', draft, beforeIds: [...beforeIds], failure: 'error' };
  if (!gate.setRecovery(owner, recovery)) return null;
  try {
    await createBulletin(draft);
  } catch (reason) {
    if (isBulletinWriteRejection(reason)) {
      gate.clearRecovery(owner);
      throw reason;
    }
  }
  if (!gate.isCurrent(owner)) return null;
  return proveSave(recovery, gate, owner);
}

async function updateWithProof(
  draft: BulletinDraft & { id: number },
  gate: BulletinOperationGate,
  owner: BulletinOperationOwner
) {
  // Retain the submitted identity before PUT; an ambiguous response must not reopen PUT.
  const recovery: BulletinRecovery = { stage: 'update-proof', draft, failure: 'error' };
  if (!gate.setRecovery(owner, recovery)) return null;
  try {
    await updateBulletin(draft);
  } catch (reason) {
    if (isBulletinWriteRejection(reason)) {
      gate.clearRecovery(owner);
      throw reason;
    }
  }
  if (!gate.isCurrent(owner)) return null;
  return proveSave(recovery, gate, owner);
}

async function proveSave(
  recovery: Extract<BulletinRecovery, { stage: 'create-proof' | 'update-proof' }>,
  gate: BulletinOperationGate,
  owner: BulletinOperationOwner
) {
  try {
    const saved =
      recovery.stage === 'create-proof'
        ? await proveBulletinCreated(recovery.draft, recovery.beforeIds)
        : await proveBulletinUpdated(recovery.draft);
    gate.clearRecovery(owner);
    return saved;
  } catch (reason) {
    gate.setRecovery(owner, { ...recovery, failure: classifyBulletinFailure(reason) });
    throw reason;
  }
}

async function proveDelete(
  recovery: Extract<BulletinRecovery, { stage: 'delete-proof' }>,
  gate: BulletinOperationGate,
  owner: BulletinOperationOwner
) {
  try {
    await proveBulletinDeleted(recovery.id);
    gate.clearRecovery(owner);
  } catch (reason) {
    gate.setRecovery(owner, { ...recovery, failure: classifyBulletinFailure(reason) });
    throw reason;
  }
}

function copyDraft(draft: BulletinDraft): BulletinDraft {
  return {
    ...(draft.id == null ? {} : { id: draft.id }),
    name: draft.name,
    app: draft.app,
    monitorIds: [...draft.monitorIds],
    fields: Object.fromEntries(Object.entries(draft.fields).map(([metric, fields]) => [metric, [...fields]]))
  };
}

function copyUpdate(draft: BulletinDraft): BulletinDraft & { id: number } {
  const copy = copyDraft(draft);
  if (copy.id == null) throw new Error('Bulletin update identity is missing');
  return { ...copy, id: copy.id };
}
