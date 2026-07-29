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

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { refreshBrowserSessionResult } from '@/core/http/http-client';

import { SessionContext, type SessionReadFailureKind } from './session-context';
import { anonymousSession, getSession, sessionQueryKey, SessionRequestError, type UiSession } from './session-api';
import { useSessionIdentityBoundary, type ReplaceSessionIdentity } from './session-identity-context';

const MAXIMUM_EXPIRY_TIMER_MS = 2_147_483_647;

export function SessionProvider({ children }: PropsWithChildren) {
  const replaceIdentity = useSessionIdentityBoundary();
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => getSession({ signal }),
    retry: false
  });
  const expiry = useSessionExpiry(query.data, replaceIdentity);
  const visibleSession = expiry.status === 'idle' ? failClosedExpiredSession(query.data) : undefined;
  const failure = resolveSessionFailure(expiry, query.isError, query.error);
  return (
    <SessionContext.Provider
      value={{
        session: visibleSession,
        loading: query.isPending || expiry.status === 'renewing',
        failure,
        retry: () => {
          if (expiry.status === 'failed') expiry.retry();
          else void query.refetch();
        }
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

function resolveSessionFailure(state: ExpiryRenewalState, queryFailed: boolean, queryError: unknown) {
  if (state.status === 'failed') return state.failure;
  return queryFailed ? classifySessionReadFailure(queryError) : undefined;
}

function classifySessionReadFailure(error: unknown): SessionReadFailureKind {
  if (!(error instanceof SessionRequestError) || error.kind === 'invalid-credentials') return 'error';
  return error.kind;
}

function useSessionExpiry(session: UiSession | undefined, replaceIdentity: ReplaceSessionIdentity) {
  const [state, setState] = useState<ExpiryRenewalState>({ status: 'idle' });
  const retryRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: 'idle' });
    if (!session?.authenticated || !session.expiresAt) return retire;
    const expiresAt = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      replaceIdentity(anonymousSession, { convergence: 'local-only' });
      return retire;
    }

    async function renewSession() {
      if (!active) return;
      setState({ status: 'renewing' });
      const result = await refreshBrowserSessionResult({ convergence: 'local-only' });
      if (!active || result.status !== 'uncertain') return;
      setState({ status: 'failed', failure: result.failure, retry: renewSession });
    }
    retryRef.current = renewSession;

    const expireWhenDue = () => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        // Expiry renewal rotates the shared refresh cookie. Keeping this local
        // prevents peer tabs from echoing the same expiry-driven refresh.
        void renewSession();
        return;
      }
      // Browsers clamp larger delays. Re-arming avoids treating a far-future
      // valid session as expired immediately while retaining one timer owner.
      timer = setTimeout(expireWhenDue, Math.min(remainingMs, MAXIMUM_EXPIRY_TIMER_MS));
    };

    expireWhenDue();
    return retire;

    function retire() {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    }
  }, [replaceIdentity, session]);

  return state.status === 'failed' ? { ...state, retry: () => retryRef.current() } : state;
}

type ExpiryRenewalState =
  | { status: 'idle' }
  | { status: 'renewing' }
  | { status: 'failed'; failure: SessionReadFailureKind; retry: () => void };

/**
 * Authentication is fail-closed during render. The expiry effect rotates the
 * query identity, but protected children must not observe an expired cached
 * session during the render that schedules that rotation.
 */
function failClosedExpiredSession(session: UiSession | undefined) {
  if (!session?.authenticated || !session.expiresAt) return session;
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now() ? session : anonymousSession;
}
