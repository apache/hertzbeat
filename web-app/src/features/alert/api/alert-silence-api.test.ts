/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
}));

import {
  deleteAlertSilence,
  loadAlertSilence,
  loadAlertSilences,
  saveAlertSilence,
  updateAlertSilenceEnabled
} from './alert-silence-api';
import { ApiMessageError } from '@/core/http/api-message';
import {
  AlertSilenceContractError,
  AlertSilenceMissingError,
  AlertSilenceRequestFailure,
  createAlertSilenceDraft
} from '../model/alert-silence-model';

const persisted = {
  id: 7,
  name: 'Maintenance',
  enable: true,
  matchAll: true,
  type: 0 as const,
  times: null,
  labels: null,
  days: null,
  periodStart: null,
  periodEnd: null
};

describe('alert silence API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMessageDelete.mockResolvedValue(undefined);
    apiMessageGet.mockResolvedValue(undefined);
    apiMessagePost.mockResolvedValue(undefined);
    apiMessagePut.mockResolvedValue(undefined);
  });

  it('uses the controller list, detail, create, update, toggle, and batch delete contracts', async () => {
    const draft = { ...createAlertSilenceDraft(), name: 'Maintenance' };
    apiMessageGet
      .mockResolvedValueOnce({ content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15 })
      .mockResolvedValueOnce(persisted);

    await loadAlertSilences({ search: 'prod', pageIndex: 1, pageSize: 15 });
    await loadAlertSilence(7);
    await saveAlertSilence(draft);
    await saveAlertSilence({ ...draft, id: 7 });
    await updateAlertSilenceEnabled(persisted, false);
    await deleteAlertSilence(7);

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/alert/silences?pageIndex=1&pageSize=15&sort=id&order=desc&search=prod'
    );
    expect(apiMessageGet).toHaveBeenCalledWith('/api/alert/silence/7');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/alert/silence', expect.objectContaining({ name: 'Maintenance' }));
    expect(apiMessagePut).toHaveBeenCalledWith('/api/alert/silence', expect.objectContaining({ id: 7 }));
    expect(apiMessagePut).toHaveBeenCalledWith('/api/alert/silence', expect.objectContaining({ id: 7, enable: false }));
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/alert/silences?ids=7');
  });

  it('redacts invalid response details and exposes missing detail separately', async () => {
    apiMessageGet.mockResolvedValueOnce({
      content: [{ ...persisted, enable: 'true' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    let invalidFailure: unknown;
    try {
      await loadAlertSilences({ search: '', pageIndex: 0, pageSize: 8 });
    } catch (error: unknown) {
      invalidFailure = error;
    }
    expect(invalidFailure).toBeInstanceOf(AlertSilenceRequestFailure);
    expect(invalidFailure).toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain',
      message: 'Alert Silence request failed'
    });
    expect((invalidFailure as AlertSilenceRequestFailure).cause).toBeUndefined();

    apiMessageGet.mockResolvedValueOnce(null);
    await expect(loadAlertSilence(7)).rejects.toBeInstanceOf(AlertSilenceMissingError);
  });

  it('forwards AbortSignal for list and detail reads', async () => {
    const signal = new AbortController().signal;
    apiMessageGet
      .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 })
      .mockResolvedValueOnce(persisted);
    await loadAlertSilences({ search: '', pageIndex: 0, pageSize: 8 }, signal);
    expect(apiMessageGet).toHaveBeenCalledWith(expect.any(String), { signal });
    await loadAlertSilence(7, signal);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/alert/silence/7', { signal });
  });

  it('normalizes transport failures on every read and mutation path', async () => {
    const draft = { ...createAlertSilenceDraft(), name: 'Maintenance' };
    const unavailable = () => new ApiMessageError('private transport failure', { status: 503 });

    apiMessageGet.mockRejectedValueOnce(unavailable());
    await expect(loadAlertSilences({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      kind: 'unavailable'
    });
    apiMessageGet.mockRejectedValueOnce(unavailable());
    await expect(loadAlertSilence(7)).rejects.toMatchObject({ kind: 'unavailable' });
    apiMessagePost.mockRejectedValueOnce(unavailable());
    await expect(saveAlertSilence(draft)).rejects.toBeInstanceOf(AlertSilenceRequestFailure);
    apiMessagePut.mockRejectedValueOnce(unavailable());
    await expect(saveAlertSilence({ ...draft, id: 7 })).rejects.toBeInstanceOf(AlertSilenceRequestFailure);
    apiMessagePut.mockRejectedValueOnce(unavailable());
    await expect(updateAlertSilenceEnabled(persisted, false)).rejects.toBeInstanceOf(AlertSilenceRequestFailure);
    apiMessageDelete.mockRejectedValueOnce(unavailable());
    await expect(deleteAlertSilence(7)).rejects.toBeInstanceOf(AlertSilenceRequestFailure);
  });

  it('returns void acknowledgements from every mutation', async () => {
    apiMessagePost.mockResolvedValue({ leaked: true });
    apiMessagePut.mockResolvedValue({ leaked: true });
    apiMessageDelete.mockResolvedValue({ leaked: true });
    const draft = { ...createAlertSilenceDraft(), name: 'Maintenance' };

    await expect(saveAlertSilence(draft)).resolves.toBeUndefined();
    await expect(saveAlertSilence({ ...draft, id: 7 })).resolves.toBeUndefined();
    await expect(updateAlertSilenceEnabled(persisted, false)).resolves.toBeUndefined();
    await expect(deleteAlertSilence(7)).resolves.toBeUndefined();
  });

  it('allowlists the toggle request without echoing response-only and audit fields', async () => {
    apiMessagePut.mockResolvedValue(undefined);
    await updateAlertSilenceEnabled(
      {
        ...persisted,
        times: 3,
        creator: 'creator',
        modifier: 'modifier',
        gmtCreate: '2026-07-13T09:00:00',
        gmtUpdate: '2026-07-13T10:00:00'
      },
      false
    );

    expect(apiMessagePut).toHaveBeenCalledWith('/api/alert/silence', {
      id: 7,
      name: 'Maintenance',
      enable: false,
      matchAll: true,
      type: 0,
      labels: null,
      days: null,
      periodStart: null,
      periodEnd: null
    });
  });

  it('rejects non-canonical IDs before choosing a mutation or building a URL', async () => {
    const draft = { ...createAlertSilenceDraft(), name: 'Maintenance' };

    for (const id of [0, -1, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(loadAlertSilence(id)).rejects.toBeInstanceOf(AlertSilenceContractError);
      await expect(deleteAlertSilence(id)).rejects.toBeInstanceOf(AlertSilenceContractError);
      await expect(saveAlertSilence({ ...draft, id })).rejects.toBeInstanceOf(AlertSilenceContractError);
    }

    expect(apiMessageGet).not.toHaveBeenCalled();
    expect(apiMessageDelete).not.toHaveBeenCalled();
    expect(apiMessagePost).not.toHaveBeenCalled();
    expect(apiMessagePut).not.toHaveBeenCalled();
  });
});
