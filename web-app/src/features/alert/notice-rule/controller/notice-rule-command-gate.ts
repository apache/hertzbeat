/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  canPerformNoticeRuleAction,
  type NoticeRuleActionCapabilities,
  type NoticeRuleActionKind
} from '../model/notice-rule-action-capability';
import type { NoticeRuleOperationReceipt, NoticeRuleOperationRecovery } from '../model/notice-rule-operation-state';
import { canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';

type Command = 'saving' | 'deleting' | 'toggling';
type CommandState = 'idle' | 'recovering' | Command;
type MutableReference<T> = { current: T };
export type NoticeRuleOperationOwner = { epoch: number; action: NoticeRuleActionKind };

type GateRuntime = {
  activeOwnerRef: MutableReference<NoticeRuleOperationOwner | undefined>;
  command: CommandState;
  commandRef: MutableReference<'idle' | Command>;
  ownerAliveRef: MutableReference<boolean>;
  ownerEpochRef: MutableReference<number>;
  receiptRef: MutableReference<NoticeRuleOperationReceipt | undefined>;
  recovery: NoticeRuleOperationRecovery | undefined;
  setCommand: Dispatch<SetStateAction<CommandState>>;
  setRecovery: Dispatch<SetStateAction<NoticeRuleOperationRecovery | undefined>>;
  setTogglingRuleId: Dispatch<SetStateAction<number | null>>;
  togglingRuleId: number | null;
};

export function useNoticeRuleCommandGate() {
  const runtime = useNoticeRuleGateRuntime();
  useCommandGateLifetime(runtime);
  return {
    command: runtime.command,
    togglingRuleId: runtime.togglingRuleId,
    recovery: runtime.recovery,
    begin: (next: Command, action: NoticeRuleActionKind, ruleId: number | null = null) =>
      beginOperation(runtime, next, action, ruleId),
    beginRecovery: () => beginRecovery(runtime),
    retainedReceipt: () => runtime.receiptRef.current,
    retain: (owner: NoticeRuleOperationOwner, receipt: NoticeRuleOperationReceipt) =>
      retainReceipt(runtime, owner, receipt),
    clear: (owner: NoticeRuleOperationOwner) => clearReceipt(runtime, owner),
    markRecovery: (owner: NoticeRuleOperationOwner, failure: NoticeRuleOperationRecovery['failure']) =>
      markRecovery(runtime, owner, failure),
    end: (owner: NoticeRuleOperationOwner) => endOperation(runtime, owner),
    retireUnauthorized: (capabilities: NoticeRuleActionCapabilities) => retireUnauthorized(runtime, capabilities),
    isLocked: () => runtime.commandRef.current !== 'idle' || runtime.receiptRef.current !== undefined,
    isCurrent: (owner: NoticeRuleOperationOwner) => isCurrent(runtime, owner),
    isMounted: () => runtime.ownerAliveRef.current
  };
}

function useNoticeRuleGateRuntime(): GateRuntime {
  const activeOwnerRef = useRef<NoticeRuleOperationOwner | undefined>(undefined);
  const commandRef = useRef<'idle' | Command>('idle');
  const ownerAliveRef = useRef(false);
  const ownerEpochRef = useRef(0);
  const receiptRef = useRef<NoticeRuleOperationReceipt | undefined>(undefined);
  const [command, setCommand] = useState<CommandState>('idle');
  const [recovery, setRecovery] = useState<NoticeRuleOperationRecovery>();
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  return {
    activeOwnerRef,
    command,
    commandRef,
    ownerAliveRef,
    ownerEpochRef,
    receiptRef,
    recovery,
    setCommand,
    setRecovery,
    setTogglingRuleId,
    togglingRuleId
  };
}

function beginOperation(runtime: GateRuntime, command: Command, action: NoticeRuleActionKind, ruleId: number | null) {
  // React state is not synchronous; the refs close the same-tick command race.
  if (!runtime.ownerAliveRef.current || runtime.commandRef.current !== 'idle' || runtime.receiptRef.current) {
    return undefined;
  }
  const owner = nextOwner(runtime, action);
  runtime.commandRef.current = command;
  runtime.setCommand(command);
  runtime.setTogglingRuleId(ruleId);
  return owner;
}

function beginRecovery(runtime: GateRuntime) {
  const receipt = runtime.receiptRef.current;
  if (
    !runtime.ownerAliveRef.current ||
    runtime.commandRef.current !== 'idle' ||
    !receipt ||
    receipt.phase === 'commit-uncertain'
  ) {
    return undefined;
  }
  const command = receipt.kind === 'delete' ? 'deleting' : receipt.kind === 'toggle' ? 'toggling' : 'saving';
  const owner = nextOwner(runtime, receipt.kind === 'update' ? 'edit' : receipt.kind);
  runtime.commandRef.current = command;
  runtime.setCommand(command);
  runtime.setTogglingRuleId(receipt.kind === 'toggle' ? receipt.id : null);
  return { owner, receipt };
}

function nextOwner(runtime: GateRuntime, action: NoticeRuleActionKind): NoticeRuleOperationOwner {
  const owner = { epoch: runtime.ownerEpochRef.current + 1, action };
  runtime.ownerEpochRef.current = owner.epoch;
  runtime.activeOwnerRef.current = owner;
  return owner;
}

function isCurrent(runtime: GateRuntime, owner: NoticeRuleOperationOwner) {
  return runtime.ownerAliveRef.current && runtime.activeOwnerRef.current?.epoch === owner.epoch;
}

function retainReceipt(runtime: GateRuntime, owner: NoticeRuleOperationOwner, receipt: NoticeRuleOperationReceipt) {
  if (isCurrent(runtime, owner) && runtime.commandRef.current !== 'idle') runtime.receiptRef.current = receipt;
}

function clearReceipt(runtime: GateRuntime, owner: NoticeRuleOperationOwner) {
  if (!isCurrent(runtime, owner)) return;
  runtime.receiptRef.current = undefined;
  runtime.setRecovery(undefined);
}

function markRecovery(
  runtime: GateRuntime,
  owner: NoticeRuleOperationOwner,
  failure: NoticeRuleOperationRecovery['failure']
) {
  if (!isCurrent(runtime, owner)) return;
  publishRecovery(runtime.ownerAliveRef.current, runtime.receiptRef.current, failure, runtime.setRecovery);
}

function endOperation(runtime: GateRuntime, owner: NoticeRuleOperationOwner) {
  if (!isCurrent(runtime, owner)) return;
  runtime.activeOwnerRef.current = undefined;
  runtime.commandRef.current = 'idle';
  runtime.setCommand(runtime.receiptRef.current ? 'recovering' : 'idle');
  runtime.setTogglingRuleId(null);
}

function retireUnauthorized(runtime: GateRuntime, capabilities: NoticeRuleActionCapabilities) {
  const ownerDenied =
    runtime.activeOwnerRef.current && !canPerformNoticeRuleAction(capabilities, runtime.activeOwnerRef.current.action);
  const receiptDenied =
    runtime.receiptRef.current && !canPerformRetainedNoticeRuleAction(capabilities, runtime.receiptRef.current);
  if (!ownerDenied && !receiptDenied) return;
  // Advancing ownership makes every late await continuation stale before it can publish or reread.
  runtime.ownerEpochRef.current += 1;
  runtime.activeOwnerRef.current = undefined;
  runtime.commandRef.current = 'idle';
  runtime.receiptRef.current = undefined;
  runtime.setCommand('idle');
  runtime.setTogglingRuleId(null);
  runtime.setRecovery(undefined);
}

function useCommandGateLifetime(runtime: GateRuntime) {
  const { activeOwnerRef, commandRef, ownerAliveRef, ownerEpochRef, receiptRef } = runtime;
  useEffect(() => {
    ownerAliveRef.current = true;
    return () => {
      ownerAliveRef.current = false;
      ownerEpochRef.current += 1;
      activeOwnerRef.current = undefined;
      commandRef.current = 'idle';
      receiptRef.current = undefined;
    };
  }, [activeOwnerRef, commandRef, ownerAliveRef, ownerEpochRef, receiptRef]);
}

function publishRecovery(
  ownerAlive: boolean,
  receipt: NoticeRuleOperationReceipt | undefined,
  failure: NoticeRuleOperationRecovery['failure'],
  publish: Dispatch<SetStateAction<NoticeRuleOperationRecovery | undefined>>
) {
  if (!ownerAlive || !receipt || receipt.phase === 'write') return;
  if (receipt.phase === 'commit-uncertain') {
    publish({ kind: receipt.kind, phase: receipt.phase, failure: 'commit-uncertain', retryable: false });
  } else if (failure !== 'commit-uncertain') {
    publish({ kind: receipt.kind, phase: receipt.phase, failure, retryable: true });
  }
}

export type NoticeRuleCommandGate = ReturnType<typeof useNoticeRuleCommandGate>;
