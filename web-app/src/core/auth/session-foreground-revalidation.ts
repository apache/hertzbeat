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

import { anonymousSession, getSession, SessionRequestError, type UiSession } from './session-api';
import type { ReplaceSessionIdentity } from './session-identity-context';

type SessionIdentitySnapshot = {
  generation: number;
  session: UiSession | undefined;
};

type SessionRevalidationOwner = {
  generation: number;
  session: UiSession;
};

type ForegroundSessionRevalidationOptions = {
  getSnapshot: () => SessionIdentitySnapshot;
  replaceIdentity: ReplaceSessionIdentity;
};

type PendingSessionRead = {
  generation: number;
  controller: AbortController;
  promise: Promise<void>;
};

export function startForegroundSessionRevalidation({
  getSnapshot,
  replaceIdentity
}: ForegroundSessionRevalidationOptions) {
  let active = true;
  let pending: PendingSessionRead | undefined;

  function revalidate() {
    const snapshot = getSnapshot();
    if (!active || snapshot.session === undefined || pending?.generation === snapshot.generation) return;
    const owner: SessionRevalidationOwner = { generation: snapshot.generation, session: snapshot.session };
    pending?.controller.abort();
    pending = undefined;

    const controller = new AbortController();
    const promise = readAuthoritativeSession(owner, controller.signal).finally(() => {
      if (pending?.promise === promise) pending = undefined;
    });
    pending = { generation: owner.generation, controller, promise };
  }

  async function readAuthoritativeSession(owner: SessionRevalidationOwner, signal: AbortSignal) {
    try {
      const nextSession = await getSession({ signal });
      if (!ownsCurrentGeneration(owner.generation)) return;
      if (hasSessionIdentityBoundaryChanged(owner.session, nextSession)) replaceIdentity(nextSession);
    } catch (reason) {
      if (!ownsCurrentGeneration(owner.generation) || signal.aborted) return;
      if (isAuthoritativeSessionRejection(reason)) replaceIdentity(anonymousSession);
    }
  }

  function ownsCurrentGeneration(generation: number) {
    return active && getSnapshot().generation === generation;
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') revalidate();
  }

  window.addEventListener('focus', revalidate);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    active = false;
    window.removeEventListener('focus', revalidate);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    pending?.controller.abort();
    pending = undefined;
  };
}

function hasSessionIdentityBoundaryChanged(current: UiSession, next: UiSession) {
  return (
    current.authenticated !== next.authenticated ||
    current.username !== next.username ||
    current.workspaceId !== next.workspaceId ||
    current.expiresAt !== next.expiresAt ||
    !haveSameRoles(current.roles, next.roles)
  );
}

function haveSameRoles(current: string[], next: string[]) {
  if (current.length !== next.length) return false;
  const nextRoles = new Set(next);
  return current.every(role => nextRoles.has(role));
}

function isAuthoritativeSessionRejection(reason: unknown) {
  return reason instanceof SessionRequestError && (reason.status === 401 || reason.status === 403);
}
