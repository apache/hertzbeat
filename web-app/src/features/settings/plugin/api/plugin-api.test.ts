/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const messageApi = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), postForm: vi.fn(), put: vi.fn() }));
vi.mock('@/core/http/api-message', async () => ({
  ...(await vi.importActual<typeof import('@/core/http/api-message')>('@/core/http/api-message')),
  apiMessageDelete: messageApi.delete,
  apiMessageGet: messageApi.get,
  apiMessagePostForm: messageApi.postForm,
  apiMessagePut: messageApi.put
}));

import { deletePlugins, loadPlugins, PluginRequestError, updatePluginStatus, uploadPlugin } from './plugin-api';

const page = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 };

describe('plugin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageApi.get.mockResolvedValue(page);
    messageApi.postForm.mockResolvedValue(null);
    messageApi.put.mockResolvedValue(null);
    messageApi.delete.mockResolvedValue(null);
  });

  it('uses exact zero-based list and trimmed search query parameters', async () => {
    messageApi.get.mockResolvedValue({ ...page, number: 2, size: 20 });
    await loadPlugins({ search: ' audit ', pageIndex: 2, pageSize: 20 });

    expect(messageApi.get).toHaveBeenCalledWith('/api/plugin?pageIndex=2&pageSize=20&search=audit');
  });

  it('sends exact multipart, status, and repeated-id delete contracts', async () => {
    const jar = new File(['binary-proof'], 'audit.jar', { type: 'application/java-archive' });

    await uploadPlugin({ name: ' audit ', jarFile: jar, enableStatus: false });
    await updatePluginStatus(11, true);
    await deletePlugins([11, 17]);

    expect(messageApi.postForm).toHaveBeenCalledWith('/api/plugin', expect.any(FormData));
    const form = messageApi.postForm.mock.calls[0]?.[1] as FormData;
    expect([...form.keys()]).toEqual(['name', 'jarFile', 'enableStatus']);
    expect(form.get('name')).toBe('audit');
    expect(form.get('jarFile')).toBe(jar);
    expect(form.get('enableStatus')).toBe('false');
    expect(messageApi.put).toHaveBeenCalledWith('/api/plugin', { id: 11, enableStatus: true });
    expect(messageApi.delete).toHaveBeenCalledWith('/api/plugin?ids=11&ids=17');
  });

  it('rejects an invalid upload before creating an incomplete multipart request', async () => {
    await expect(uploadPlugin({ name: 'audit', jarFile: null, enableStatus: true })).rejects.toMatchObject({
      kind: 'contract',
      message: 'Plugin request failed'
    });
    expect(messageApi.postForm).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiMessageError('plugin_operation_failed', { code: 1, status: 200 }), 'operation-failed'],
    [new ApiMessageError('private backend detail', { status: 403 }), 'forbidden'],
    [new ApiMessageError('private backend detail', { cause: new TypeError('offline') }), 'unavailable']
  ] as const)('maps and redacts request failure %#', async (failure, kind) => {
    messageApi.get.mockRejectedValue(failure);

    let error: unknown;
    try {
      await loadPlugins({ search: '', pageIndex: 0, pageSize: 8 });
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(PluginRequestError);
    expect(error).toMatchObject({ kind, message: 'Plugin request failed' });
  });
});
