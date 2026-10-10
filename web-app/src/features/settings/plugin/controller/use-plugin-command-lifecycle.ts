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

import { useEffect, useLayoutEffect, useRef } from 'react';

import { PluginRequestError } from '../api/plugin-api';
import type { PluginFailureKind } from '../model/plugin-model';

export function usePluginCommandLifecycle(canWrite: boolean, retire: () => void) {
  const activeRef = useRef(false);
  const authorizedRef = useRef(canWrite);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const retireRef = useRef(retire);
  useLayoutEffect(() => {
    authorizedRef.current = canWrite;
    retireRef.current = retire;
  });
  useEffect(() => {
    // React Strict Mode replays mount effects in development. Re-arm the lifecycle
    // before registering cleanup so a replay cannot permanently retire commands.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      activeRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (canWrite) return;
    generationRef.current += 1;
    activeRef.current = false;
    queueMicrotask(() => retireRef.current());
  }, [canWrite]);
  const current = (runGeneration: number) =>
    mountedRef.current && authorizedRef.current && generationRef.current === runGeneration;
  return { activeRef, authorizedRef, generationRef, current };
}

export async function executePluginCommand(
  operation: () => Promise<unknown>,
  isCurrent: () => boolean,
  reject: (failure: PluginFailureKind) => void
) {
  try {
    await operation();
    return isCurrent() ? ({ kind: 'confirmed' } as const) : ({ kind: 'stopped' } as const);
  } catch (error) {
    if (!isCurrent()) return { kind: 'stopped' } as const;
    if (error instanceof PluginRequestError && error.writeOutcome === 'uncertain') {
      return { kind: 'uncertain', failure: error.kind } as const;
    }
    reject(error instanceof PluginRequestError ? error.kind : 'error');
    return { kind: 'stopped' } as const;
  }
}
