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

import { useLayoutEffect, useRef } from 'react';

import { classifyMessageServerReadError } from '../api/message-server-api';
import { classifyMessageServerWriteFailure } from '../api/message-server-write-rejection';
import { useMessageServerSaveRuntime, type MessageServerSaveOwner } from './use-message-server-save-runtime';

export type MessageServerSaveNotifications = {
  invalid: () => void;
  success: () => void;
  failure: (key: string) => void;
};

type RevisionEvidence = { revision: string };
type SaveTransactionOptions<Draft, Evidence extends RevisionEvidence> = {
  draft: Draft | null;
  validate: (draft: Draft) => string[];
  revision: () => string | undefined;
  write: (draft: Draft, revision: string, signal: AbortSignal) => Promise<Evidence>;
  reload: (signal: AbortSignal) => Promise<Evidence>;
  acceptWrite: (evidence: Evidence) => void;
  acceptReload: (evidence: Evidence) => void;
  close: () => void;
  notifications: MessageServerSaveNotifications;
  retireRead: () => void;
};

export function useMessageServerSaveTransaction<Draft, Evidence extends RevisionEvidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  canWrite: boolean
) {
  const runtime = useMessageServerSaveRuntime();
  const { close, retireRead } = options;
  const { retire } = runtime;
  const canWriteRef = useRef(canWrite);
  const previousCanWriteRef = useRef(canWrite);
  useLayoutEffect(() => {
    canWriteRef.current = canWrite;
    const lostWriteAccess = previousCanWriteRef.current && !canWrite;
    previousCanWriteRef.current = canWrite;
    if (!lostWriteAccess) return;
    retire();
    retireRead();
    close();
  }, [canWrite, close, retire, retireRead]);
  return {
    close: () => {
      if (runtime.isLocked()) return;
      retire();
      close();
    },
    isLocked: runtime.isLocked,
    canWrite: () => canWriteRef.current,
    locked: runtime.isLocked(),
    recoveryKey: runtime.recoveryKey,
    recoveryRetryable: runtime.recoveryRetryable,
    retry: () => (canWriteRef.current ? reloadRevision(options, runtime) : Promise.resolve()),
    proving: runtime.command === 'reloading',
    saving: runtime.command === 'saving',
    submit: () => (canWriteRef.current ? submitSave(options, runtime) : Promise.resolve())
  };
}

async function submitSave<Draft, Evidence extends RevisionEvidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: ReturnType<typeof useMessageServerSaveRuntime>
) {
  if (runtime.isLocked()) return;
  const draft = options.draft;
  if (!draft || options.validate(draft).length > 0) return options.notifications.invalid();
  const revision = options.revision();
  if (!revision) return options.notifications.failure('messageServer.revisionRequired');
  const owner = runtime.begin('saving');
  if (!owner) return;
  try {
    const evidence = await options.write(draft, revision, owner.signal);
    if (!runtime.isCurrent(owner)) return;
    runtime.clearFailure(owner);
    options.acceptWrite(evidence);
    options.notifications.success();
    runtime.finish(owner);
  } catch (error) {
    handleWriteFailure(options, runtime, owner, error);
  }
}

function handleWriteFailure<Draft, Evidence extends RevisionEvidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: ReturnType<typeof useMessageServerSaveRuntime>,
  owner: MessageServerSaveOwner,
  error: unknown
) {
  if (!runtime.isCurrent(owner)) return;
  const failure = classifyMessageServerWriteFailure(error);
  if (failure === 'rejected') {
    runtime.finish(owner);
    return options.notifications.failure('messageServer.saveFailed');
  }
  const key =
    failure === 'revision-conflict'
      ? 'messageServer.revisionConflict'
      : failure === 'revision-required'
        ? 'messageServer.revisionRequired'
        : 'messageServer.saveNotConverged';
  const reloadRequired = failure === 'revision-conflict' || failure === 'commit-uncertain';
  runtime.fail(owner, key, reloadRequired);
  options.notifications.failure(key);
}

async function reloadRevision<Draft, Evidence extends RevisionEvidence>(
  options: SaveTransactionOptions<Draft, Evidence>,
  runtime: ReturnType<typeof useMessageServerSaveRuntime>
) {
  if (!runtime.needsReload()) return;
  const owner = runtime.begin('reloading');
  if (!owner) return;
  try {
    const evidence = await options.reload(owner.signal);
    if (!runtime.isCurrent(owner)) return;
    options.acceptReload(evidence);
    runtime.clearFailure(owner);
    runtime.finish(owner);
  } catch (error) {
    if (!runtime.isCurrent(owner)) return;
    const key = `messageServer.read.${classifyMessageServerReadError(error)}`;
    runtime.fail(owner, key, true);
    options.notifications.failure(key);
  }
}
