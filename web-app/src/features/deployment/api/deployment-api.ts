/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { apiFetch } from '@/core/http/http-client';

import type {
  DeploymentErrorCode,
  ExportResponse,
  MigrationActivateRequest,
  MigrationExportRequest,
  MigrationStartRequest,
  MigrationValidationRequest
} from '../model/deployment-contract';
import { DEPLOYMENT_ERROR_CODES } from '../model/deployment-contract';
import { parseDeploymentView, parseMigrationValidation, parseMigrationView } from './deployment-schema';

const deploymentApiPaths = {
  root: '/api/config/deployment',
  validate: '/api/config/deployment/validate',
  migrations: '/api/config/deployment/metadata-migrations',
  migration: (operationId: string) => `/api/config/deployment/metadata-migrations/${encodeURIComponent(operationId)}`,
  activate: (operationId: string) =>
    `/api/config/deployment/metadata-migrations/${encodeURIComponent(operationId)}/activate`,
  export: (operationId: string) =>
    `/api/config/deployment/metadata-migrations/${encodeURIComponent(operationId)}/export`
};

export async function loadDeployment(signal?: AbortSignal) {
  const response = await request(deploymentApiPaths.root, read(signal));
  return parseResponse(response, parseDeploymentView);
}

export async function validateMigration(value: MigrationValidationRequest, signal?: AbortSignal) {
  const response = await request(deploymentApiPaths.validate, post(value, signal));
  return parseResponse(response, parseMigrationValidation);
}

export async function startMigration(value: MigrationStartRequest, signal?: AbortSignal) {
  const response = await request(deploymentApiPaths.migrations, post(value, signal));
  return parseOperationResponse(response);
}

export async function loadMigration(operationId: string, signal?: AbortSignal) {
  const response = await request(deploymentApiPaths.migration(operationId), read(signal));
  return parseOperationResponse(response, operationId);
}

export async function activateMigration(operationId: string, value: MigrationActivateRequest, signal?: AbortSignal) {
  const response = await request(deploymentApiPaths.activate(operationId), post(value, signal));
  return parseOperationResponse(response, operationId);
}

export async function exportMigration(
  operationId: string,
  value: MigrationExportRequest,
  signal?: AbortSignal
): Promise<ExportResponse> {
  const response = await request(deploymentApiPaths.export(operationId), post(value, signal));
  return { ...attachmentMetadata(response.headers), blob: await response.blob() };
}

export class DeploymentRequestError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'http' | 'contract',
    readonly status?: number,
    readonly errorCode?: DeploymentErrorCode
  ) {
    super('Deployment request failed');
    this.name = 'DeploymentRequestError';
  }
}

async function request(path: string, init: RequestInit) {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new DeploymentRequestError('unavailable');
  }
  if (response.ok) return response;
  throw await httpFailure(response);
}

function isAbortError(error: unknown): error is { name: 'AbortError' } {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

async function httpFailure(response: Response) {
  let code: DeploymentErrorCode | undefined;
  try {
    const body = (await response.json()) as { errorCode?: unknown };
    if (DEPLOYMENT_ERROR_CODES.includes(body.errorCode as DeploymentErrorCode))
      code = body.errorCode as DeploymentErrorCode;
  } catch {
    // A stable code is optional failure evidence; raw server content remains private.
  }
  return new DeploymentRequestError('http', response.status, code);
}

async function responseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new DeploymentRequestError('contract', response.status);
  }
}

async function parseResponse<T>(response: Response, parser: (value: unknown) => T) {
  const value = await responseJson(response);
  try {
    return parser(value);
  } catch {
    throw new DeploymentRequestError('contract', response.status);
  }
}

async function parseOperationResponse(response: Response, expectedOperationId?: string) {
  const operation = await parseResponse(response, parseMigrationView);
  if (expectedOperationId && operation.operationId !== expectedOperationId) {
    throw new DeploymentRequestError('contract', response.status);
  }
  return operation;
}

function read(signal?: AbortSignal): RequestInit {
  return { method: 'GET', credentials: 'include', cache: 'no-store', ...(signal ? { signal } : {}) };
}

function post(body: object, signal?: AbortSignal): RequestInit {
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
  const fileName = /^attachment;\s*filename="([A-Za-z0-9._-]+)"$/i.exec(disposition)?.[1];
  if (
    !hasCacheDirective(headers.get('Cache-Control'), 'no-store') ||
    !fileName ||
    !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mediaType)
  )
    throw new DeploymentRequestError('contract');
  return { fileName, mediaType };
}

function hasCacheDirective(value: string | null, expected: string) {
  return (value ?? '').split(',').some(directive => directive.split(';', 1)[0]?.trim().toLowerCase() === expected);
}
