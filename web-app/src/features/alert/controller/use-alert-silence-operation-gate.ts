/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { alertSilenceFailureKind, alertSilenceWriteOutcome } from '../model/alert-silence-model';
import type { AlertSilenceOperationKind, AlertSilenceRecovery } from '../model/alert-silence-page-model';

export type AlertSilenceProjectionFailure = 'unavailable' | 'error';

type Feedback = { success: string; error: string };
type AlertSilenceOperation = {
  kind: AlertSilenceOperationKind;
  write: () => Promise<void>;
  onCommitted?: () => void;
  // `prove` must establish the exact resource state after an uncertain write.
  prove?: () => Promise<void>;
  // Create cannot recover an uncertain POST until its acknowledgement yielded
  // an identity; edit and delete can prove their pre-existing command IDs.
  canRecoverUncertainWrite?: () => boolean;
  project: () => Promise<void>;
};
type ReceiptPhase = AlertSilenceRecovery['phase'];
type RetainedReceipt = {
  operation: AlertSilenceOperation;
  feedback: Feedback;
  phase: ReceiptPhase;
  committed: boolean;
};
type OperationOwner = number;
type GateRuntime = {
  mounted: RefObject<boolean>;
  owner: RefObject<OperationOwner | null>;
  receipt: RefObject<RetainedReceipt | null>;
  setActive: Dispatch<SetStateAction<boolean>>;
  setProjectionFailure: Dispatch<SetStateAction<AlertSilenceProjectionFailure | null>>;
  setRecovery: Dispatch<SetStateAction<AlertSilenceRecovery | null>>;
  error: (message: string) => void;
  success: (message: string) => void;
  translate: (key: string) => string;
};

export function useAlertSilenceOperationGate() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [active, setActive] = useState(false);
  const [projectionFailure, setProjectionFailure] = useState<AlertSilenceProjectionFailure | null>(null);
  const [recovery, setRecovery] = useState<AlertSilenceRecovery | null>(null);
  const owner = useRef<number | null>(null);
  const receipt = useRef<RetainedReceipt | null>(null);
  const nextOwner = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      owner.current = null;
      receipt.current = null;
    };
  }, []);
  const runtime: GateRuntime = {
    mounted,
    owner,
    receipt,
    setActive,
    setProjectionFailure,
    setRecovery,
    error: key => void message.error(key),
    success: key => void message.success(key),
    translate: t
  };
  const run = async (operation: AlertSilenceOperation, feedback: Feedback) => {
    if (owner.current !== null || receipt.current !== null) return;
    const commandOwner = claimOwner(runtime, ++nextOwner.current);
    await executeWrite(runtime, commandOwner, operation, feedback);
  };
  const retry = async () => {
    const retained = receipt.current;
    if (owner.current !== null || !retained || retained.phase === 'commit-uncertain') return;
    const commandOwner = claimOwner(runtime, ++nextOwner.current);
    await advanceReceipt(runtime, commandOwner, retained);
  };
  const isActive = () => owner.current !== null;
  const isLocked = () => owner.current !== null || receipt.current !== null;

  return { busy: active, isActive, isLocked, projectionFailure, recovery, retry, run };
}

async function executeWrite(
  runtime: GateRuntime,
  owner: OperationOwner,
  operation: AlertSilenceOperation,
  feedback: Feedback
) {
  try {
    await operation.write();
  } catch (reason) {
    if (!owns(owner, runtime.owner, runtime.mounted)) return;
    if (alertSilenceWriteOutcome(reason) === 'rejected') {
      runtime.error(runtime.translate(feedback.error));
    } else {
      const retained: RetainedReceipt = {
        operation,
        feedback,
        phase: operation.prove && operation.canRecoverUncertainWrite?.() !== false ? 'proof' : 'commit-uncertain',
        committed: false
      };
      retainReceipt(runtime, retained);
      publishRetainedFailure(runtime, reason, retained);
    }
    retire(owner, runtime.owner, runtime.mounted, runtime.setActive);
    return;
  }
  if (!owns(owner, runtime.owner, runtime.mounted)) return;
  const retained: RetainedReceipt = {
    operation,
    feedback,
    phase: operation.prove ? 'proof' : 'projection',
    committed: true
  };
  publishCommit(runtime, retained);
  await advanceReceipt(runtime, owner, retained);
}

async function advanceReceipt(runtime: GateRuntime, owner: OperationOwner, retained: RetainedReceipt) {
  try {
    // Recovery advances the retained receipt; it never executes the mutation again.
    if (retained.phase === 'proof') {
      await retained.operation.prove?.();
      if (!owns(owner, runtime.owner, runtime.mounted)) return;
      retained.phase = 'projection';
      if (!retained.committed) publishCommit(runtime, retained);
    }
    await retained.operation.project();
    if (owns(owner, runtime.owner, runtime.mounted)) clearReceipt(runtime);
  } catch (reason) {
    if (owns(owner, runtime.owner, runtime.mounted)) {
      retainReceipt(runtime, retained);
      publishRetainedFailure(runtime, reason, retained);
    }
  } finally {
    retire(owner, runtime.owner, runtime.mounted, runtime.setActive);
  }
}

function claimOwner(runtime: GateRuntime, owner: OperationOwner) {
  runtime.owner.current = owner;
  runtime.setActive(true);
  return owner;
}

function publishCommit(runtime: GateRuntime, retained: RetainedReceipt) {
  retained.committed = true;
  retained.operation.onCommitted?.();
  runtime.success(runtime.translate(retained.feedback.success));
}

function retainReceipt(runtime: GateRuntime, retained: RetainedReceipt) {
  runtime.receipt.current = retained;
  if (runtime.mounted.current) runtime.setRecovery(recoveryFor(retained));
}

function clearReceipt(runtime: GateRuntime) {
  runtime.receipt.current = null;
  if (!runtime.mounted.current) return;
  runtime.setRecovery(null);
  runtime.setProjectionFailure(null);
}

function publishRetainedFailure(runtime: GateRuntime, reason: unknown, retained: RetainedReceipt) {
  // A write with an uncertain outcome does not invalidate the list that was
  // already read. Only a failed post-commit projection changes list evidence;
  // the persistent recovery alert is the single user-facing error owner.
  if (retained.committed) runtime.setProjectionFailure(projectionFailureKind(reason));
}

function recoveryFor(receipt: RetainedReceipt): AlertSilenceRecovery {
  return {
    kind: receipt.operation.kind,
    phase: receipt.phase,
    retryable: receipt.phase !== 'commit-uncertain'
  };
}

function owns(commandOwner: number, owner: RefObject<number | null>, mounted: RefObject<boolean>) {
  return mounted.current && owner.current === commandOwner;
}

function retire(
  commandOwner: number,
  owner: RefObject<number | null>,
  mounted: RefObject<boolean>,
  setActive: Dispatch<SetStateAction<boolean>>
) {
  if (owner.current !== commandOwner) return;
  owner.current = null;
  if (mounted.current) setActive(false);
}

function projectionFailureKind(reason: unknown): AlertSilenceProjectionFailure {
  return alertSilenceFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
}
