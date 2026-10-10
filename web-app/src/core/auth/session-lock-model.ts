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

import { defaultAuthenticatedPath, safeRedirectTarget } from './navigation';
import type { UiSession } from './session-api';

export const sessionLockMarkerVersion = 1 as const;
export const sessionLockMarkerLimits = { identity: 256, returnTo: 4096 } as const;

// This non-secret marker owns a UX re-auth prompt, not a server-side security boundary.
export type SessionLockMarker = {
  version: typeof sessionLockMarkerVersion;
  username: string;
  workspaceId: string;
  returnTo: string;
};
export type SessionLockMarkerRead =
  { kind: 'absent' } | { kind: 'invalid' } | { kind: 'valid'; marker: SessionLockMarker };
export type SessionLockFailure = 'invalid-credentials' | 'unavailable' | 'session-expired' | 'contract' | 'error';
export type SessionLockAdmission =
  | { kind: 'unlocked' }
  | { kind: 'session-expired' }
  | { kind: 'contract' }
  | { kind: 'ready'; marker: SessionLockMarker };

export function buildSessionLockMarker(session: UiSession, returnTo: string): SessionLockMarker | null {
  if (!session.authenticated || !session.username || !session.workspaceId) return null;
  return {
    version: sessionLockMarkerVersion,
    username: session.username,
    workspaceId: session.workspaceId,
    returnTo: safeRedirectTarget(returnTo) ?? defaultAuthenticatedPath
  };
}

export function resolveSessionLockAdmission(read: SessionLockMarkerRead, session: UiSession): SessionLockAdmission {
  if (read.kind === 'absent') return { kind: 'unlocked' };
  if (read.kind === 'invalid') return { kind: 'contract' };
  if (!session.authenticated || !session.username || !session.workspaceId) return { kind: 'session-expired' };
  if (read.marker.username !== session.username || read.marker.workspaceId !== session.workspaceId) {
    return { kind: 'contract' };
  }
  return { kind: 'ready', marker: read.marker };
}

export function sessionLockFailureMessageKey(failure: SessionLockFailure) {
  if (failure === 'invalid-credentials') return 'auth.lock.invalidCredentials';
  if (failure === 'unavailable') return 'common.unavailable';
  if (failure === 'session-expired') return 'auth.lock.sessionExpired';
  if (failure === 'contract') return 'common.routeError.description';
  return 'common.routeError.title';
}
