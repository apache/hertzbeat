/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import type { AlertInhibitReceipt, AlertInhibitRecovery } from '../model/alert-inhibit-state';

export type AlertInhibitCommand = 'saving' | 'operating';

export type AlertInhibitOperationOwner = { token: symbol };

/** Owns same-tick admission, retained proof receipts, and unmount retirement. */
export function useAlertInhibitOperationController() {
  const ownerRef = useRef<AlertInhibitOperationOwner | undefined>(undefined);
  const receiptRef = useRef<AlertInhibitReceipt | undefined>(undefined);
  const recoveryRef = useRef(false);
  const mountedRef = useOperationLifetime(ownerRef, receiptRef, recoveryRef);
  const [command, setCommand] = useState<'idle' | 'recovering' | AlertInhibitCommand>('idle');
  const begin = (next: AlertInhibitCommand) => {
    if (!mountedRef.current || ownerRef.current || receiptRef.current) return undefined;
    const owner: AlertInhibitOperationOwner = { token: Symbol(next) };
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const resume = () => {
    const receipt = receiptRef.current;
    if (!mountedRef.current || ownerRef.current || !receipt || !recoveryFor(receipt).retryable) return undefined;
    const command = receipt.kind === 'save' ? 'saving' : 'operating';
    const owner: AlertInhibitOperationOwner = { token: Symbol(command) };
    ownerRef.current = owner;
    setCommand(command);
    return { owner, receipt };
  };
  const isCurrent = (owner: AlertInhibitOperationOwner) =>
    mountedRef.current && ownerRef.current?.token === owner.token;
  const retain = (owner: AlertInhibitOperationOwner, receipt: AlertInhibitReceipt) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    recoveryRef.current = false;
  };
  const markRecovery = (owner: AlertInhibitOperationOwner) => {
    if (isCurrent(owner) && receiptRef.current) recoveryRef.current = true;
  };
  const clear = (owner: AlertInhibitOperationOwner) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = undefined;
    recoveryRef.current = false;
  };
  const end = (owner: AlertInhibitOperationOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = undefined;
    setCommand(receiptRef.current ? 'recovering' : 'idle');
  };
  return {
    begin,
    clear,
    command,
    end,
    getReceipt: () => receiptRef.current,
    getRecovery: () => (recoveryRef.current && receiptRef.current ? recoveryFor(receiptRef.current) : undefined),
    isCurrent,
    isLocked: () => ownerRef.current !== undefined || receiptRef.current !== undefined,
    markRecovery,
    resume,
    retain
  };
}

function recoveryFor(receipt: AlertInhibitReceipt): AlertInhibitRecovery {
  if (receipt.kind === 'save' && receipt.phase === 'proof' && receipt.id === undefined) {
    return { kind: 'save', phase: 'commit-uncertain', retryable: false };
  }
  return { kind: receipt.kind, phase: receipt.phase === 'projection' ? 'projection' : 'proof', retryable: true };
}

function useOperationLifetime(
  ownerRef: { current: AlertInhibitOperationOwner | undefined },
  receiptRef: { current: AlertInhibitReceipt | undefined },
  recoveryRef: { current: boolean }
) {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = undefined;
      receiptRef.current = undefined;
      recoveryRef.current = false;
    };
  }, [ownerRef, receiptRef, recoveryRef]);
  return mountedRef;
}

export type AlertInhibitOperationController = ReturnType<typeof useAlertInhibitOperationController>;
