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
import { useLayoutEffect, useRef } from 'react';

import { isDefiniteSystemConfigWriteRejection } from '../api/system-config-write-rejection';
import {
  systemConfigResourceId,
  systemConfigResourceName,
  systemConfigSaveConverged,
  type SystemConfigDraft,
  type SystemConfigResourceRecord
} from '../model/system-config-model';
import {
  useSystemConfigSaveRuntime,
  type SystemConfigSaveOwner,
  type SystemConfigSaveReceipt,
  type SystemConfigSaveRuntime
} from './system-config-save-runtime';

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
  retireDraft: () => void;
};

export function useSystemConfigSaveTransaction(options: SaveTransactionOptions, canWrite: boolean) {
  const runtime = useSystemConfigSaveRuntime();
  const canWriteRef = useRef(canWrite);
  const previousCanWriteRef = useRef(canWrite);
  const { retireDraft } = options;
  const { retireWriteAccess } = runtime;
  useLayoutEffect(() => {
    canWriteRef.current = canWrite;
    const lostWriteAccess = previousCanWriteRef.current && !canWrite;
    previousCanWriteRef.current = canWrite;
    if (!lostWriteAccess) return;
    retireWriteAccess();
    retireDraft();
  }, [canWrite, retireDraft, retireWriteAccess]);
  const prove = async (owner: SystemConfigSaveOwner, receipt: SystemConfigSaveReceipt) => {
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
    if (!canWriteRef.current) return;
    const owner = runtime.begin('proof');
    if (!owner) return;
    try {
      await prove(owner, receipt);
    } finally {
      runtime.finish(owner);
    }
  };
  return {
    canWrite: () => canWriteRef.current,
    isLocked: runtime.isLocked,
    proving: runtime.command === 'proving',
    recovery: runtime.recovery,
    retry,
    saving: runtime.command === 'saving',
    submit: (draft: SystemConfigDraft) => {
      if (canWriteRef.current) submit(draft);
    }
  };
}

async function handleSaveFailure(
  options: SaveTransactionOptions,
  runtime: SystemConfigSaveRuntime,
  prove: (owner: SystemConfigSaveOwner, receipt: SystemConfigSaveReceipt) => Promise<void>,
  owner: SystemConfigSaveOwner,
  receipt: SystemConfigSaveReceipt,
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
  runtime: SystemConfigSaveRuntime,
  prove: (owner: SystemConfigSaveOwner, receipt: SystemConfigSaveReceipt) => Promise<void>,
  draft: SystemConfigDraft
) {
  if (runtime.receiptRef.current) return;
  const owner = runtime.begin('save');
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
  runtime: SystemConfigSaveRuntime,
  owner: SystemConfigSaveOwner,
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
    resource: systemConfigResourceName,
    dataProviderName: systemConfigResourceName,
    invalidates: [] as Array<'detail'>,
    mutationMode: 'pessimistic' as const,
    values: draft
  };
}
