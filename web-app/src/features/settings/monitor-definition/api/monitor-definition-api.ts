/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  ApiMessageError,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
} from '@/core/http/api-message';
import { apiMessageWriteOutcome, type ApiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import type {
  MonitorDefinitionFailureKind,
  MonitorDefinitionValidationRequest
} from '../model/monitor-definition-model';
import {
  MonitorDefinitionContractError,
  parseMonitorDefinitionCatalog,
  parseMonitorDefinitionDelete,
  parseMonitorDefinitionDetail,
  parseMonitorDefinitionValidation,
  parseMonitorDefinitionValidationRequest,
  parseMonitorDefinitionWriteRequest
} from './monitor-definition-schema';

const monitorDefinitionEndpoint = '/api/monitor-definitions/v1';

export class MonitorDefinitionRequestError extends Error {
  readonly kind: MonitorDefinitionFailureKind;
  readonly writeOutcome: ApiMessageWriteOutcome | null;

  constructor(kind: MonitorDefinitionFailureKind, writeOutcome: ApiMessageWriteOutcome | null = null) {
    super('Monitor definition request failed');
    this.name = 'MonitorDefinitionRequestError';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
  }
}

export function loadMonitorDefinitionCatalog(language?: string, signal?: AbortSignal) {
  return request(async () =>
    parseMonitorDefinitionCatalog(
      await (signal
        ? apiMessageGet(withLanguage(`${monitorDefinitionEndpoint}/catalog`, language), { signal })
        : apiMessageGet(withLanguage(`${monitorDefinitionEndpoint}/catalog`, language)))
    )
  );
}

export function loadMonitorDefinitionDetail(app: string, language?: string) {
  return request(async () =>
    parseMonitorDefinitionDetail(
      await apiMessageGet(withLanguage(`${monitorDefinitionEndpoint}/${encodeURIComponent(app)}`, language))
    )
  );
}

export function validateMonitorDefinition(value: MonitorDefinitionValidationRequest) {
  return request(async () => {
    const payload = parseMonitorDefinitionValidationRequest(value);
    return parseMonitorDefinitionValidation(await apiMessagePost(`${monitorDefinitionEndpoint}/validate`, payload));
  });
}

export function createMonitorDefinition(definition: string, language?: string, signal?: AbortSignal) {
  return request(async dispatch => {
    const payload = parseMonitorDefinitionWriteRequest({ definition });
    signal?.throwIfAborted();
    const path = withLanguage(monitorDefinitionEndpoint, language);
    dispatch();
    return parseMonitorDefinitionDetail(
      await (signal ? apiMessagePost(path, payload, { signal }) : apiMessagePost(path, payload))
    );
  }, 'write');
}

export function updateMonitorDefinition(
  app: string,
  definition: string,
  revision: string,
  language?: string,
  signal?: AbortSignal
) {
  return request(async dispatch => {
    const payload = parseMonitorDefinitionWriteRequest({ definition });
    const options = revisionHeader(revision);
    signal?.throwIfAborted();
    dispatch();
    const response = await apiMessagePut(
      withLanguage(`${monitorDefinitionEndpoint}/${encodeURIComponent(app)}`, language),
      payload,
      signal ? { ...options, signal } : options
    );
    return parseMonitorDefinitionDetail(response);
  }, 'write');
}

export function deleteMonitorDefinition(app: string, revision: string, signal?: AbortSignal) {
  return request(async dispatch => {
    const options = revisionHeader(revision);
    signal?.throwIfAborted();
    dispatch();
    return parseMonitorDefinitionDelete(
      await apiMessageDelete(
        `${monitorDefinitionEndpoint}/${encodeURIComponent(app)}`,
        signal ? { ...options, signal } : options
      )
    );
  }, 'write');
}

const stableFailures = new Map<string, MonitorDefinitionFailureKind>([
  ['monitor_definition_not_found', 'not-found'],
  ['monitor_definition_app_invalid', 'app-invalid'],
  ['monitor_definition_invalid', 'invalid'],
  ['monitor_definition_create_conflict', 'create-conflict'],
  ['monitor_definition_expected_app_required', 'expected-app-required'],
  ['monitor_definition_expected_app_unexpected', 'expected-app-unexpected'],
  ['monitor_definition_update_target_mismatch', 'target-mismatch'],
  ['monitor_definition_immutable', 'immutable'],
  ['monitor_definition_revision_required', 'revision-required'],
  ['monitor_definition_revision_invalid', 'revision-invalid'],
  ['monitor_definition_revision_conflict', 'revision-conflict'],
  ['monitor_definition_in_use', 'in-use'],
  ['monitor_definition_persistence_failed', 'persistence-failed'],
  ['monitor_definition_runtime_update_failed', 'runtime-update-failed'],
  ['monitor_definition_state_uncertain', 'state-uncertain']
]);

async function request<T>(operation: (dispatch: () => void) => Promise<T>, phase: 'read' | 'write' = 'read') {
  let dispatched = false;
  try {
    return await operation(() => {
      dispatched = true;
    });
  } catch (error) {
    if (error instanceof MonitorDefinitionRequestError) throw error;
    const outcome = phase === 'write' ? (dispatched ? dispatchedWriteOutcome(error) : 'rejected') : null;
    if (error instanceof MonitorDefinitionContractError) throw new MonitorDefinitionRequestError('contract', outcome);
    if (!(error instanceof ApiMessageError)) throw new MonitorDefinitionRequestError('error', outcome);
    const stable = stableFailures.get(error.message);
    if (stable) throw new MonitorDefinitionRequestError(stable, outcome);
    if (error.status === 401 || error.status === 403) throw new MonitorDefinitionRequestError('forbidden', outcome);
    if (hasUncertainTransportEvidence(error)) {
      throw new MonitorDefinitionRequestError('unavailable', outcome);
    }
    throw new MonitorDefinitionRequestError('error', outcome);
  }
}

const uncertainStableFailures = new Set<MonitorDefinitionFailureKind>(['persistence-failed', 'state-uncertain']);

function dispatchedWriteOutcome(error: unknown): ApiMessageWriteOutcome {
  if (!(error instanceof ApiMessageError)) return 'uncertain';
  if (hasUncertainTransportEvidence(error)) return 'uncertain';
  const stable = stableFailures.get(error.message);
  if (stable) return uncertainStableFailures.has(stable) ? 'uncertain' : 'rejected';
  return apiMessageWriteOutcome(error);
}

function hasUncertainTransportEvidence(error: ApiMessageError) {
  return (
    error.cause !== undefined ||
    error.status === undefined ||
    error.status === 0 ||
    error.status === 408 ||
    error.status >= 500
  );
}

function withLanguage(path: string, language?: string) {
  const locale = language?.trim();
  return locale ? `${path}?${new URLSearchParams({ lang: locale }).toString()}` : path;
}

function revisionHeader(revision: string) {
  if (!/^[0-9a-f]{64}$/.test(revision)) throw new MonitorDefinitionRequestError('revision-invalid', 'rejected');
  return { headers: { 'If-Match': `"${revision}"` } };
}
