/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { useExclusiveOperation } from '@/shared/exclusive-operation';

import { deleteAlertGroups } from '../api/alert-api';
import type { AlertCenterDeleteRecovery } from '../model/alert-center-operation-state';
import { alertFailureKind, alertWriteOutcome } from '../model/alert-model';
import { AlertDeleteProofError, proveAlertGroupMissing } from './alert-center-delete-proof';

type DeletePhase = 'write' | 'proof' | 'projection';
type DeleteReceipt = { id: number; phase: DeletePhase };

type DeleteDependencies = {
  reread: () => Promise<void>;
  success: () => void;
  failure: (kind: 'unavailable' | 'error') => void;
};

export function useAlertCenterDelete(dependencies: DeleteDependencies) {
  const gate = useExclusiveOperation('alert-center-delete');
  const receiptRef = useRef<DeleteReceipt | null>(null);
  const [recovery, setRecovery] = useState<AlertCenterDeleteRecovery | null>(null);

  const run = async (candidate?: DeleteReceipt) => {
    const owner = gate.begin();
    if (!owner) return false;
    const receipt = receiptRef.current ?? candidate;
    if (!receipt) {
      gate.end(owner);
      return false;
    }
    receiptRef.current = receipt;
    try {
      const completed = await advanceDelete(receipt, dependencies.reread, () => gate.isCurrent(owner));
      if (!completed || !gate.isCurrent(owner)) return false;
      receiptRef.current = null;
      setRecovery(null);
      dependencies.success();
      return true;
    } catch (reason) {
      if (!gate.isCurrent(owner)) return false;
      retainDeleteRecovery(receipt, reason, receiptRef, setRecovery);
      dependencies.failure(alertFailureKind(reason));
      return false;
    } finally {
      gate.end(owner);
    }
  };

  return {
    command: resolveDeleteCommand(gate.pending, recovery),
    isLocked: gate.isLocked,
    recovery,
    remove: (id: number) => run({ id, phase: 'write' }),
    retry: () => run()
  } as const;
}

function resolveDeleteCommand(pending: boolean, recovery: AlertCenterDeleteRecovery | null) {
  if (pending) return recovery ? 'recovering' : 'deleting';
  return 'idle';
}

async function advanceDelete(receipt: DeleteReceipt, reread: () => Promise<void>, isCurrent: () => boolean) {
  if (receipt.phase === 'write') {
    await deleteAlertGroups([receipt.id]);
    if (!isCurrent()) return false;
    receipt.phase = 'proof';
  }
  if (receipt.phase === 'proof') {
    await proveAlertGroupMissing(receipt.id);
    if (!isCurrent()) return false;
    receipt.phase = 'projection';
  }
  await reread();
  return isCurrent();
}

function retainDeleteRecovery(
  receipt: DeleteReceipt,
  reason: unknown,
  receiptRef: { current: DeleteReceipt | null },
  setRecovery: (value: AlertCenterDeleteRecovery | null) => void
) {
  const definitelyRejected = receipt.phase === 'write' && alertWriteOutcome(reason) === 'rejected';
  const provenPresent =
    receipt.phase === 'proof' && reason instanceof AlertDeleteProofError && reason.kind === 'present';
  if (definitelyRejected || provenPresent) {
    receiptRef.current = null;
    setRecovery(null);
    return;
  }
  if (receipt.phase === 'write') receipt.phase = 'proof';
  setRecovery({ id: receipt.id, phase: receipt.phase, failure: alertFailureKind(reason) });
}
