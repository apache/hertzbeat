/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const messageApi = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
}));
vi.mock('@/core/http/api-message', async () => ({
  ...(await vi.importActual<typeof import('@/core/http/api-message')>('@/core/http/api-message')),
  apiMessageDelete: messageApi.delete,
  apiMessageGet: messageApi.get,
  apiMessagePost: messageApi.post,
  apiMessagePut: messageApi.put
}));

import {
  createMonitorDefinition,
  deleteMonitorDefinition,
  loadMonitorDefinitionCatalog,
  loadMonitorDefinitionDetail,
  updateMonitorDefinition,
  validateMonitorDefinition
} from './monitor-definition-api';

const revision = 'a'.repeat(64);
const item = { app: 'mysql', label: 'MySQL', origin: 'override', editable: true, deletable: true, revision };
const detail = { schemaVersion: 1, ...item, definition: 'app: mysql' };

describe('monitor definition API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the frozen read and validation routes with exact bodies', async () => {
    messageApi.get.mockResolvedValueOnce({ schemaVersion: 1, items: [item] }).mockResolvedValueOnce(detail);
    messageApi.post.mockResolvedValueOnce({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });

    await expect(loadMonitorDefinitionCatalog('en-US')).resolves.toEqual({ schemaVersion: 1, items: [item] });
    await expect(loadMonitorDefinitionDetail('mysql', 'en-US')).resolves.toEqual(detail);
    await validateMonitorDefinition({ operation: 'update', expectedApp: 'mysql', definition: 'app: mysql' });

    expect(messageApi.get).toHaveBeenNthCalledWith(1, '/api/monitor-definitions/v1/catalog?lang=en-US');
    expect(messageApi.get).toHaveBeenNthCalledWith(2, '/api/monitor-definitions/v1/mysql?lang=en-US');
    expect(messageApi.post).toHaveBeenCalledWith('/api/monitor-definitions/v1/validate', {
      operation: 'update',
      expectedApp: 'mysql',
      definition: 'app: mysql'
    });
  });

  it('sends exact write bodies and quoted strong If-Match headers', async () => {
    messageApi.post.mockResolvedValue(detail);
    messageApi.put.mockResolvedValue(detail);
    messageApi.delete.mockResolvedValue({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' });

    await createMonitorDefinition('app: mysql', 'en-US');
    await updateMonitorDefinition('mysql', 'app: mysql', revision, 'en-US');
    await deleteMonitorDefinition('mysql', revision);

    expect(messageApi.post).toHaveBeenCalledWith('/api/monitor-definitions/v1?lang=en-US', {
      definition: 'app: mysql'
    });
    expect(messageApi.put).toHaveBeenCalledWith(
      '/api/monitor-definitions/v1/mysql?lang=en-US',
      { definition: 'app: mysql' },
      { headers: { 'If-Match': `"${revision}"` } }
    );
    expect(messageApi.delete).toHaveBeenCalledWith('/api/monitor-definitions/v1/mysql', {
      headers: { 'If-Match': `"${revision}"` }
    });
  });

  it.each([
    ['monitor_definition_revision_conflict', 'revision-conflict'],
    ['monitor_definition_immutable', 'immutable'],
    ['monitor_definition_in_use', 'in-use'],
    ['monitor_definition_state_uncertain', 'state-uncertain']
  ] as const)('maps stable server code %s without exposing raw detail', async (message, expected) => {
    messageApi.get.mockRejectedValue(new ApiMessageError(message, { code: 1, status: 200 }));

    await expect(loadMonitorDefinitionCatalog()).rejects.toMatchObject({ kind: expected });
  });

  it.each(['__proto__', 'constructor', 'toString', 'private_backend_detail'])(
    'keeps unknown server message %s generic and redacted',
    async message => {
      messageApi.get.mockRejectedValue(new ApiMessageError(message, { code: 1, status: 400 }));

      await expect(loadMonitorDefinitionCatalog()).rejects.toMatchObject({
        kind: 'error',
        message: 'Monitor definition request failed'
      });
    }
  );

  it('distinguishes forbidden, unavailable, and invalid response contracts', async () => {
    messageApi.get
      .mockRejectedValueOnce(new ApiMessageError('private', { status: 403 }))
      .mockRejectedValueOnce(new ApiMessageError('private', { cause: new TypeError('offline') }))
      .mockResolvedValueOnce({ schemaVersion: 1, items: [{ ...item, revision: 'weak' }] });

    await expect(loadMonitorDefinitionCatalog()).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(loadMonitorDefinitionCatalog()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(loadMonitorDefinitionCatalog()).rejects.toMatchObject({ kind: 'contract' });
  });
});
