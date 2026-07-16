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

import { apiFetch } from './http-client';

export type PageResult<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type ApiMessage<T> = { code: number; msg?: string; data: T };

type ApiMessageErrorDetails = {
  code?: number;
  status?: number;
  cause?: unknown;
};

export class ApiMessageError extends Error {
  readonly code: number | undefined;
  readonly status: number | undefined;
  override readonly cause: unknown;

  constructor(message: string, details: ApiMessageErrorDetails = {}) {
    super(message);
    this.name = 'ApiMessageError';
    this.code = details.code;
    this.status = details.status;
    this.cause = details.cause;
  }
}

export async function apiMessageGet<T>(path: string, options?: Pick<RequestInit, 'signal'>) {
  return apiMessageRequest<T>(path, options);
}

export function apiMessagePost<T>(path: string, data: unknown, options?: Pick<RequestInit, 'signal'>) {
  return apiMessageRequest<T>(path, jsonRequest('POST', data, options));
}

export function apiMessagePut<T>(path: string, data: unknown, options?: Pick<RequestInit, 'signal'>) {
  return apiMessageRequest<T>(path, jsonRequest('PUT', data, options));
}

export function apiMessageDelete<T>(path: string) {
  return apiMessageRequest<T>(path, { method: 'DELETE' });
}

async function apiMessageRequest<T>(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Request failed';
    throw new ApiMessageError(message, { cause });
  }
  if (!response.ok) {
    throw new ApiMessageError(`Request failed with status ${response.status}`, { status: response.status });
  }
  const message = (await response.json()) as ApiMessage<T>;
  if (message.code !== 0) {
    throw new ApiMessageError(message.msg ?? 'Request failed', { code: message.code, status: response.status });
  }
  return message.data;
}

function jsonRequest(method: 'POST' | 'PUT', data: unknown, options?: Pick<RequestInit, 'signal'>): RequestInit {
  return {
    ...options,
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}
