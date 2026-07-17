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

export type UiSession = {
  authenticated: boolean;
  username: string | null;
  roles: string[];
  workspaceId: string | null;
  expiresAt: string | null;
};

export const sessionQueryKey = ['ui-session'] as const;

export const anonymousSession: UiSession = {
  authenticated: false,
  username: null,
  roles: [],
  workspaceId: null,
  expiresAt: null
};

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
  return sessionRequest('/api/ui/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 0, identifier, credential })
  }, 'login');
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
    return await response.json() as unknown;
  } catch (cause) {
    throw new SessionRequestError('contract', { status: response.status, cause });
  }
}

function parseEnvelope(value: unknown, status: number, operation: SessionOperation): SessionEnvelope {
  if (!isSessionEnvelope(value)) {
    throw new SessionRequestError('contract', { status });
  }
  if (value.code !== 0) {
    throw new SessionRequestError(operation === 'login' ? 'invalid-credentials' : 'error', {
      status
    });
  }
  return value;
}

function parseSession(value: unknown): UiSession {
  const keys = ['authenticated', 'username', 'roles', 'workspaceId', 'expiresAt'];
  if (!isRecord(value) || !hasExactKeys(value, keys) || typeof value.authenticated !== 'boolean') {
    throw new SessionRequestError('contract');
  }
  const roles = parseRoles(value.roles);
  const username = parseNullableString(value.username);
  const workspaceId = parseNullableString(value.workspaceId);
  const expiresAt = parseExpiration(value.expiresAt);
  assertSessionIdentity(value.authenticated, username, roles, workspaceId, expiresAt);
  return {
    authenticated: value.authenticated,
    username,
    roles,
    workspaceId,
    expiresAt
  };
}

type SessionEnvelope = { code: number; data: unknown; msg?: string | null };

function isSessionEnvelope(value: unknown): value is SessionEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, ['code', 'data'], ['msg'])) return false;
  if (typeof value.code !== 'number' || !Number.isInteger(value.code)) return false;
  return !('msg' in value) || value.msg === null || typeof value.msg === 'string';
}

function parseRoles(value: unknown): string[] {
  if (!isStringArray(value) || new Set(value).size !== value.length) {
    throw new SessionRequestError('contract');
  }
  return [...value];
}

function parseNullableString(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value;
  throw new SessionRequestError('contract');
}

function parseExpiration(value: unknown): string | null {
  const expiresAt = parseNullableString(value);
  if (expiresAt !== null && !Number.isFinite(Date.parse(expiresAt))) {
    throw new SessionRequestError('contract');
  }
  return expiresAt;
}

function assertSessionIdentity(
  authenticated: boolean,
  username: string | null,
  roles: string[],
  workspaceId: string | null,
  expiresAt: string | null
) {
  if (authenticated && (!username?.trim() || !workspaceId?.trim())) {
    throw new SessionRequestError('contract');
  }
  if (!authenticated && (username !== null || roles.length !== 0 || workspaceId !== null || expiresAt !== null)) {
    throw new SessionRequestError('contract');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return isUnknownArray(value) && value.every(isString);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function hasExactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []) {
  const keys = Object.keys(value);
  return required.every(key => keys.includes(key))
    && keys.every(key => required.includes(key) || optional.includes(key));
}
