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
import { useEffect, type PropsWithChildren } from 'react';

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
  useSessionExpiry(query.data, replaceIdentity);
  const visibleSession = failClosedExpiredSession(query.data);
  const failure = query.isError ? classifySessionReadFailure(query.error) : undefined;
  return (
    <SessionContext.Provider
      value={{
        session: visibleSession,
        loading: query.isPending,
        failure,
        retry: () => {
          void query.refetch();
        }
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

function classifySessionReadFailure(error: unknown): SessionReadFailureKind {
  if (!(error instanceof SessionRequestError) || error.kind === 'invalid-credentials') return 'error';
  return error.kind;
}

function useSessionExpiry(session: UiSession | undefined, replaceIdentity: ReplaceSessionIdentity) {
  useEffect(() => {
    if (!session?.authenticated || !session.expiresAt) return undefined;
    const expiresAt = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      replaceIdentity(anonymousSession, { convergence: 'local-only' });
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;

    const expireWhenDue = () => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        replaceIdentity(anonymousSession, { convergence: 'local-only' });
        return;
      }
      // Browsers clamp larger delays. Re-arming avoids treating a far-future
      // valid session as expired immediately while retaining one timer owner.
      timer = setTimeout(expireWhenDue, Math.min(remainingMs, MAXIMUM_EXPIRY_TIMER_MS));
    };

    expireWhenDue();
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [replaceIdentity, session]);
}

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
