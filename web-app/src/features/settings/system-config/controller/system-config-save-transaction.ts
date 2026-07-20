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

import { useUpdate, type HttpError } from '@refinedev/core';
import { useEffect, useRef, useState } from 'react';

import { isDefiniteSystemConfigWriteRejection } from '../api/system-config-write-rejection';
import {
  systemConfigResourceId,
  systemConfigSaveConverged,
  type SystemConfigDraft,
  type SystemConfigResourceRecord,
  type SystemConfigSaveRecovery
} from '../model/system-config-model';

export type SystemConfigMutation = ReturnType<
  typeof useUpdate<SystemConfigResourceRecord, HttpError, SystemConfigDraft>
>;

export type SystemConfigCanonicalRead = () => Promise<{
  data: SystemConfigResourceRecord | undefined;
  error: unknown;
}>;

export type SystemConfigSaveNotifications = {
  notifyFailure: () => void;
  notifyRejected: () => void;
  notifySuccess: () => void;
};

type SaveTransactionOptions = SystemConfigSaveNotifications & {
  accept: (record: SystemConfigResourceRecord) => void;
  mutation: SystemConfigMutation;
  reread: SystemConfigCanonicalRead;
};

type SaveReceipt = { draft: SystemConfigDraft; recovery: SystemConfigSaveRecovery | null };
type SaveCommand = 'idle' | 'saving' | 'proving';

export function useSystemConfigSaveTransaction(options: SaveTransactionOptions) {
  const runtime = useSaveRuntime();
  const prove = async (owner: symbol, receipt: SaveReceipt) => {
    const evidence = await options.reread();
    if (!runtime.isCurrent(owner)) return;
    if (evidence.error || !evidence.data || !systemConfigSaveConverged(receipt.draft, evidence.data)) {
      runtime.publish(owner, { ...receipt, recovery: { phase: 'proof' } });
      options.notifyFailure();
      return;
    }
    completeSave(options, runtime, owner, evidence.data);
  };
  const submit = (draft: SystemConfigDraft) => submitSystemConfigSave(options, runtime, prove, draft);
  const retry = async () => {
    const receipt = runtime.receiptRef.current;
    if (receipt?.recovery?.phase !== 'proof') return;
    const owner = runtime.begin('proving', true);
    if (!owner) return;
    try {
      await prove(owner, receipt);
    } finally {
      runtime.finish(owner);
    }
  };
  return {
    isLocked: runtime.isLocked,
    proving: runtime.command === 'proving',
    recovery: runtime.recovery,
    retry,
    saving: runtime.command === 'saving' || options.mutation.mutation.isPending,
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
  if (isDefiniteSystemConfigWriteRejection(reason)) {
    runtime.publish(owner, null);
    try {
      options.notifyRejected();
    } finally {
      runtime.finish(owner);
    }
    return;
  }
  runtime.publish(owner, { ...receipt, recovery: { phase: 'proof' } });
  try {
    await prove(owner, receipt);
  } finally {
    runtime.finish(owner);
  }
}

function submitSystemConfigSave(
  options: SaveTransactionOptions,
  runtime: SaveRuntime,
  prove: (owner: symbol, receipt: SaveReceipt) => Promise<void>,
  draft: SystemConfigDraft
) {
  if (runtime.receiptRef.current) return;
  const owner = runtime.begin('saving');
  if (!owner) return;
  const receipt = { draft, recovery: null };
  runtime.receiptRef.current = receipt;
  options.mutation.mutate(buildUpdate(draft), {
    onSuccess: response => {
      if (!runtime.isCurrent(owner)) return;
      if (!systemConfigSaveConverged(receipt.draft, response.data)) {
        runtime.publish(owner, { ...receipt, recovery: { phase: 'proof' } });
        try {
          options.notifyFailure();
        } finally {
          runtime.finish(owner);
        }
        return;
      }
      try {
        completeSave(options, runtime, owner, response.data);
      } finally {
        runtime.finish(owner);
      }
    },
    onError: reason => {
      void handleSaveFailure(options, runtime, prove, owner, receipt, reason);
    }
  });
}

function completeSave(
  options: SaveTransactionOptions,
  runtime: SaveRuntime,
  owner: symbol,
  record: SystemConfigResourceRecord
) {
  runtime.publish(owner, null);
  try {
    options.accept(record);
    options.notifySuccess();
  } catch {
    options.notifyFailure();
  }
}

function buildUpdate(draft: SystemConfigDraft) {
  return {
    id: systemConfigResourceId,
    resource: 'system-config',
    dataProviderName: 'system-config',
    invalidates: ['detail'] as Array<'detail'>,
    mutationMode: 'pessimistic' as const,
    values: draft
  };
}

type SaveRuntime = ReturnType<typeof useSaveRuntime>;

function useSaveRuntime() {
  const mountedRef = useRef(true);
  const ownerRef = useRef<symbol | null>(null);
  const receiptRef = useRef<SaveReceipt | null>(null);
  const [command, setCommand] = useState<SaveCommand>('idle');
  const [recovery, setRecovery] = useState<SystemConfigSaveRecovery | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = null;
      receiptRef.current = null;
    };
  }, []);
  const isCurrent = (owner: symbol) => mountedRef.current && ownerRef.current === owner;
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
  return { begin, command, finish, isCurrent, isLocked, publish, receiptRef, recovery };
}
