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
  apiMessagePostForm,
  apiMessagePut
} from '@/core/http/api-message';

import {
  validatePluginUpload,
  type PluginFailureKind,
  type PluginQuery,
  type PluginUploadDraft,
  type PluginWriteOutcome
} from '../model/plugin-model';
import type { PluginParamWrite } from '../model/plugin-params-model';
import { PluginContractError } from './plugin-contract-error';
import {
  parsePluginParamDefinition,
  parsePluginParamWritePayload,
  parsePluginParamWriteReceipt
} from './plugin-param-schema';
import { parsePluginPage, parsePluginWriteReceipt } from './plugin-schema';

const pluginEndpoint = '/api/plugin';

export class PluginRequestError extends Error {
  readonly kind: PluginFailureKind;
  readonly writeOutcome: PluginWriteOutcome;

  constructor(kind: PluginFailureKind, writeOutcome: PluginWriteOutcome = 'uncertain') {
    super('Plugin request failed');
    this.name = 'PluginRequestError';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
  }
}

export function loadPlugins(query: PluginQuery, signal?: AbortSignal) {
  return request('read', async () => {
    const path = buildPluginPath(query);
    const response = signal ? await apiMessageGet(path, { signal }) : await apiMessageGet(path);
    return parsePluginPage(response, query);
  });
}

export function uploadPlugin(draft: PluginUploadDraft) {
  return request('write', async () => {
    const valid = validatePluginUpload(draft);
    if (!valid.name || !valid.jarFile || !draft.jarFile) throw new PluginRequestError('invalid', 'rejected');
    const form = new FormData();
    form.append('name', draft.name.trim());
    form.append('jarFile', draft.jarFile);
    form.append('enableStatus', String(draft.enableStatus));
    return parsePluginWriteReceipt(await apiMessagePostForm(pluginEndpoint, form));
  });
}

export function updatePluginStatus(id: number, enableStatus: boolean) {
  return request('write', async () => {
    if (!Number.isSafeInteger(id) || id <= 0 || typeof enableStatus !== 'boolean') {
      throw new PluginRequestError('invalid', 'rejected');
    }
    return parsePluginWriteReceipt(await apiMessagePut(pluginEndpoint, { id, enableStatus }));
  });
}

export function deletePlugins(ids: number[]) {
  return request('write', async () => {
    if (ids.length === 0 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      throw new PluginRequestError('invalid', 'rejected');
    }
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', String(id)));
    return parsePluginWriteReceipt(await apiMessageDelete(`${pluginEndpoint}?${params.toString()}`));
  });
}

export function loadPluginParams(pluginMetadataId: number) {
  return request('read', async () => {
    if (!Number.isSafeInteger(pluginMetadataId) || pluginMetadataId <= 0) {
      throw new PluginRequestError('invalid', 'rejected');
    }
    return parsePluginParamDefinition(
      await apiMessageGet(`${pluginEndpoint}/params/define?pluginMetadataId=${encodeURIComponent(pluginMetadataId)}`)
    );
  });
}

export async function savePluginParams(payload: { pluginMetadataId: number; params: PluginParamWrite[] }) {
  let requestPayload: ReturnType<typeof parsePluginParamWritePayload>;
  try {
    requestPayload = parsePluginParamWritePayload(payload);
  } catch {
    throw new PluginRequestError('invalid', 'rejected');
  }
  return request('write', async () =>
    parsePluginParamWriteReceipt(await apiMessagePost(`${pluginEndpoint}/params`, requestPayload))
  );
}

function buildPluginPath(query: PluginQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  const search = query.search.trim();
  if (search) params.set('search', search);
  return `${pluginEndpoint}?${params.toString()}`;
}

async function request<T>(phase: 'read' | 'write', operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw mapRequestError(error, phase);
  }
}

function mapRequestError(error: unknown, phase: 'read' | 'write') {
  if (error instanceof PluginRequestError) return error;
  if (error instanceof PluginContractError) return new PluginRequestError('invalid');
  if (!(error instanceof ApiMessageError)) return new PluginRequestError('error');
  return mapApiMessageError(error, phase);
}

function mapApiMessageError(error: ApiMessageError, phase: 'read' | 'write') {
  const fixedFailure = fixedFailures[error.message];
  if (fixedFailure) return new PluginRequestError(fixedFailure.kind, fixedFailure.outcome);
  if (error.status === 401 || error.status === 403) return new PluginRequestError('permission', 'rejected');
  if (error.cause !== undefined || error.status === undefined || error.status === 0 || error.status >= 500) {
    return new PluginRequestError('unavailable');
  }
  return new PluginRequestError('error', phase === 'write' && error.status < 500 ? 'rejected' : 'uncertain');
}

const fixedFailures: Record<string, { kind: PluginFailureKind; outcome: PluginWriteOutcome }> = {
  plugin_forbidden: { kind: 'permission', outcome: 'rejected' },
  plugin_invalid_request: { kind: 'invalid', outcome: 'rejected' },
  plugin_not_found: { kind: 'missing', outcome: 'rejected' },
  plugin_conflict: { kind: 'conflict', outcome: 'rejected' },
  plugin_storage_unavailable: { kind: 'unavailable', outcome: 'uncertain' },
  plugin_operation_failed: { kind: 'error', outcome: 'uncertain' }
};
