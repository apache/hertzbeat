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

import { useRef, useState } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

export type StatusOperationOwner = NonNullable<ReturnType<ExclusiveOperation['begin']>>;

export function useStatusOperationScope(command: ExclusiveOperation) {
  const activeOwner = useRef<StatusOperationOwner | undefined>(undefined);
  const scopedCommand: ExclusiveOperation = {
    ...command,
    begin: () => {
      const owner = command.begin();
      if (owner) activeOwner.current = owner;
      return owner;
    },
    end: owner => {
      if (activeOwner.current === owner) activeOwner.current = undefined;
      command.end(owner);
    }
  };
  return {
    command: scopedCommand,
    retire: () => {
      const owner = activeOwner.current;
      if (!owner) return false;
      activeOwner.current = undefined;
      return command.retire(owner);
    }
  };
}

/** Freezes the submitted payload so Retry can prove the original write without issuing it again. */
export type StatusWriteReceipt<T> =
  | { kind: 'create'; value: T; editorEpoch: number; owner: StatusOperationOwner }
  | { kind: 'update'; value: T; editorEpoch: number; owner: StatusOperationOwner };

export type StatusWriteRecovery<T> = {
  stage: 'proof' | 'commit-uncertain';
  receipt: StatusWriteReceipt<T>;
};

export type StatusDeleteReceipt = {
  id: number;
  owner: StatusOperationOwner;
};

export function useStatusWriteRecovery<T>(command: ExclusiveOperation) {
  const operation = useStatusOperationScope(command);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<'proof' | 'commit-uncertain'>();
  const recovery = useRef<StatusWriteRecovery<T> | undefined>(undefined);
  const proofPending = useRef(false);
  return {
    context: {
      command: operation.command,
      recovery,
      recoveryProofPending: proofPending,
      setSaving,
      setWriteRecovery: setStage
    },
    saving,
    stage,
    retire: () => {
      operation.retire();
      recovery.current = undefined;
      proofPending.current = false;
      setSaving(false);
      setStage(undefined);
    }
  };
}

export function useStatusDeleteRecovery(command: ExclusiveOperation) {
  const operation = useStatusOperationScope(command);
  const [recovering, setRecovering] = useState(false);
  const [proofPendingState, setProofPendingState] = useState(false);
  const recovery = useRef<StatusDeleteReceipt | undefined>(undefined);
  const proofPending = useRef(false);
  return {
    context: {
      command: operation.command,
      recovery,
      recoveryProofPending: proofPending,
      setDeleteRecovery: setRecovering,
      setDeleteRecoveryPending: setProofPendingState
    },
    recovering,
    proofPendingState,
    retire: () => {
      operation.retire();
      recovery.current = undefined;
      proofPending.current = false;
      setRecovering(false);
      setProofPendingState(false);
    }
  };
}
