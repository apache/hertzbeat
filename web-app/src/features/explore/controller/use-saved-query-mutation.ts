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

import { ApiMessageError } from '@/core/http/api-message';
import { useLayoutEffect, useRef, useState } from 'react';
import { useSourceScopedValue } from '@/shared/query-context';

type SavedQueryWriteAction = 'save' | 'delete';
type SavedQueryWriteError = 'revisionConflict' | 'writeFailed' | 'savePermission' | 'deletePermission';

/** A completed write may refresh shared data but cannot replace a newer query/editor. */
export function useSavedQueryMutation(source: string, canWrite: boolean, refresh: () => void) {
  const [busy, setBusy] = useState(false);
  const { value: error, setValue: setError } = useSourceScopedValue<SavedQueryWriteError | undefined>(
    `${source}:${canWrite}`,
    undefined
  );
  const { value: owner } = useSourceScopedValue(`${source}:${canWrite}`, { canWrite });
  const authority = useRef<typeof owner>();
  const pending = useRef(false);
  useLayoutEffect(() => {
    authority.current = owner;
    return () => {
      authority.current = undefined;
    };
  }, [owner]);
  const mutate = async (
    write: () => Promise<unknown>,
    succeeded: () => void,
    action: SavedQueryWriteAction = 'save'
  ) => {
    if (pending.current || !owner.canWrite || authority.current !== owner) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await write();
      refresh();
      if (authority.current === owner) succeeded();
    } catch (failure) {
      if (authority.current === owner) setError(savedQueryWriteError(failure, action));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, error, pending, mutate, clearError: () => setError(undefined) };
}

function savedQueryWriteError(failure: unknown, action: SavedQueryWriteAction): SavedQueryWriteError {
  if (!(failure instanceof ApiMessageError)) return 'writeFailed';
  if (failure.status === 409) return 'revisionConflict';
  if (failure.status === 401 || failure.status === 403)
    return action === 'delete' ? 'deletePermission' : 'savePermission';
  return 'writeFailed';
}
