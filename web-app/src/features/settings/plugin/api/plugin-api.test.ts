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
  postForm: vi.fn(),
  put: vi.fn()
}));
vi.mock('@/core/http/api-message', async () => ({
  ...(await vi.importActual<typeof import('@/core/http/api-message')>('@/core/http/api-message')),
  apiMessageDelete: messageApi.delete,
  apiMessageGet: messageApi.get,
  apiMessagePost: messageApi.post,
  apiMessagePostForm: messageApi.postForm,
  apiMessagePut: messageApi.put
}));

import {
  deletePlugins,
  loadPluginParams,
  loadPlugins,
  PluginRequestError,
  savePluginParams,
  updatePluginStatus,
  uploadPlugin
} from './plugin-api';

const page = springPage([], 0, 0, 8);

describe('plugin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageApi.get.mockResolvedValue(page);
    messageApi.postForm.mockResolvedValue(null);
    messageApi.post.mockResolvedValue(true);
    messageApi.put.mockResolvedValue(null);
    messageApi.delete.mockResolvedValue(null);
  });

  it('loads and saves the frozen parameter endpoints', async () => {
    messageApi.get.mockResolvedValue({ paramDefines: [], pluginParams: [] });
    await loadPluginParams(17);
    await savePluginParams({ pluginMetadataId: 17, params: [{ field: 'secret', intent: 'KEEP' }] });
    expect(messageApi.get).toHaveBeenCalledWith('/api/plugin/params/define?pluginMetadataId=17');
    expect(messageApi.post).toHaveBeenCalledWith('/api/plugin/params', {
      pluginMetadataId: 17,
      params: [{ field: 'secret', intent: 'KEEP' }]
    });
  });

  it('rejects an unsafe parameter identity before transport', async () => {
    await expect(loadPluginParams(0)).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'rejected' });
    await expect(savePluginParams({ pluginMetadataId: 0, params: [] })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    expect(messageApi.get).not.toHaveBeenCalled();
    expect(messageApi.post).not.toHaveBeenCalled();
  });

  it('uses exact zero-based list and trimmed search query parameters', async () => {
    messageApi.get.mockResolvedValue(springPage([], 0, 2, 20));
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
      kind: 'invalid',
      writeOutcome: 'rejected',
      message: 'Plugin request failed'
    });
    expect(messageApi.postForm).not.toHaveBeenCalled();
  });

  it.each(['UPPER.JAR', '../escape.jar', 'folder/plugin.jar', 'line\nbreak.jar', 'oversized.jar'])(
    'rejects filename or size outside the backend upload contract: %s',
    async filename => {
      const jarFile = new File(['plugin'], filename, { type: 'application/java-archive' });
      if (filename === 'oversized.jar') Object.defineProperty(jarFile, 'size', { value: 100 * 1024 * 1024 + 1 });
      await expect(uploadPlugin({ name: 'audit', jarFile, enableStatus: true })).rejects.toMatchObject({
        kind: 'invalid',
        writeOutcome: 'rejected'
      });
      expect(messageApi.postForm).not.toHaveBeenCalled();
    }
  );

  it.each([
    [new ApiMessageError('plugin_invalid_request', { code: 1, status: 200 }), 'invalid', 'rejected'],
    [new ApiMessageError('plugin_forbidden', { code: 1, status: 200 }), 'permission', 'rejected'],
    [new ApiMessageError('plugin_not_found', { code: 1, status: 200 }), 'missing', 'rejected'],
    [new ApiMessageError('plugin_conflict', { code: 1, status: 200 }), 'conflict', 'rejected'],
    [new ApiMessageError('plugin_storage_unavailable', { code: 1, status: 200 }), 'unavailable', 'uncertain'],
    [new ApiMessageError('plugin_operation_failed', { code: 1, status: 200 }), 'error', 'uncertain'],
    [new ApiMessageError('private backend detail', { status: 403 }), 'permission', 'rejected'],
    [new ApiMessageError('private backend detail', { cause: new TypeError('offline') }), 'unavailable', 'uncertain']
  ] as const)('maps and redacts request failure %#', async (failure, kind, writeOutcome) => {
    messageApi.get.mockRejectedValue(failure);

    let error: unknown;
    try {
      await loadPlugins({ search: '', pageIndex: 0, pageSize: 8 });
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(PluginRequestError);
    expect(error).toMatchObject({ kind, writeOutcome, message: 'Plugin request failed' });
    expect(JSON.stringify(error)).not.toContain(failure.message);
  });

  it('rejects unsafe direct status and delete commands before transport', async () => {
    await expect(updatePluginStatus(0, true)).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'rejected' });
    await expect(deletePlugins([])).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'rejected' });
    await expect(deletePlugins([11, 11])).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'rejected' });
    expect(messageApi.put).not.toHaveBeenCalled();
    expect(messageApi.delete).not.toHaveBeenCalled();
  });
});

function springPage(content: unknown[], totalElements: number, number: number, size: number) {
  return {
    content,
    pageable: {
      pageNumber: number,
      pageSize: size,
      sort: { empty: true, sorted: false, unsorted: true },
      offset: number * size,
      paged: true,
      unpaged: false
    },
    last: number + 1 >= Math.ceil(totalElements / size),
    totalPages: Math.ceil(totalElements / size),
    totalElements,
    size,
    number,
    sort: { empty: true, sorted: false, unsorted: true },
    first: number === 0,
    numberOfElements: content.length,
    empty: content.length === 0
  };
}
