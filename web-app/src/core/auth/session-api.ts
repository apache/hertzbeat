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

import { apiFetch } from '@/core/http/http-client';

import { sessionEnvelopeSchema, uiSessionSchema, type SessionEnvelope, type UiSession } from './session-contract';

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

export function getSession(options?: Pick<RequestInit, 'signal'>) {
  return sessionRequest('/api/ui/session', options, 'read');
}

export function loginSession(identifier: string, credential: string) {
  return sessionRequest(
    '/api/ui/session',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 0, identifier, credential })
    },
    'login'
  );
}

export function refreshSession(options?: Pick<RequestInit, 'signal'>) {
  return sessionRequest('/api/ui/session/refresh', { ...options, method: 'POST' }, 'refresh');
}

export async function logoutSession(options?: Pick<RequestInit, 'signal'>) {
  const message = await readEnvelope('/api/ui/session', { ...options, method: 'DELETE' }, 'logout');
  if (message.data !== null) throw new SessionRequestError('contract');
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
