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

export type BulletinOutcomeNotice =
  | {
      kind: 'proof-stopped';
      operation: 'save';
      stage: 'create-proof';
      draft: Readonly<BulletinDraft>;
      beforeIds: readonly number[];
    }
  | {
      kind: 'proof-stopped';
      operation: 'save';
      stage: 'update-proof';
      draft: Readonly<BulletinDraft & { id: number }>;
    }
  | {
      kind: 'proof-stopped';
      operation: 'delete';
      stage: 'delete-proof';
      ids: readonly number[];
      batch: boolean;
      count: number;
    }
  | {
      kind: 'projection-stopped';
      operation: BulletinRecoveryOperation;
      mutation: 'confirmed';
      projection: 'stale';
    };

export function bulletinRecoveryOperation(recovery: BulletinRecovery): BulletinRecoveryOperation {
  return recovery.stage === 'delete-proof' ? 'delete' : recovery.stage === 'projection' ? recovery.operation : 'save';
}

export function createBulletinOutcomeNotice(recovery: BulletinRecovery): BulletinOutcomeNotice {
  if (recovery.stage === 'projection') {
    return Object.freeze({
      kind: 'projection-stopped',
      operation: recovery.operation,
      mutation: 'confirmed',
      projection: 'stale'
    });
  }
  if (recovery.stage === 'delete-proof') {
    const ids = Object.freeze([...recovery.ids]);
    return Object.freeze({
      kind: 'proof-stopped',
      operation: 'delete',
      stage: recovery.stage,
      ids,
      batch: recovery.batch,
      count: ids.length
    });
  }
  if (recovery.stage === 'create-proof') {
    return Object.freeze({
      kind: 'proof-stopped',
      operation: 'save',
      stage: recovery.stage,
      draft: freezeDraft(recovery.draft),
      beforeIds: Object.freeze([...recovery.beforeIds])
    });
  }
  return Object.freeze({
    kind: 'proof-stopped',
    operation: 'save',
    stage: recovery.stage,
    draft: freezeDraft(recovery.draft)
  });
}

function freezeDraft<T extends BulletinDraft>(draft: T): Readonly<T> {
  const fields = Object.freeze(
    Object.fromEntries(Object.entries(draft.fields).map(([metric, values]) => [metric, Object.freeze([...values])]))
  );
  return Object.freeze({ ...draft, monitorIds: Object.freeze([...draft.monitorIds]), fields });
}
