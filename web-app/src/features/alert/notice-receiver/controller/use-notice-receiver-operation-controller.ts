/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import type {
  NoticeReceiverCommand,
  NoticeReceiverReceipt,
  NoticeReceiverRecovery,
  NoticeReceiverTestRecovery,
  NoticeReceiverWriteReceipt
} from '../model/notice-receiver-operation-state';

export type NoticeReceiverOperationOwner = { token: symbol; command: NoticeReceiverCommand };
type OperationCommandState = 'idle' | 'recovering' | NoticeReceiverCommand;
type OperationRuntime = ReturnType<typeof useOperationRuntime>;

/** Owns synchronous command admission, retained recovery receipts, and unmount retirement. */
export function useNoticeReceiverOperationController() {
  return createOperationController(useOperationRuntime());
}

function useOperationRuntime() {
  const ownerRef = useRef<NoticeReceiverOperationOwner | undefined>(undefined);
  const receiptRef = useRef<NoticeReceiverReceipt | undefined>(undefined);
  const recoveryRef = useRef(false);
  const mountedRef = useOperationLifetime(ownerRef, receiptRef, recoveryRef);
  const [command, setCommand] = useState<OperationCommandState>('idle');
  return { ownerRef, receiptRef, recoveryRef, mountedRef, command, setCommand };
}

function createOperationController(runtime: OperationRuntime) {
  const isCurrent = (owner: NoticeReceiverOperationOwner) =>
    runtime.mountedRef.current && runtime.ownerRef.current === owner;
  return {
    begin: (next: NoticeReceiverCommand) => beginOperation(runtime, next),
    clear: (owner: NoticeReceiverOperationOwner) => clearReceipt(runtime, owner),
    command: runtime.command,
    end: (owner: NoticeReceiverOperationOwner) => endOperation(runtime, owner),
    isCurrent,
    markRecovery: (owner: NoticeReceiverOperationOwner) => markRecovery(runtime, owner),
    retain: (owner: NoticeReceiverOperationOwner, receipt: NoticeReceiverReceipt) =>
      retainReceipt(runtime, owner, receipt),
    resume: () => resumeWrite(runtime),
    resumeTest: () => resumeTest(runtime),
    dismissTest: () => dismissTest(runtime),
    retire: () => retireOperation(runtime),
    getReceipt: () => runtime.receiptRef.current,
    getRecovery: () => currentWriteRecovery(runtime),
    getTestRecovery: () => testRecoveryFor(runtime.receiptRef.current),
    isLocked: () => runtime.ownerRef.current !== undefined || runtime.receiptRef.current !== undefined
  };
}

function beginOperation(runtime: OperationRuntime, command: NoticeReceiverCommand) {
  if (!runtime.mountedRef.current || runtime.ownerRef.current || runtime.receiptRef.current) return undefined;
  return claimOperation(runtime, command);
}

function resumeWrite(runtime: OperationRuntime) {
  const receipt = runtime.receiptRef.current;
  if (!runtime.mountedRef.current || runtime.ownerRef.current || !receipt || receipt.kind === 'test') return undefined;
  if (!recoveryFor(receipt).retryable) return undefined;
  const owner = claimOperation(runtime, receipt.kind === 'save' ? 'saving' : 'removing');
  return { owner, receipt };
}

function resumeTest(runtime: OperationRuntime) {
  const receipt = runtime.receiptRef.current;
  if (!runtime.mountedRef.current || runtime.ownerRef.current || receipt?.kind !== 'test') return undefined;
  return { owner: claimOperation(runtime, 'testing'), receipt };
}

function claimOperation(runtime: OperationRuntime, command: NoticeReceiverCommand) {
  const owner: NoticeReceiverOperationOwner = { token: Symbol(command), command };
  runtime.ownerRef.current = owner;
  runtime.setCommand(command);
  return owner;
}

function retainReceipt(runtime: OperationRuntime, owner: NoticeReceiverOperationOwner, receipt: NoticeReceiverReceipt) {
  if (!isCurrentOperation(runtime, owner)) return;
  runtime.receiptRef.current = receipt;
  runtime.recoveryRef.current = false;
}

function clearReceipt(runtime: OperationRuntime, owner: NoticeReceiverOperationOwner) {
  if (!isCurrentOperation(runtime, owner)) return;
  runtime.receiptRef.current = undefined;
  runtime.recoveryRef.current = false;
}

function markRecovery(runtime: OperationRuntime, owner: NoticeReceiverOperationOwner) {
  if (isCurrentOperation(runtime, owner) && runtime.receiptRef.current) runtime.recoveryRef.current = true;
}

function endOperation(runtime: OperationRuntime, owner: NoticeReceiverOperationOwner) {
  if (!isCurrentOperation(runtime, owner)) return;
  runtime.ownerRef.current = undefined;
  runtime.setCommand(runtime.receiptRef.current ? 'recovering' : 'idle');
}

function dismissTest(runtime: OperationRuntime) {
  if (!runtime.mountedRef.current || runtime.ownerRef.current || runtime.receiptRef.current?.kind !== 'test')
    return false;
  runtime.receiptRef.current = undefined;
  runtime.recoveryRef.current = false;
  runtime.setCommand('idle');
  return true;
}

function retireOperation(runtime: OperationRuntime) {
  const retained = Boolean(runtime.ownerRef.current || runtime.receiptRef.current);
  runtime.ownerRef.current = undefined;
  runtime.receiptRef.current = undefined;
  runtime.recoveryRef.current = false;
  if (runtime.command !== 'idle') runtime.setCommand('idle');
  return retained;
}

function isCurrentOperation(runtime: OperationRuntime, owner: NoticeReceiverOperationOwner) {
  return runtime.mountedRef.current && runtime.ownerRef.current === owner;
}

function recoveryFor(receipt: NoticeReceiverWriteReceipt): NoticeReceiverRecovery {
  if (receipt.kind === 'save' && receipt.phase === 'proof' && receipt.id === undefined) {
    return { kind: 'save', phase: 'commit-uncertain', retryable: false };
  }
  const phase = receipt.phase === 'write' ? 'proof' : receipt.phase;
  return { kind: receipt.kind, phase, retryable: true };
}

function currentWriteRecovery(runtime: OperationRuntime) {
  const receipt = runtime.receiptRef.current;
  return runtime.recoveryRef.current && receipt && receipt.kind !== 'test' ? recoveryFor(receipt) : undefined;
}

function testRecoveryFor(receipt: NoticeReceiverReceipt | undefined): NoticeReceiverTestRecovery | undefined {
  return receipt?.kind === 'test' ? { phase: receipt.phase, failure: receipt.failure } : undefined;
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
