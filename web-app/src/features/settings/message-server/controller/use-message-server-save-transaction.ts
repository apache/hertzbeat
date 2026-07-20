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

import { useEffect, useRef, useState, type MutableRefObject } from 'react';

import { classifyMessageServerReadError } from '../api/message-server-api';
import { isDefiniteMessageServerWriteRejection } from '../api/message-server-write-rejection';

export type MessageServerSaveNotifications = {
  invalid: () => void;
  success: () => void;
  failure: (key: string) => void;
};

type SaveTransactionOptions<Draft, Evidence> = {
  draft: Draft | null;
  validate: (draft: Draft) => string[];
  write: (draft: Draft) => Promise<unknown>;
  reread: () => Promise<{ data: Evidence | undefined; error: unknown }>;
  converged: (draft: Draft, evidence: Evidence) => boolean;
  canProveAmbiguousWrite: (draft: Draft) => boolean;
  close: () => void;
  accept: (evidence: Evidence) => void;
  notifications: MessageServerSaveNotifications;
};

type SaveReceipt<Draft> = { draft: Draft; failureKey: string; retryable: boolean };
type SaveCommand = 'idle' | 'saving' | 'proving';

export function useMessageServerSaveTransaction<Draft, Evidence>(options: SaveTransactionOptions<Draft, Evidence>) {
  const runtime = useSaveTransactionRuntime<Draft>();
  return {
    close: () => {
      if (!runtime.isLocked()) options.close();
    },
    isLocked: runtime.isLocked,
    locked: runtime.command !== 'idle' || runtime.recoveryKey !== null,
    recoveryKey: runtime.recoveryKey,
    recoveryRetryable: runtime.recoveryRetryable,
    retry: () => retrySave(options, runtime),
    proving: runtime.command === 'proving',
    saving: runtime.command === 'saving',
    submit: () => submitSave(options, runtime)
  };
}

type TransactionRuntime<Draft> = {
  receiptRef: MutableRefObject<SaveReceipt<Draft> | null>;
  command: SaveCommand;
  recoveryKey: string | null;
  recoveryRetryable: boolean;
  isCurrent: (owner: symbol) => boolean;
  isLocked: () => boolean;
  begin: (command: Exclude<SaveCommand, 'idle'>) => symbol | null;
  publishReceipt: (owner: symbol, receipt: SaveReceipt<Draft> | null) => void;
  finish: (owner: symbol) => void;
};

function useSaveTransactionRuntime<Draft>(): TransactionRuntime<Draft> {
  const ownerRef = useRef<symbol | null>(null);
  const receiptRef = useRef<SaveReceipt<Draft> | null>(null);
  const mountedRef = useRef(true);
  const [command, setCommand] = useState<SaveCommand>('idle');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [recoveryRetryable, setRecoveryRetryable] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = null;
      receiptRef.current = null;
    };
  }, []);

  const isCurrent = (owner: symbol) => mountedRef.current && ownerRef.current === owner;
  // The ref closes the same-tick gap before React can render the locked state.
  const begin = (next: Exclude<SaveCommand, 'idle'>) => {
    if (!mountedRef.current || ownerRef.current) return null;
    const owner = Symbol(next);
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const publishReceipt = (owner: symbol, receipt: SaveReceipt<Draft> | null) => {
    if (!isCurrent(owner)) return;
    receiptRef.current = receipt;
    setRecoveryKey(receipt?.failureKey ?? null);
    setRecoveryRetryable(receipt?.retryable ?? false);
  };
  const finish = (owner: symbol) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const isLocked = () => ownerRef.current !== null || receiptRef.current !== null;
  return {
    receiptRef,
    command,
    recoveryKey,
    recoveryRetryable,
    isCurrent,
    isLocked,
    begin,
    publishReceipt,
    finish
  };
}

async function submitSave<Draft, Evidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: TransactionRuntime<Draft>
) {
  if (runtime.receiptRef.current) return;
  const draft = options.draft;
  if (!draft || options.validate(draft).length > 0) return options.notifications.invalid();
  const owner = runtime.begin('saving');
  if (!owner) return;
  // Publish the receipt before POST: a failed response does not prove that the
  // server rejected the write, so later submits must not silently repeat it.
  const receipt = { draft, failureKey: 'messageServer.saveNotConverged', retryable: true };
  runtime.publishReceipt(owner, receipt);
  try {
    await options.write(draft);
  } catch (error) {
    if (isDefiniteMessageServerWriteRejection(error)) {
      runtime.publishReceipt(owner, null);
      if (runtime.isCurrent(owner)) options.notifications.failure('messageServer.saveFailed');
      return runtime.finish(owner);
    }
    if (!options.canProveAmbiguousWrite(draft)) {
      const uncertain = { ...receipt, failureKey: 'messageServer.saveNotConverged', retryable: false };
      runtime.publishReceipt(owner, uncertain);
      if (runtime.isCurrent(owner)) options.notifications.failure(uncertain.failureKey);
      return runtime.finish(owner);
    }
  }
  if (!runtime.isCurrent(owner)) return;
  await proveSave(options, runtime, owner, receipt);
  runtime.finish(owner);
}

async function retrySave<Draft, Evidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: TransactionRuntime<Draft>
) {
  // Recovery is proof-only. It never repeats the write represented by receipt.
  const receipt = runtime.receiptRef.current;
  if (!receipt?.retryable) return;
  const owner = runtime.begin('proving');
  if (!owner) return;
  await proveSave(options, runtime, owner, receipt);
  runtime.finish(owner);
}

async function proveSave<Draft, Evidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: TransactionRuntime<Draft>,
  owner: symbol,
  receipt: SaveReceipt<Draft>
) {
  try {
    const evidence = await rereadAndConverge(options, receipt.draft);
    if (!runtime.isCurrent(owner)) return;
    runtime.publishReceipt(owner, null);
    options.accept(evidence);
    options.notifications.success();
  } catch (error) {
    if (!runtime.isCurrent(owner)) return;
    const failureKey = mutationErrorKey(error);
    runtime.publishReceipt(owner, { ...receipt, failureKey });
    options.notifications.failure(failureKey);
  }
}

async function rereadAndConverge<Draft, Evidence>(options: SaveTransactionOptions<Draft, Evidence>, draft: Draft) {
  const proof = await options.reread();
  if (proof.error) throw new AuthoritativeReadError(proof.error);
  if (!proof.data || !options.converged(draft, proof.data)) throw new AuthoritativeReadError(undefined, true);
  return proof.data;
}

class AuthoritativeReadError extends Error {
  constructor(
    readonly reason: unknown,
    readonly missing = false
  ) {
    super('Authoritative message server reread failed');
    this.name = 'AuthoritativeReadError';
  }
}

function mutationErrorKey(error: unknown) {
  if (!(error instanceof AuthoritativeReadError)) return 'messageServer.saveFailed';
  if (error.missing) return 'messageServer.saveNotConverged';
  return `messageServer.read.${classifyMessageServerReadError(error.reason)}`;
}
