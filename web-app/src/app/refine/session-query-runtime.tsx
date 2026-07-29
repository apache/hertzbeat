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

import { createCheckingSessionQueryClient, createSessionQueryClient } from '@/core/auth/session-cache-boundary';
import { createSessionConvergenceChannel } from '@/core/auth/session-convergence-channel';
import {
  anonymousSession,
  isDefiniteSessionRefreshFailure,
  refreshSession,
  SessionRequestError,
  type UiSession
} from '@/core/auth/session-api';
import type { ReplaceSessionIdentity, ReplaceSessionIdentityOptions } from '@/core/auth/session-identity-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import {
  registerBrowserSessionRefreshCoordinator,
  type BrowserSessionRefreshOptions,
  type BrowserSessionRefreshResult
} from '@/core/http/http-client';

export type SessionQueryRuntimeValue = {
  generation: number;
  queryClient: QueryClient;
};

type SessionConvergenceChannel = ReturnType<typeof createSessionConvergenceChannel>;

type SessionQueryRuntimeProps = {
  children: (runtime: SessionQueryRuntimeValue) => ReactNode;
  createQueryClient: () => QueryClient;
};

type PendingSessionRefresh = {
  generation: number;
  promise: Promise<BrowserSessionRefreshResult>;
};

export function SessionQueryRuntime({ children, createQueryClient }: SessionQueryRuntimeProps) {
  const { runtime, runtimeRef, mountedRef, convergenceRef, replaceIdentity, convergeExternalIdentity } =
    useSessionClientGeneration(createQueryClient);
  const refreshIdentity = useSessionRefresh(runtimeRef, mountedRef, replaceIdentity);

  useLayoutEffect(() => {
    mountedRef.current = true;
    const convergence = createSessionConvergenceChannel(convergeExternalIdentity);
    convergenceRef.current = convergence;
    const unregister = registerBrowserSessionRefreshCoordinator(refreshIdentity);
    return () => {
      mountedRef.current = false;
      convergenceRef.current = undefined;
      convergence.close();
      unregister();
    };
  }, [convergeExternalIdentity, convergenceRef, mountedRef, refreshIdentity]);

  return <SessionIdentityProvider replaceIdentity={replaceIdentity}>{children(runtime)}</SessionIdentityProvider>;
}

function useSessionClientGeneration(createQueryClient: () => QueryClient) {
  const [runtime, setRuntime] = useState<SessionQueryRuntimeValue>(() => ({
    generation: 0,
    queryClient: createQueryClient()
  }));
  const runtimeRef = useRef(runtime);
  const mountedRef = useRef(true);
  const convergenceRef = useRef<SessionConvergenceChannel | undefined>(undefined);
  const rotateClient = useCallback((nextClient: QueryClient, flushImmediately = true) => {
    if (!mountedRef.current) return;
    const previousClient = runtimeRef.current.queryClient;
    const nextRuntime = {
      generation: runtimeRef.current.generation + 1,
      queryClient: nextClient
    };

    // Synchronous detachment prevents previous-generation mutation callbacks
    // from becoming visible before React mounts the isolated client.
    runtimeRef.current = nextRuntime;
    if (flushImmediately) flushSync(() => setRuntime(nextRuntime));
    else setRuntime(nextRuntime);
    previousClient.clear();
  }, []);
  const replaceIdentity = useCallback(
    (nextSession: UiSession, options?: ReplaceSessionIdentityOptions) => {
      if (!mountedRef.current) return;
      const announce = options?.convergence !== 'local-only';
      rotateClient(createSessionQueryClient(createQueryClient, nextSession), announce);
      if (announce) convergenceRef.current?.broadcast();
    },
    [createQueryClient, rotateClient]
  );
  const convergeExternalIdentity = useCallback(() => {
    if (!mountedRef.current) return;
    rotateClient(createCheckingSessionQueryClient(createQueryClient));
  }, [createQueryClient, rotateClient]);
  return { runtime, runtimeRef, mountedRef, convergenceRef, replaceIdentity, convergeExternalIdentity };
}

function useSessionRefresh(
  runtimeRef: Current<SessionQueryRuntimeValue>,
  mountedRef: Current<boolean>,
  replaceIdentity: ReplaceSessionIdentity
) {
  const refreshRequestRef = useRef<PendingSessionRefresh | undefined>(undefined);
  const refreshIdentity = useCallback(
    (options?: BrowserSessionRefreshOptions) => {
      async function refreshIdentityGeneration(generation: number) {
        try {
          const refreshedSession = await refreshSession();
          if (!mountedRef.current || runtimeRef.current.generation !== generation) {
            return { status: 'retired' } satisfies BrowserSessionRefreshResult;
          }
          replaceIdentity(refreshedSession, options);
          return {
            status: refreshedSession.authenticated ? 'renewed' : 'rejected'
          } satisfies BrowserSessionRefreshResult;
        } catch (reason) {
          if (!mountedRef.current || runtimeRef.current.generation !== generation) {
            return { status: 'retired' } satisfies BrowserSessionRefreshResult;
          }
          if (isDefiniteSessionRefreshFailure(reason)) {
            replaceIdentity(anonymousSession, options);
            return { status: 'rejected' } satisfies BrowserSessionRefreshResult;
          }
          return {
            status: 'uncertain',
            failure: classifyUncertainSessionRefreshFailure(reason)
          } satisfies BrowserSessionRefreshResult;
        }
      }

      if (!mountedRef.current) {
        return Promise.resolve({ status: 'retired' } satisfies BrowserSessionRefreshResult);
      }
      const ownerGeneration = runtimeRef.current.generation;
      const pendingRefresh = refreshRequestRef.current;
      if (pendingRefresh?.generation === ownerGeneration) return pendingRefresh.promise;

      const refreshPromise = refreshIdentityGeneration(ownerGeneration).finally(() => {
        if (refreshRequestRef.current?.promise === refreshPromise) refreshRequestRef.current = undefined;
      });
      refreshRequestRef.current = { generation: ownerGeneration, promise: refreshPromise };
      return refreshPromise;
    },
    [mountedRef, replaceIdentity, runtimeRef]
  );
  return refreshIdentity;
}

function classifyUncertainSessionRefreshFailure(reason: unknown) {
  if (reason instanceof SessionRequestError && (reason.kind === 'unavailable' || reason.kind === 'contract')) {
    return reason.kind;
  }
  return 'error';
}

type Current<T> = { current: T };
