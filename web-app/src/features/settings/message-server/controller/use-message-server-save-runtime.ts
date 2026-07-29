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

type SaveCommand = 'idle' | 'saving' | 'reloading';
type SaveAction = Exclude<SaveCommand, 'idle'>;
export type MessageServerSaveOwner = { action: SaveAction; epoch: number; signal: AbortSignal };
type RuntimeOwnership = {
  epoch: number;
  owner: MessageServerSaveOwner | null;
  abort: AbortController | null;
  mounted: boolean;
  reloadRequired: boolean;
};

export function useMessageServerSaveRuntime() {
  const [command, setCommand] = useState<SaveCommand>('idle');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [recoveryRetryable, setRecoveryRetryable] = useState(false);
  const clearRecovery = useCallback(() => {
    setRecoveryKey(null);
    setRecoveryRetryable(false);
  }, []);
  const ownership = useMessageServerRuntimeOwnership(setCommand, clearRecovery);
  const fail = (owner: MessageServerSaveOwner, key: string, reloadRequired: boolean) => {
    if (!ownership.isCurrent(owner)) return;
    ownership.setReloadRequired(reloadRequired);
    setRecoveryKey(key);
    setRecoveryRetryable(reloadRequired);
    ownership.finish(owner);
  };
  const clearFailure = (owner: MessageServerSaveOwner) => {
    if (!ownership.isCurrent(owner)) return;
    ownership.setReloadRequired(false);
    clearRecovery();
  };
  return {
    command,
    recoveryKey,
    recoveryRetryable,
    fail,
    clearFailure,
    ...ownership
  };
}

function useMessageServerRuntimeOwnership(setCommand: (command: SaveCommand) => void, clearRecovery: () => void) {
  const ownershipRef = useRef<RuntimeOwnership>({
    epoch: 0,
    owner: null,
    abort: null,
    mounted: true,
    reloadRequired: false
  });
  const retire = useCallback(() => {
    if (!invalidateOwnership(ownershipRef.current)) return;
    setCommand('idle');
    clearRecovery();
  }, [clearRecovery, setCommand]);
  useEffect(() => {
    ownershipRef.current.mounted = true;
    return () => {
      ownershipRef.current.mounted = false;
      retire();
    };
  }, [retire]);

  const isCurrent = (owner: MessageServerSaveOwner) => ownsCommand(ownershipRef.current, owner);
  const begin = (action: SaveAction) => {
    const owner = claimOwnership(ownershipRef.current, action);
    if (!owner) return null;
    setCommand(action);
    return owner;
  };
  const finish = (owner: MessageServerSaveOwner) => {
    if (!isCurrent(owner)) return;
    ownershipRef.current.owner = null;
    ownershipRef.current.abort = null;
    setCommand('idle');
  };
  return {
    isCurrent,
    begin,
    finish,
    retire,
    setReloadRequired: (required: boolean) => {
      ownershipRef.current.reloadRequired = required;
    },
    isLocked: () => ownershipRef.current.owner !== null || ownershipRef.current.reloadRequired,
    needsReload: () => ownershipRef.current.reloadRequired
  };
}

function invalidateOwnership(ownership: RuntimeOwnership) {
  const publishState = ownership.mounted;
  ownership.abort?.abort();
  ownership.abort = null;
  ownership.owner = null;
  ownership.reloadRequired = false;
  ownership.epoch += 1;
  return publishState;
}

function claimOwnership(ownership: RuntimeOwnership, action: SaveAction) {
  if (!ownership.mounted || ownership.owner) return null;
  const abort = new AbortController();
  const owner = { action, epoch: ownership.epoch + 1, signal: abort.signal };
  ownership.epoch = owner.epoch;
  ownership.owner = owner;
  ownership.abort = abort;
  return owner;
}

function ownsCommand(ownership: RuntimeOwnership, owner: MessageServerSaveOwner) {
  return ownership.mounted && ownership.owner === owner && ownership.epoch === owner.epoch;
}
