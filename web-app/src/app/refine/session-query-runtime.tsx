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

import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import { createSessionQueryClient } from '@/core/auth/session-cache-boundary';
import { anonymousSession, refreshSession, type UiSession } from '@/core/auth/session-api';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { registerBrowserSessionRefreshCoordinator } from '@/core/http/http-client';

export type SessionQueryRuntimeValue = {
  generation: number;
  queryClient: QueryClient;
};

type SessionQueryRuntimeProps = {
  children: (runtime: SessionQueryRuntimeValue) => ReactNode;
  createQueryClient: () => QueryClient;
};

type PendingSessionRefresh = {
  generation: number;
  promise: Promise<boolean>;
};

export function SessionQueryRuntime({ children, createQueryClient }: SessionQueryRuntimeProps) {
  const [runtime, setRuntime] = useState<SessionQueryRuntimeValue>(() => ({
    generation: 0,
    queryClient: createQueryClient()
  }));
  const runtimeRef = useRef(runtime);
  const mountedRef = useRef(true);
  const refreshRequestRef = useRef<PendingSessionRefresh | undefined>(undefined);
  const replaceIdentity = useCallback(
    (nextSession: UiSession) => {
      if (!mountedRef.current) return;
      const previousClient = runtimeRef.current.queryClient;
      const nextRuntime = {
        generation: runtimeRef.current.generation + 1,
        queryClient: createSessionQueryClient(createQueryClient, nextSession)
      };

      // Synchronous detachment prevents previous-generation mutation callbacks
      // from becoming visible before React mounts the isolated client.
      flushSync(() => {
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
      });
      previousClient.clear();
    },
    [createQueryClient]
  );

  const refreshIdentity = useCallback(() => {
    async function refreshIdentityGeneration(generation: number) {
      try {
        const refreshedSession = await refreshSession();
        if (!mountedRef.current || runtimeRef.current.generation !== generation) return false;
        replaceIdentity(refreshedSession);
        return refreshedSession.authenticated;
      } catch {
        if (!mountedRef.current || runtimeRef.current.generation !== generation) return false;
        replaceIdentity(anonymousSession);
        return false;
      }
    }

    if (!mountedRef.current) return Promise.resolve(false);
    const ownerGeneration = runtimeRef.current.generation;
    const pendingRefresh = refreshRequestRef.current;
    if (pendingRefresh?.generation === ownerGeneration) return pendingRefresh.promise;

    const refreshPromise = refreshIdentityGeneration(ownerGeneration).finally(() => {
      if (refreshRequestRef.current?.promise === refreshPromise) refreshRequestRef.current = undefined;
    });
    refreshRequestRef.current = { generation: ownerGeneration, promise: refreshPromise };
    return refreshPromise;
  }, [replaceIdentity]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    const unregister = registerBrowserSessionRefreshCoordinator(refreshIdentity);
    return () => {
      mountedRef.current = false;
      unregister();
    };
  }, [refreshIdentity]);

  return <SessionIdentityProvider replaceIdentity={replaceIdentity}>{children(runtime)}</SessionIdentityProvider>;
}
