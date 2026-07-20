/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation';

import { findCanonicalLabel } from '../api/label-api';
import {
  enrichCreateEvidence,
  isSafeLabelMutationRelease,
  type LabelDeleteEvidence,
  type LabelMutationEvidence,
  type LabelWriteEvidence,
  type LabelWriteRecovery
} from '../model/label-failure';
import { labelSaveConverged } from '../model/label-model';

export type LabelRecovery = Exclude<LabelWriteRecovery, 'rewrite'> | null;

type RecoveryReceipt =
  | { command: 'save'; evidence: LabelWriteEvidence; onConfirmed: () => void }
  | { command: 'delete'; evidence: LabelDeleteEvidence; onConfirmed: () => void };

type SaveRecoveryOptions = {
  convergeProjection: (evidence: LabelMutationEvidence) => Promise<boolean>;
  notifyFailure: () => void;
  notifySuccess: () => void;
  notifyDeleteFailure: () => void;
  notifyDeleteSuccess: () => void;
  operation: ExclusiveOperation;
};

type LabelOperationOwner = NonNullable<ReturnType<ExclusiveOperation['begin']>>;

/** Separates active transport ownership from a retained, proof-only recovery receipt. */
export function useLabelSaveRecoveryController(options: SaveRecoveryOptions) {
  const { publish, receiptRef, recovery, recoveryCommand } = useSaveReceiptRuntime();
  const saveCallbacks = useSaveCallbacks(options, publish);
  const deleteCallbacks = useDeleteCallbacks(options, publish);
  const retry = useRecoveryRetry(options, publish, receiptRef);
  return {
    deleteCallbacks,
    isInFlight: options.operation.isLocked,
    isLocked: () => options.operation.isLocked() || receiptRef.current !== undefined,
    recovery,
    recoveryCommand,
    saveCallbacks,
    retry
  };
}

function useRecoveryRetry(
  options: SaveRecoveryOptions,
  publish: (receipt: RecoveryReceipt | undefined) => void,
  receiptRef: RefObject<RecoveryReceipt | undefined>
) {
  const { convergeProjection, notifyDeleteFailure, notifyDeleteSuccess, notifyFailure, notifySuccess, operation } =
    options;
  return useCallback(async () => {
    const receipt = receiptRef.current;
    if (!receipt || !readRecovery(receipt.evidence)) return false;
    const owner = operation.begin();
    if (!owner) return false;
    try {
      const canonical = await findCanonicalLabel(receipt.evidence.identity);
      if (!operation.isCurrent(owner)) return false;
      if (!proofConverged(receipt, canonical)) {
        notifyReceiptFailure(receipt, notifyFailure, notifyDeleteFailure);
        return false;
      }
      const proofReceipt = enrichRecoveryReceipt(receipt, canonical);
      if (proofReceipt !== receipt) publish(proofReceipt);
      const projectionConverged = await convergeProjection(proofReceipt.evidence);
      if (!operation.isCurrent(owner)) return false;
      if (!projectionConverged) {
        notifyReceiptFailure(receipt, notifyFailure, notifyDeleteFailure);
        return false;
      }
      publish(undefined);
      receipt.onConfirmed();
      notifyReceiptSuccess(receipt, notifySuccess, notifyDeleteSuccess);
      return true;
    } catch {
      if (operation.isCurrent(owner)) notifyReceiptFailure(receipt, notifyFailure, notifyDeleteFailure);
      return false;
    } finally {
      operation.end(owner);
    }
  }, [
    convergeProjection,
    notifyDeleteFailure,
    notifyDeleteSuccess,
    notifyFailure,
    notifySuccess,
    operation,
    publish,
    receiptRef
  ]);
}

function enrichRecoveryReceipt(
  receipt: RecoveryReceipt,
  canonical: Awaited<ReturnType<typeof findCanonicalLabel>>
): RecoveryReceipt {
  if (receipt.command !== 'save' || !canonical) return receipt;
  const evidence = enrichCreateEvidence(receipt.evidence, canonical);
  return evidence === receipt.evidence ? receipt : { ...receipt, evidence };
}

