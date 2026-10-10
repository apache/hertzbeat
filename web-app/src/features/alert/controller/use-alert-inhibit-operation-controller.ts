/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
    return { kind: 'save', phase: 'commit-uncertain', retryable: true };
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
