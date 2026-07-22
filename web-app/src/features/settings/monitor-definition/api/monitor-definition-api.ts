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

  constructor(kind: MonitorDefinitionFailureKind) {
    super('Monitor definition request failed');
    this.name = 'MonitorDefinitionRequestError';
    this.kind = kind;
  }
}

export function loadMonitorDefinitionCatalog(language?: string) {
  return request(async () =>
    parseMonitorDefinitionCatalog(await apiMessageGet(withLanguage(`${monitorDefinitionEndpoint}/catalog`, language)))
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

export function createMonitorDefinition(definition: string, language?: string) {
  return request(async () => {
    const payload = parseMonitorDefinitionWriteRequest({ definition });
    return parseMonitorDefinitionDetail(
      await apiMessagePost(withLanguage(monitorDefinitionEndpoint, language), payload)
    );
  });
}

export function updateMonitorDefinition(app: string, definition: string, revision: string, language?: string) {
  return request(async () => {
    const payload = parseMonitorDefinitionWriteRequest({ definition });
    const response = await apiMessagePut(
      withLanguage(`${monitorDefinitionEndpoint}/${encodeURIComponent(app)}`, language),
      payload,
      revisionHeader(revision)
    );
    return parseMonitorDefinitionDetail(response);
  });
}

export function deleteMonitorDefinition(app: string, revision: string) {
  return request(async () =>
    parseMonitorDefinitionDelete(
      await apiMessageDelete(`${monitorDefinitionEndpoint}/${encodeURIComponent(app)}`, revisionHeader(revision))
    )
  );
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

async function request<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof MonitorDefinitionContractError) throw new MonitorDefinitionRequestError('contract');
    if (!(error instanceof ApiMessageError)) throw new MonitorDefinitionRequestError('error');
    const stable = stableFailures.get(error.message);
    if (stable) throw new MonitorDefinitionRequestError(stable);
    if (error.status === 401 || error.status === 403) throw new MonitorDefinitionRequestError('forbidden');
    if (error.cause !== undefined || error.status === undefined || error.status === 0 || error.status >= 500) {
      throw new MonitorDefinitionRequestError('unavailable');
    }
    throw new MonitorDefinitionRequestError('error');
  }
}

function withLanguage(path: string, language?: string) {
  const locale = language?.trim();
  return locale ? `${path}?${new URLSearchParams({ lang: locale }).toString()}` : path;
}

function revisionHeader(revision: string) {
  if (!/^[0-9a-f]{64}$/.test(revision)) throw new MonitorDefinitionRequestError('revision-invalid');
  return { headers: { 'If-Match': `"${revision}"` } };
}
