/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { apiFetch } from '@/core/http/http-client';

import type { SetupErrorCode } from '../model/setup-contract';
import type { SetupAdministratorRequest } from '../model/setup-administrator';
import type {
  SetupConfigurationRequest,
  SetupExportRequest,
  SetupValidationRequest
} from '../model/setup-configuration';
import { parseSetupUnlockResponse } from './setup-access-schema';
import { parseAdministratorResponse } from './setup-administrator-schema';
import { parseConfigurationResponse, parseValidationResponse } from './setup-configuration-schema';
import { parseSetupOperation } from './setup-operation-schema';
import { parseSetupError, parseSetupStatus } from './setup-schema';

export const setupApiPaths = {
  status: '/api/setup/status',
  unlock: '/api/setup/unlock',
  operation: (operationId: string) => `/api/setup/operations/${encodeURIComponent(operationId)}`,
  validate: '/api/setup/validate',
  configuration: '/api/setup/configuration',
  administrator: '/api/setup/administrator',
  export: '/api/setup/export'
};

const readOptions: RequestInit = { method: 'GET', credentials: 'include', cache: 'no-store' };

export async function loadSetupStatus(signal?: AbortSignal) {
  const response = await request(setupApiPaths.status, withSignal(readOptions, signal));
  return parseSetupStatus(await responseJson(response));
}

export async function loadSetupOperation(operationId: string, signal?: AbortSignal) {
  const response = await request(setupApiPaths.operation(operationId), withSignal(readOptions, signal));
  return parseSetupOperation(await responseJson(response));
}

export async function unlockSetup(code: string, signal?: AbortSignal) {
  const response = await request(setupApiPaths.unlock, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    ...(signal ? { signal } : {})
  });
  return parseSetupUnlockResponse(await responseJson(response));
}

export async function validateSetupSection(value: SetupValidationRequest, signal?: AbortSignal) {
  const response = await request(setupApiPaths.validate, post(value, signal));
  return parseValidationResponse(await responseJson(response));
}

export async function configureSetup(value: SetupConfigurationRequest, signal?: AbortSignal) {
  const response = await request(setupApiPaths.configuration, post(value, signal));
  return parseConfigurationResponse(await responseJson(response));
}

export async function createSetupAdministrator(value: SetupAdministratorRequest, signal?: AbortSignal) {
  const response = await request(setupApiPaths.administrator, post(value, signal));
  return parseAdministratorResponse(await responseJson(response));
}

export type SetupExportArtifact = { blob: Blob; fileName: string; mediaType: string };

export async function exportSetupConfiguration(
  value: SetupExportRequest,
  signal?: AbortSignal
): Promise<SetupExportArtifact> {
  const response = await request(setupApiPaths.export, post(value, signal));
  const metadata = attachmentMetadata(response.headers);
  return { ...metadata, blob: await response.blob() };
}

export class SetupRequestError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'http' | 'contract',
    readonly status?: number,
    readonly errorCode?: SetupErrorCode
  ) {
    super('Setup request failed');
    this.name = 'SetupRequestError';
  }
}

async function request(path: string, init: RequestInit) {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch (error) {
    throw normalizeTransportFailure(error);
  }
  if (response.ok) return response;
  throw await httpFailure(response);
}

async function httpFailure(response: Response) {
  let errorCode: SetupErrorCode | undefined;
  try {
    errorCode = parseSetupError(await response.json()).errorCode;
  } catch {
    // Error bodies are optional transport evidence; never expose raw server content.
  }
  return new SetupRequestError('http', response.status, errorCode);
}

async function responseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new SetupRequestError('contract', response.status);
  }
}

function withSignal(options: RequestInit, signal?: AbortSignal): RequestInit {
  return signal ? { ...options, signal } : options;
}

function post(
  body: SetupValidationRequest | SetupConfigurationRequest | SetupExportRequest | SetupAdministratorRequest,
  signal?: AbortSignal
): RequestInit {
  return {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {})
  };
}

function attachmentMetadata(headers: Headers) {
  const disposition = headers.get('Content-Disposition') ?? '';
  const mediaType = (headers.get('Content-Type') ?? '').split(';', 1)[0]?.trim() ?? '';
  const noStore = (headers.get('Cache-Control') ?? '').toLowerCase().includes('no-store');
  const fileName = /^attachment;\s*filename="([A-Za-z0-9._-]+)"$/i.exec(disposition)?.[1];
  if (!noStore || !fileName || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mediaType)) {
    throw new SetupRequestError('contract');
  }
  return { fileName, mediaType };
}

function isAbortError(error: unknown): error is Error & { name: 'AbortError' } {
  return error instanceof Error && error.name === 'AbortError';
}

function normalizeTransportFailure(error: unknown) {
  if (isAbortError(error)) return error;
  return new SetupRequestError('unavailable');
}
