/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import type { SystemConfigDraft, SystemConfigSaveRecovery } from '../model/system-config-model';

export type SystemConfigSaveReceipt = {
  draft: SystemConfigDraft;
  recovery: SystemConfigSaveRecovery | null;
};
type SystemConfigSaveCommand = 'idle' | 'saving' | 'proving';
type SystemConfigSaveAction = 'save' | 'proof';
export type SystemConfigSaveOwner = { action: SystemConfigSaveAction; epoch: number };

export type SystemConfigSaveRuntime = {
  receiptRef: MutableRefObject<SystemConfigSaveReceipt | null>;
  command: SystemConfigSaveCommand;
  recovery: SystemConfigSaveRecovery | null;
  isCurrent: (owner: SystemConfigSaveOwner) => boolean;
  isLocked: () => boolean;
  begin: (action: SystemConfigSaveAction) => SystemConfigSaveOwner | null;
  publish: (owner: SystemConfigSaveOwner, receipt: SystemConfigSaveReceipt | null) => void;
  finish: (owner: SystemConfigSaveOwner) => void;
  retireWriteAccess: () => void;
};

export function useSystemConfigSaveRuntime(): SystemConfigSaveRuntime {
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const ownerRef = useRef<SystemConfigSaveOwner | null>(null);
  const receiptRef = useRef<SystemConfigSaveReceipt | null>(null);
  const [command, setCommand] = useState<SystemConfigSaveCommand>('idle');
  const [recovery, setRecovery] = useState<SystemConfigSaveRecovery | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
      clearOwnership(ownerRef, receiptRef);
    };
  }, []);
  const isCurrent = (owner: SystemConfigSaveOwner) =>
    mountedRef.current && ownerRef.current === owner && epochRef.current === owner.epoch;
  const begin = (action: SystemConfigSaveAction) => {
    if (!mountedRef.current || ownerRef.current) return null;
    const owner = { action, epoch: epochRef.current + 1 };
    epochRef.current = owner.epoch;
    ownerRef.current = owner;
    setCommand(action === 'save' ? 'saving' : 'proving');
    return owner;
  };
  const publish = (owner: SystemConfigSaveOwner, receipt: SystemConfigSaveReceipt | null) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    setRecovery(receipt?.recovery ?? null);
  };
  const finish = (owner: SystemConfigSaveOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const isLocked = () => ownerRef.current !== null || receiptRef.current !== null;
  const retireWriteAccess = useCallback(() => {
    epochRef.current += 1;
    clearOwnership(ownerRef, receiptRef);
    setCommand('idle');
    setRecovery(null);
  }, []);
  return { receiptRef, command, recovery, isCurrent, isLocked, begin, publish, finish, retireWriteAccess };
}

function clearOwnership(
  ownerRef: MutableRefObject<SystemConfigSaveOwner | null>,
  receiptRef: MutableRefObject<SystemConfigSaveReceipt | null>
) {
  ownerRef.current = null;
  receiptRef.current = null;
}
