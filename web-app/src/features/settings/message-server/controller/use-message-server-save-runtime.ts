/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

export type MutationReceipt<Draft> = { phase: 'mutation'; draft: Draft };
export type ProofReceipt<Draft> = {
  phase: 'proof-after-acknowledgement' | 'proof-after-ambiguous-mutation';
  draft: Draft;
  failureKey: string | null;
};
export type CommitUncertainReceipt<Draft> = {
  phase: 'commit-uncertain';
  draft: Draft;
  failureKey: string;
};
export type SaveReceipt<Draft> = MutationReceipt<Draft> | ProofReceipt<Draft> | CommitUncertainReceipt<Draft>;
type SaveCommand = 'idle' | 'saving' | 'proving';
type SaveAction = 'save' | 'proof';
export type MessageServerSaveOwner = { action: SaveAction; epoch: number };

export type MessageServerSaveRuntime<Draft> = {
  receiptRef: MutableRefObject<SaveReceipt<Draft> | null>;
  command: SaveCommand;
  recoveryKey: string | null;
  recoveryRetryable: boolean;
  isCurrent: (owner: MessageServerSaveOwner) => boolean;
  isLocked: () => boolean;
  begin: (action: SaveAction) => MessageServerSaveOwner | null;
  publishReceipt: (owner: MessageServerSaveOwner, receipt: SaveReceipt<Draft> | null) => void;
  finish: (owner: MessageServerSaveOwner) => void;
  retireWriteAccess: () => void;
};

function clearSaveOwnership<Draft>(
  ownerRef: MutableRefObject<MessageServerSaveOwner | null>,
  receiptRef: MutableRefObject<SaveReceipt<Draft> | null>
) {
  ownerRef.current = null;
  receiptRef.current = null;
}

export function useMessageServerSaveRuntime<Draft>(): MessageServerSaveRuntime<Draft> {
  const epochRef = useRef(0);
  const ownerRef = useRef<MessageServerSaveOwner | null>(null);
  const receiptRef = useRef<SaveReceipt<Draft> | null>(null);
  const mountedRef = useRef(true);
  const [command, setCommand] = useState<SaveCommand>('idle');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [recoveryRetryable, setRecoveryRetryable] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
      clearSaveOwnership(ownerRef, receiptRef);
    };
  }, []);

  const isCurrent = (owner: MessageServerSaveOwner) =>
    mountedRef.current && ownerRef.current === owner && epochRef.current === owner.epoch;
  // The ref closes the same-tick gap before React can render the locked state.
  const begin = (action: SaveAction) => {
    if (!mountedRef.current || ownerRef.current) return null;
    const owner = { action, epoch: epochRef.current + 1 };
    epochRef.current = owner.epoch;
    ownerRef.current = owner;
    setCommand(action === 'save' ? 'saving' : 'proving');
    return owner;
  };
  const publishReceipt = (owner: MessageServerSaveOwner, receipt: SaveReceipt<Draft> | null) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    const failureKey = receipt?.phase === 'mutation' ? null : (receipt?.failureKey ?? null);
    setRecoveryKey(failureKey);
    setRecoveryRetryable(isProofReceipt(receipt) && failureKey !== null);
  };
  const finish = (owner: MessageServerSaveOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const isLocked = () => ownerRef.current !== null || receiptRef.current !== null;
  const retireWriteAccess = useCallback(() => {
    epochRef.current += 1;
    clearSaveOwnership(ownerRef, receiptRef);
    setCommand('idle');
    setRecoveryKey(null);
    setRecoveryRetryable(false);
  }, []);
  return {
    receiptRef,
    command,
    recoveryKey,
    recoveryRetryable,
    isCurrent,
    isLocked,
    begin,
    publishReceipt,
    finish,
    retireWriteAccess
  };
}

export function isProofReceipt<Draft>(receipt: SaveReceipt<Draft> | null): receipt is ProofReceipt<Draft> {
  return receipt?.phase === 'proof-after-acknowledgement' || receipt?.phase === 'proof-after-ambiguous-mutation';
}
