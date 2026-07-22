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
  apiMessagePostForm,
  apiMessagePut
} from '@/core/http/api-message';

import {
  validatePluginUpload,
  type PluginFailureKind,
  type PluginQuery,
  type PluginUploadDraft
} from '../model/plugin-model';
import { PluginContractError, parsePluginPage, parsePluginWriteReceipt } from './plugin-schema';

const pluginEndpoint = '/api/plugin';

export class PluginRequestError extends Error {
  readonly kind: PluginFailureKind;

  constructor(kind: PluginFailureKind) {
    super('Plugin request failed');
    this.name = 'PluginRequestError';
    this.kind = kind;
  }
}

export function loadPlugins(query: PluginQuery, signal?: AbortSignal) {
  return request(async () => {
    const path = buildPluginPath(query);
    const response = signal ? await apiMessageGet(path, { signal }) : await apiMessageGet(path);
    return parsePluginPage(response, query);
  });
}

export function uploadPlugin(draft: PluginUploadDraft) {
  return request(async () => {
    const valid = validatePluginUpload(draft);
    if (!valid.name || !valid.jarFile || !draft.jarFile) throw new PluginContractError();
    const form = new FormData();
    form.append('name', draft.name.trim());
    form.append('jarFile', draft.jarFile);
    form.append('enableStatus', String(draft.enableStatus));
    return parsePluginWriteReceipt(await apiMessagePostForm(pluginEndpoint, form));
  });
}

export function updatePluginStatus(id: number, enableStatus: boolean) {
  return request(async () => parsePluginWriteReceipt(await apiMessagePut(pluginEndpoint, { id, enableStatus })));
}

export function deletePlugins(ids: number[]) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  return request(async () => parsePluginWriteReceipt(await apiMessageDelete(`${pluginEndpoint}?${params.toString()}`)));
}

function buildPluginPath(query: PluginQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  const search = query.search.trim();
  if (search) params.set('search', search);
  return `${pluginEndpoint}?${params.toString()}`;
}

async function request<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PluginContractError) throw new PluginRequestError('contract');
    if (!(error instanceof ApiMessageError)) throw new PluginRequestError('error');
    if (error.message === 'plugin_operation_failed') throw new PluginRequestError('operation-failed');
    if (error.status === 401 || error.status === 403) throw new PluginRequestError('forbidden');
    if (error.cause !== undefined || error.status === undefined || error.status === 0 || error.status >= 500) {
      throw new PluginRequestError('unavailable');
    }
    throw new PluginRequestError('error');
  }
}
