/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isObjectStoreWriteRejection } from '../model/object-store-failure';
import {
  canProveAmbiguousObjectStoreSave,
  objectStoreSaveConverged,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord,
  type ObjectStoreSaveRecovery
} from '../model/object-store-model';

type ObjectStoreUpdateResult = { data: ObjectStoreResourceRecord };

/** Minimal command port; deliberately independent from React Query mutation state. */
export type ObjectStoreMutation = {
  mutate: (
    draft: ObjectStoreDraft,
    callbacks: {
      onError: (reason: unknown) => void;
      onSuccess: (result: ObjectStoreUpdateResult) => void;
    }
  ) => void;
};

export type ObjectStoreCanonicalRead = () => Promise<{
  data: ObjectStoreResourceRecord | undefined;
  error: unknown;
}>;

export type ObjectStoreSaveNotifications = {
  notifyFailure: () => void;
  notifyRejected: () => void;
  notifySuccess: () => void;
};

type SaveTransactionOptions = ObjectStoreSaveNotifications & {
  accept: (record: ObjectStoreResourceRecord) => void;
  mutation: ObjectStoreMutation;
  reread: ObjectStoreCanonicalRead;
};

type SaveReceipt = { draft: ObjectStoreDraft; recovery: ObjectStoreSaveRecovery | null };
type SaveCommand = 'idle' | 'saving' | 'proving';

export function useObjectStoreSaveTransaction(options: SaveTransactionOptions) {
  const runtime = useSaveRuntime();
  const prove = async (owner: symbol, receipt: SaveReceipt) => {
    const evidence = await options.reread();
    if (!runtime.isCurrent(owner)) return;
    if (evidence.error || !evidence.data || !objectStoreSaveConverged(receipt.draft, evidence.data)) {
      runtime.publish(owner, { ...receipt, recovery: { phase: 'proof' } });
      options.notifyFailure();
      return;
    }
    runtime.publish(owner, null);
    options.accept(evidence.data);
    options.notifySuccess();
  };
  const submit = (draft: ObjectStoreDraft) => submitObjectStoreSave(options, runtime, prove, draft);
  const retry = async () => {
    const receipt = runtime.receiptRef.current;
    if (receipt?.recovery?.phase !== 'proof') return;
    const owner = runtime.begin('proving', true);
    if (!owner) return;
    await prove(owner, receipt);
    runtime.finish(owner);
  };
  return {
    isLocked: runtime.isLocked,
    proving: runtime.command === 'proving',
    recovery: runtime.recovery,
    retireWriteAccess: runtime.retireWriteAccess,
    retry,
    saving: runtime.command === 'saving',
    submit
  };
}

async function handleSaveFailure(
  options: SaveTransactionOptions,
  runtime: SaveRuntime,
  prove: (owner: symbol, receipt: SaveReceipt) => Promise<void>,
  owner: symbol,
  receipt: SaveReceipt,
  reason: unknown
) {
  if (!runtime.isCurrent(owner)) return;
  if (isObjectStoreWriteRejection(reason)) {
    runtime.publish(owner, null);
    options.notifyRejected();
    runtime.finish(owner);
    return;
  }
  if (!canProveAmbiguousObjectStoreSave(receipt.draft)) {
    runtime.publish(owner, { ...receipt, recovery: { phase: 'commit-uncertain' } });
    options.notifyFailure();
    runtime.finish(owner);
    return;
  }
  runtime.publish(owner, { ...receipt, recovery: { phase: 'proof' } });
  await prove(owner, receipt);
  runtime.finish(owner);
}

function submitObjectStoreSave(
  options: SaveTransactionOptions,
  runtime: SaveRuntime,
  prove: (owner: symbol, receipt: SaveReceipt) => Promise<void>,
  draft: ObjectStoreDraft
) {
  if (runtime.receiptRef.current) return;
  const owner = runtime.begin('saving');
  if (!owner) return;
  const receipt = { draft, recovery: null };
  runtime.receiptRef.current = receipt;
  options.mutation.mutate(draft, {
    onSuccess: result => {
      if (!runtime.isCurrent(owner)) return;
      runtime.publish(owner, null);
      options.accept(result.data);
      options.notifySuccess();
      runtime.finish(owner);
    },
    onError: reason => {
      void handleSaveFailure(options, runtime, prove, owner, receipt, reason);
    }
  });
}

type SaveRuntime = ReturnType<typeof useSaveRuntime>;

function useSaveRuntime() {
  const mountedRef = useRef(true);
  const ownerRef = useRef<symbol | null>(null);
  const receiptRef = useRef<SaveReceipt | null>(null);
  const [command, setCommand] = useState<SaveCommand>('idle');
  const [recovery, setRecovery] = useState<ObjectStoreSaveRecovery | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = null;
      receiptRef.current = null;
    };
  }, []);
  const isCurrent = (owner: symbol) => mountedRef.current && ownerRef.current === owner;
  const retireWriteAccess = useCallback(() => {
    ownerRef.current = null;
    receiptRef.current = null;
    setCommand('idle');
    setRecovery(null);
  }, []);
  const begin = (next: Exclude<SaveCommand, 'idle'>, allowReceipt = false) => {
    if (!mountedRef.current || ownerRef.current || (!allowReceipt && receiptRef.current)) return null;
    const owner = Symbol(next);
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const publish = (owner: symbol, receipt: SaveReceipt | null) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    setRecovery(receipt?.recovery ?? null);
  };
  const finish = (owner: symbol) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const isLocked = () => ownerRef.current !== null || receiptRef.current !== null;
  return { begin, command, finish, isCurrent, isLocked, publish, receiptRef, recovery, retireWriteAccess };
}