function useSaveCallbacks(options: SaveRecoveryOptions, publish: (receipt: RecoveryReceipt | undefined) => void) {
  const { notifyFailure, notifySuccess, operation } = options;
  return useCallback(
    (owner: LabelOperationOwner, evidence: LabelWriteEvidence, onConfirmed: () => void) => ({
      onSuccess: () => finishSuccess(operation, owner, () => publish(undefined), onConfirmed, notifySuccess),
      onError: (reason: unknown) =>
        finishFailure(
          operation,
          owner,
          reason,
          () => publish({ command: 'save', evidence, onConfirmed }),
          publish,
          notifyFailure
        )
    }),
    [notifyFailure, notifySuccess, operation, publish]
  );
}

function useDeleteCallbacks(options: SaveRecoveryOptions, publish: (receipt: RecoveryReceipt | undefined) => void) {
  const { notifyDeleteFailure, notifyDeleteSuccess, operation } = options;
  return useCallback(
    (owner: LabelOperationOwner, evidence: LabelDeleteEvidence, onConfirmed: () => void) => ({
      onSuccess: () => finishSuccess(operation, owner, () => publish(undefined), onConfirmed, notifyDeleteSuccess),
      onError: (reason: unknown) =>
        finishFailure(
          operation,
          owner,
          reason,
          () => publish({ command: 'delete', evidence, onConfirmed }),
          publish,
          notifyDeleteFailure
        )
    }),
    [notifyDeleteFailure, notifyDeleteSuccess, operation, publish]
  );
}

function useSaveReceiptRuntime() {
  const receiptRef = useRef<RecoveryReceipt | undefined>(undefined);
  const [recovery, setRecovery] = useState<LabelRecovery>(null);
  const [recoveryCommand, setRecoveryCommand] = useState<RecoveryReceipt['command'] | null>(null);
  useEffect(
    () => () => {
      receiptRef.current = undefined;
    },
    []
  );
  const publish = useCallback((receipt: RecoveryReceipt | undefined) => {
    receiptRef.current = receipt;
    setRecovery(receipt ? readRecovery(receipt.evidence) : null);
    setRecoveryCommand(receipt?.command ?? null);
  }, []);
  return { publish, receiptRef, recovery, recoveryCommand };
}

function readRecovery(evidence: LabelWriteEvidence | LabelDeleteEvidence): LabelRecovery {
  return evidence.recovery === 'proof' || evidence.recovery === 'commit-uncertain' ? evidence.recovery : null;
}

function proofConverged(receipt: RecoveryReceipt, canonical: Awaited<ReturnType<typeof findCanonicalLabel>>) {
  if (receipt.command === 'delete') return canonical === undefined;
  return canonical !== undefined && labelSaveConverged(receipt.evidence.expected, canonical);
}

function notifyReceiptFailure(receipt: RecoveryReceipt, notifySave: () => void, notifyDelete: () => void) {
  if (receipt.command === 'delete') notifyDelete();
  else notifySave();
}

function notifyReceiptSuccess(receipt: RecoveryReceipt, notifySave: () => void, notifyDelete: () => void) {
  if (receipt.command === 'delete') notifyDelete();
  else notifySave();
}

function finishSuccess(
  operation: ExclusiveOperation,
  owner: LabelOperationOwner,
  clear: () => void,
  onConfirmed: () => void,
  notifySuccess: () => void
) {
  if (!operation.isCurrent(owner)) return;
  clear();
  try {
    onConfirmed();
    notifySuccess();
  } finally {
    operation.end(owner);
  }
}

function finishFailure(
  operation: ExclusiveOperation,
  owner: LabelOperationOwner,
  reason: unknown,
  retain: () => void,
  clear: (receipt: undefined) => void,
  notifyFailure: () => void
) {
  if (!operation.isCurrent(owner)) return;
  if (isSafeLabelMutationRelease(reason)) clear(undefined);
  else retain();
  try {
    notifyFailure();
  } finally {
    operation.end(owner);
  }
}

export type LabelSaveRecoveryController = ReturnType<typeof useLabelSaveRecoveryController>;
