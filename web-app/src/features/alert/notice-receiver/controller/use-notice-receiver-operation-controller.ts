/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import type { NoticeReceiver, NoticeReceiverDraft } from '../model/notice-receiver-model';

export type NoticeReceiverCommand = 'saving' | 'removing' | 'testing';
export type NoticeReceiverReceipt =
  | { kind: 'save'; phase: 'write' | 'proof' | 'projection'; draft: NoticeReceiverDraft; id?: number }
  | { kind: 'delete'; phase: 'write' | 'proof' | 'projection'; record: NoticeReceiver };

export type NoticeReceiverOperationOwner = { token: symbol; command: NoticeReceiverCommand };
export type NoticeReceiverRecovery = {
  kind: NoticeReceiverReceipt['kind'];
  phase: 'proof' | 'projection' | 'commit-uncertain';
  retryable: boolean;
};

/** Owns synchronous command admission, retained recovery receipts, and unmount retirement. */
export function useNoticeReceiverOperationController() {
  const ownerRef = useRef<NoticeReceiverOperationOwner | undefined>(undefined);
  const receiptRef = useRef<NoticeReceiverReceipt | undefined>(undefined);
  const recoveryRef = useRef(false);
  const mountedRef = useOperationLifetime(ownerRef, receiptRef, recoveryRef);
  const [command, setCommand] = useState<'idle' | 'recovering' | NoticeReceiverCommand>('idle');
  const begin = (next: NoticeReceiverCommand) => {
    if (!mountedRef.current || ownerRef.current || receiptRef.current) return undefined;
    const owner: NoticeReceiverOperationOwner = { token: Symbol(next), command: next };
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const resume = () => {
    const receipt = receiptRef.current;
    if (!mountedRef.current || ownerRef.current || !receipt || !recoveryFor(receipt).retryable) return undefined;
    const next = receipt.kind === 'save' ? 'saving' : 'removing';
    const owner: NoticeReceiverOperationOwner = { token: Symbol(next), command: next };
    ownerRef.current = owner;
    setCommand(next);
    return { owner, receipt };
  };
  const isCurrent = (owner: NoticeReceiverOperationOwner) => mountedRef.current && ownerRef.current === owner;
  const retain = (owner: NoticeReceiverOperationOwner, receipt: NoticeReceiverReceipt) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    recoveryRef.current = false;
  };
  const markRecovery = (owner: NoticeReceiverOperationOwner) => {
    if (isCurrent(owner) && receiptRef.current) recoveryRef.current = true;
  };
  const clear = (owner: NoticeReceiverOperationOwner) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = undefined;
    recoveryRef.current = false;
  };
  const end = (owner: NoticeReceiverOperationOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = undefined;
    setCommand(receiptRef.current ? 'recovering' : 'idle');
  };
  return {
    begin,
    clear,
    command,
    end,
    isCurrent,
    markRecovery,
    retain,
    resume,
    getReceipt: () => receiptRef.current,
    getRecovery: () => (recoveryRef.current && receiptRef.current ? recoveryFor(receiptRef.current) : undefined),
    isLocked: () => ownerRef.current !== undefined || receiptRef.current !== undefined
  };
}

function recoveryFor(receipt: NoticeReceiverReceipt): NoticeReceiverRecovery {
  if (receipt.kind === 'save' && receipt.phase === 'proof' && receipt.id === undefined) {
    return { kind: 'save', phase: 'commit-uncertain', retryable: false };
  }
  const phase = receipt.phase === 'write' ? 'proof' : receipt.phase;
  return { kind: receipt.kind, phase, retryable: true };
}

function useOperationLifetime(
  ownerRef: { current: NoticeReceiverOperationOwner | undefined },
  receiptRef: { current: NoticeReceiverReceipt | undefined },
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

export type NoticeReceiverOperationController = ReturnType<typeof useNoticeReceiverOperationController>;
