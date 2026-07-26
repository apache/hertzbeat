/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { useExclusiveOperation } from '@/shared/exclusive-operation';

import { deleteAlertGroups, updateAlertGroupStatus } from '../api/alert-api';
import type { AlertCenterOperationCommand, AlertCenterOperationRecovery } from '../model/alert-center-operation-state';
import {
  alertFailureKind,
  alertWriteOutcome,
  normalizeAlertGroupIds,
  type AlertGroupTargetStatus
} from '../model/alert-model';
import { AlertCenterProofError, proveAlertGroupsMissing, proveAlertGroupsStatus } from './alert-center-operation-proof';

type OperationPhase = 'write' | 'proof' | 'projection';
type OperationReceipt =
  | { kind: 'delete'; ids: number[]; phase: OperationPhase }
  | { kind: 'status'; ids: number[]; status: AlertGroupTargetStatus; phase: OperationPhase };

type OperationDependencies = {
  reread: () => Promise<void>;
  success: (receipt: OperationReceipt) => void;
  failure: (kind: 'unavailable' | 'error', receipt: OperationReceipt) => void;
};

export function useAlertCenterOperation(dependencies: OperationDependencies) {
  const gate = useExclusiveOperation('alert-center-command');
  const receiptRef = useRef<OperationReceipt | null>(null);
  const [active, setActive] = useState<OperationReceipt | null>(null);
  const [recovery, setRecovery] = useState<AlertCenterOperationRecovery | null>(null);

  const run = async (candidate?: OperationReceipt) => {
    const owner = gate.begin();
    if (!owner) return false;
    const receipt = receiptRef.current ?? candidate;
    if (!receipt) {
      gate.end(owner);
      return false;
    }
    receiptRef.current = receipt;
    setActive(receipt);
    try {
      const completed = await advanceOperation(receipt, dependencies.reread, () => gate.isCurrent(owner));
      if (!completed || !gate.isCurrent(owner)) return false;
      receiptRef.current = null;
      setRecovery(null);
      dependencies.success(receipt);
      return true;
    } catch (reason) {
      if (!gate.isCurrent(owner)) return false;
      retainRecovery(receipt, reason, receiptRef, setRecovery);
      dependencies.failure(alertFailureKind(reason), receipt);
      return false;
    } finally {
      if (gate.isCurrent(owner)) setActive(null);
      gate.end(owner);
    }
  };

  return {
    command: resolveCommand(gate.pending, active, recovery),
    recovery,
    remove: (ids: readonly number[]) => run({ kind: 'delete', ids: normalizeAlertGroupIds(ids), phase: 'write' }),
    updateStatus: (ids: readonly number[], status: AlertGroupTargetStatus) =>
      run({ kind: 'status', ids: normalizeAlertGroupIds(ids), status, phase: 'write' }),
    retry: () => run()
  } as const;
}

function resolveCommand(
  pending: boolean,
  active: OperationReceipt | null,
  recovery: AlertCenterOperationRecovery | null
): AlertCenterOperationCommand {
  if (!pending) return 'idle';
  if (recovery) return 'recovering';
  if (active?.kind === 'delete') return 'deleting';
  if (active?.status === 'resolved') return 'resolving';
  if (active?.status === 'firing') return 'reopening';
  return 'idle';
}

async function advanceOperation(receipt: OperationReceipt, reread: () => Promise<void>, isCurrent: () => boolean) {
  if (receipt.phase === 'write') {
    await mutate(receipt);
    if (!isCurrent()) return false;
    receipt.phase = 'proof';
  }
  if (receipt.phase === 'proof') {
    await prove(receipt);
    if (!isCurrent()) return false;
    receipt.phase = 'projection';
  }
  await reread();
  return isCurrent();
}

function mutate(receipt: OperationReceipt) {
  if (receipt.kind === 'delete') return deleteAlertGroups(receipt.ids);
  return updateAlertGroupStatus(receipt.ids, receipt.status);
}

function prove(receipt: OperationReceipt) {
  if (receipt.kind === 'delete') return proveAlertGroupsMissing(receipt.ids);
  return proveAlertGroupsStatus(receipt.ids, receipt.status);
}

function retainRecovery(
  receipt: OperationReceipt,
  reason: unknown,
  receiptRef: { current: OperationReceipt | null },
  setRecovery: (value: AlertCenterOperationRecovery | null) => void
) {
  const rejected = receipt.phase === 'write' && alertWriteOutcome(reason) === 'rejected';
  const disproven = receipt.phase === 'proof' && reason instanceof AlertCenterProofError;
  if (rejected || disproven) {
    receiptRef.current = null;
    setRecovery(null);
    return;
  }
  if (receipt.phase === 'write') receipt.phase = 'proof';
  const evidence = { ids: receipt.ids, phase: receipt.phase, failure: alertFailureKind(reason) } as const;
  setRecovery(
    receipt.kind === 'status'
      ? { ...evidence, kind: 'status', status: receipt.status }
      : { ...evidence, kind: 'delete' }
  );
}
