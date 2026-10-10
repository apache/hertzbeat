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

import { apiFetch, hasBrowserSessionRefreshCoordinator, refreshBrowserSessionResult } from '@/core/http/http-client';

import {
  anonymousSession,
  sessionEnvelopeSchema,
  uiSessionSchema,
  type SessionEnvelope,
  type UiSession
} from './session-contract';

export const sessionQueryKey = ['ui-session'] as const;

export { anonymousSession } from './session-contract';
export type { UiSession } from './session-contract';

export type SessionFailureKind = 'invalid-credentials' | 'unavailable' | 'contract' | 'error';

export class SessionRequestError extends Error {
  readonly kind: SessionFailureKind;
  readonly status: number | undefined;
  override readonly cause: unknown;

  constructor(kind: SessionFailureKind, options: { status?: number; cause?: unknown } = {}) {
    super(`Session request failed: ${kind}`);
    this.name = 'SessionRequestError';
    this.kind = kind;
    this.status = options.status;
    this.cause = options.cause;
  }
}

/**
 * Only an explicit server rejection proves that the shared refresh cookie is
 * unusable. Transport, contract, and abort failures cannot retire identity.
 */
export function isDefiniteSessionRefreshFailure(reason: unknown) {
  return reason instanceof SessionRequestError && reason.kind === 'error';
}

export function getSession(options?: Pick<RequestInit, 'signal'>) {
  return mutateSession(signal => sessionRequest('/api/ui/session', { ...options, signal }, 'read'), options?.signal);
}

export function loginSession(identifier: string, credential: string) {
  return mutateSession(signal =>
    sessionRequest(
      '/api/ui/session',
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 0, identifier, credential })
      },
      'login'
    )
  );
}

export function refreshSession(options?: Pick<RequestInit, 'signal'>) {
  return mutateSession(
    signal => sessionRequest('/api/ui/session/refresh', { ...options, method: 'POST', signal }, 'refresh'),
    options?.signal
  );
}

export async function logoutSession(options?: Pick<RequestInit, 'signal'>) {
  return mutateSession(async signal => {
    const message = await readEnvelope('/api/ui/session', { ...options, method: 'DELETE', signal }, 'logout');
    if (message.data !== null) throw new SessionRequestError('contract');
  }, options?.signal);
}

/** Recover an absent access session once; the coordinator owns publication and deduplication. */
export async function getSessionWithRecovery(options: { signal?: AbortSignal; recover: () => boolean }) {
  const readOptions = { signal: options.signal ?? null };
  const session = await getSession(readOptions);
  options.signal?.throwIfAborted();
  if (session.authenticated || !options.recover() || !hasBrowserSessionRefreshCoordinator()) return session;
  const result = await refreshBrowserSessionResult({ convergence: 'local-only' });
  options.signal?.throwIfAborted();
  if (result.status === 'retired') throw new DOMException('Session owner retired', 'AbortError');
  if (result.status === 'uncertain') throw new SessionRequestError(result.failure);
  // Publication normally cancels the owning query or updates the foreground
  // snapshot. A surviving caller reads the authoritative session again.
  return result.status === 'renewed' ? getSession(readOptions) : anonymousSession;
}

const SESSION_REQUEST_DEADLINE_MS = 30_000;
let pendingSessionMutation: Promise<unknown> = Promise.resolve();

/** Bounds the local session queue; HTTP owns the single shared/exclusive cookie lock. */
function mutateSession<T>(operation: (signal: AbortSignal) => Promise<T>, caller?: AbortSignal | null): Promise<T> {
  const controller = new AbortController();
  const deadline = Date.now() + SESSION_REQUEST_DEADLINE_MS;
  const expire = () => controller.abort(new DOMException('Session request timed out', 'TimeoutError'));
  const cancel = () => controller.abort(caller?.reason);
  if (caller?.aborted) cancel();
  else caller?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(expire, SESSION_REQUEST_DEADLINE_MS);
  const signal = controller.signal;
  const checkAdmission = () => {
    // Re-check wall-clock expiry when a suspended waiter finally runs.
    if (Date.now() >= deadline && !signal.aborted) expire();
    signal.throwIfAborted();
  };
  const execute = async (): Promise<T> => {
    checkAdmission();
    return operation(signal);
  };
  const scheduled = pendingSessionMutation.then(execute, execute);
  // Do not release an active writer merely because its caller timed out.
  // The bounded signal cancels real fetch; ordering waits for its settlement.
  pendingSessionMutation = scheduled.then(
    () => undefined,
    () => undefined
  );
  let onAbort: () => void = () => undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(sessionAbortReason(signal));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  return Promise.race([scheduled, cancellation])
    .catch((reason: unknown) => {
      if (caller?.aborted) throw sessionAbortReason(caller);
      if (reason instanceof SessionRequestError) throw reason;
      throw new SessionRequestError('unavailable', { cause: reason });
    })
    .finally(() => {
      clearTimeout(timer);
      caller?.removeEventListener('abort', cancel);
      signal.removeEventListener('abort', onAbort);
    });
}

function sessionAbortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error ? reason : new DOMException('Session request cancelled', 'AbortError');
}

type SessionOperation = 'read' | 'login' | 'refresh' | 'logout';

async function sessionRequest(path: string, init: RequestInit | undefined, operation: SessionOperation) {
  const message = await readEnvelope(path, init, operation);
  return parseSession(message.data);
}

async function readEnvelope(path: string, init: RequestInit | undefined, operation: SessionOperation) {
  const response = await fetchSessionResponse(path, init);
  assertSuccessfulStatus(response, operation);
  const value = await readResponseJson(response);
  return parseEnvelope(value, response.status, operation);
}

async function fetchSessionResponse(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new SessionRequestError('unavailable', { cause });
  }
  return response;
}

function assertSuccessfulStatus(response: Response, operation: SessionOperation) {
  if (!response.ok) {
    throw new SessionRequestError(classifyHttpFailure(response.status, operation), { status: response.status });
  }
}

function classifyHttpFailure(status: number, operation: SessionOperation): SessionFailureKind {
  if (operation === 'login' && (status === 401 || status === 403)) return 'invalid-credentials';
  return status >= 500 ? 'unavailable' : 'error';
}

async function readResponseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch (cause) {
    throw new SessionRequestError('contract', { status: response.status, cause });
  }
}

function parseEnvelope(value: unknown, status: number, operation: SessionOperation): SessionEnvelope {
  const result = sessionEnvelopeSchema.safeParse(value);
  if (!result.success) throw new SessionRequestError('contract', { status });
  if (result.data.code !== 0) {
    throw new SessionRequestError(operation === 'login' ? 'invalid-credentials' : 'error', {
      status
    });
  }
  return result.data;
}

function parseSession(value: unknown): UiSession {
  const result = uiSessionSchema.safeParse(value);
  if (!result.success) throw new SessionRequestError('contract');
  return result.data;
}
