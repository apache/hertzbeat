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

import { z } from 'zod';

import { apiFetch } from './http-client';

export type PageResult<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const apiEnvelopeSchema = z
  .object({
    code: z.number().int(),
    msg: z.string().nullable().optional(),
    data: z.unknown()
  })
  .strict();

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

export async function apiMessageGet(path: string, options?: Pick<RequestInit, 'signal'>): Promise<unknown> {
  return apiMessageRequest(path, options);
}

export function apiMessagePost(path: string, data: unknown, options?: Pick<RequestInit, 'signal'>): Promise<unknown> {
  return apiMessageRequest(path, jsonRequest('POST', data, options));
}

export function apiMessagePut(path: string, data: unknown, options?: Pick<RequestInit, 'signal'>): Promise<unknown> {
  return apiMessageRequest(path, jsonRequest('PUT', data, options));
}

export function apiMessageDelete(path: string): Promise<unknown> {
  return apiMessageRequest(path, { method: 'DELETE' });
}

async function apiMessageRequest(path: string, init?: RequestInit): Promise<unknown> {
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
  const message = await parseApiEnvelope(response);
  if (message.code !== 0) {
    throw new ApiMessageError(message.msg ?? 'Request failed', { code: message.code, status: response.status });
  }
  return message.data;
}

async function parseApiEnvelope(response: Response) {
  try {
    const result = apiEnvelopeSchema.safeParse(await response.json());
    if (result.success) return result.data;
  } catch {
    // Invalid JSON and invalid envelopes share one redacted public failure.
  }
  throw new ApiMessageError('Invalid API response', { status: response.status });
}

function jsonRequest(method: 'POST' | 'PUT', data: unknown, options?: Pick<RequestInit, 'signal'>): RequestInit {
  return {
    ...options,
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}
