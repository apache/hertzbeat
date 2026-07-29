/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import {
  bulletinRecoveryOperation,
  createBulletinOutcomeNotice,
  type BulletinCommand,
  type BulletinOutcomeNotice,
  type BulletinRecovery,
  type BulletinRecoveryOperation
} from '../model/bulletin-operation-state';

export type BulletinOperationOwner = {
  command: Exclude<BulletinCommand, 'idle'>;
  operation: BulletinRecoveryOperation;
};

function useBulletinGateStore() {
  const mounted = useRef(true);
  const owner = useRef<BulletinOperationOwner | undefined>(undefined);
  const recovery = useRef<BulletinRecovery | null>(null);
  const notice = useRef<BulletinOutcomeNotice | null>(null);
  const [commandState, setCommand] = useState<BulletinCommand>('idle');
  const [recoveryState, setRecovery] = useState<BulletinRecovery | null>(null);
  const [noticeState, setNotice] = useState<BulletinOutcomeNotice | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      owner.current = undefined;
      recovery.current = null;
      notice.current = null;
    };
  }, []);
  return {
    commandState,
    mounted,
    notice,
    noticeState,
    owner,
    recovery,
    recoveryState,
    setCommand,
    setNotice,
    setRecovery
  };
}

type GateStore = ReturnType<typeof useBulletinGateStore>;

function createOwnership(store: GateStore) {
  const replace = (command: BulletinOperationOwner['command'], operation: BulletinRecoveryOperation) => {
    const owner = { command, operation };
    store.owner.current = owner;
    store.setCommand(command);
    return owner;
  };
  const isCurrent = (owner: BulletinOperationOwner) => store.mounted.current && store.owner.current === owner;
  const retireOwner = (operation: BulletinRecoveryOperation) => {
    if (store.owner.current?.operation !== operation) return false;
    store.owner.current = undefined;
    store.setCommand('idle');
    return true;
  };
  return {
    begin: (command: 'saving' | 'deleting') =>
      !store.mounted.current || store.owner.current || store.recovery.current
        ? undefined
        : replace(command, command === 'deleting' ? 'delete' : 'save'),
    end: (owner: BulletinOperationOwner) => {
      if (isCurrent(owner)) retireOwner(owner.operation);
    },
    isCommandActive: () => store.owner.current !== undefined,
    isCurrent,
    replace,
    retireOwner
  };
}

function createRecoveryOwnership(store: GateStore, ownership: ReturnType<typeof createOwnership>) {
  const publish = (owner: BulletinOperationOwner, next: BulletinRecovery | null) => {
    if (!ownership.isCurrent(owner)) return false;
    store.recovery.current = next;
    store.setRecovery(next);
    return true;
  };
  const cancel = (operation?: BulletinRecoveryOperation) => {
    const current = store.recovery.current;
    if (!store.mounted.current || !current || (operation && bulletinRecoveryOperation(current) !== operation)) {
      return false;
    }
    store.owner.current = undefined;
    store.recovery.current = null;
    store.setCommand('idle');
    store.setRecovery(null);
    const notice = createBulletinOutcomeNotice(current);
    store.notice.current = notice;
    store.setNotice(notice);
    return true;
  };
  const dismiss = () => {
    if (!store.mounted.current || !store.notice.current) return false;
    store.notice.current = null;
    store.setNotice(null);
    return true;
  };
  return { cancel, dismiss, publish };
}

export function useBulletinOperationGate() {
  const store = useBulletinGateStore();
  const ownership = createOwnership(store);
  const recoveryOwnership = createRecoveryOwnership(store, ownership);
  return {
    begin: ownership.begin,
    beginRecovery: () => {
      const recovery = store.recovery.current;
      if (!store.mounted.current || store.owner.current || !recovery) return undefined;
      return { owner: ownership.replace('recovering', bulletinRecoveryOperation(recovery)), recovery };
    },
    cancelRecovery: recoveryOwnership.cancel,
    clearRecovery: (owner: BulletinOperationOwner) => recoveryOwnership.publish(owner, null),
    command: store.commandState,
    dismissNotice: recoveryOwnership.dismiss,
    end: ownership.end,
    getRecovery: () => store.recovery.current,
    isCommandActive: ownership.isCommandActive,
    isCurrent: ownership.isCurrent,
    isLocked: () => store.owner.current !== undefined || store.recovery.current !== null,
    notice: store.noticeState,
    recovery: store.recoveryState,
    retire: (operation: BulletinRecoveryOperation) =>
      recoveryOwnership.cancel(operation) || ownership.retireOwner(operation),
    setRecovery: (owner: BulletinOperationOwner, next: BulletinRecovery) => recoveryOwnership.publish(owner, next)
  };
}

export type BulletinOperationGate = ReturnType<typeof useBulletinOperationGate>;
