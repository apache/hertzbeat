/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BulletinFailureKind } from './bulletin-failure';
import type { BulletinDraft } from './bulletin-model';

export type BulletinCommand = 'idle' | 'saving' | 'deleting' | 'recovering';

type FailedProof = { failure: BulletinFailureKind };
export type BulletinRecoveryOperation = 'save' | 'delete';

/** Durable in-session evidence for the only safe continuation after a partial mutation. */
export type BulletinRecovery =
  | (FailedProof & { stage: 'create-proof'; draft: BulletinDraft; beforeIds: number[] })
  | (FailedProof & { stage: 'update-proof'; draft: BulletinDraft & { id: number } })
  | (FailedProof & { stage: 'delete-proof'; ids: number[]; batch: boolean })
  | (FailedProof & { stage: 'projection'; operation: BulletinRecoveryOperation });

export function bulletinRecoveryOperation(recovery: BulletinRecovery): BulletinRecoveryOperation {
  return recovery.stage === 'delete-proof' ? 'delete' : recovery.stage === 'projection' ? recovery.operation : 'save';
}
