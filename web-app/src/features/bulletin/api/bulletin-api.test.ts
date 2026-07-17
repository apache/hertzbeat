/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import {
  BulletinContractError, classifyBulletinError, createBulletinAndRead, deleteBulletinAndConfirm,
  loadBulletin, loadBulletinMetrics, loadBulletins, updateBulletinAndRead
} from './bulletin-api';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn(), apiMessagePut: vi.fn(), apiMessageDelete: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({ ...(await importOriginal()), ...http }));

describe('bulletin api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates page identity and detail identity', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 8 });
    await expect(loadBulletins({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(BulletinContractError);
    http.apiMessageGet.mockResolvedValueOnce({ id: 8, name: 'x', app: 'website', monitorIds: [], fields: {} });
    await expect(loadBulletin(7)).rejects.toBeInstanceOf(BulletinContractError);
  });

  it('keeps valid empty metrics distinct from unavailable metrics', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ name: 'Ops', content: [] });
    await expect(loadBulletinMetrics(7)).resolves.toEqual({ name: 'Ops', content: [] });
    expect(classifyBulletinError(new ApiMessageError('store down', { code: 15, status: 200 }), 'metrics')).toBe('unavailable');
  });

  it('normalizes the legacy no-data sentinel instead of exposing a healthy value', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ name: 'Ops', content: [{
      monitorName: 'site', monitorId: 7, host: 'localhost', metrics: [{
        name: 'responseTime', fields: [[{ key: 'duration', unit: '', value: 'No Data' }]]
      }]
    }] });
    const metrics = await loadBulletinMetrics(7);
    expect(metrics.content[0]?.metrics[0]?.fields[0]?.[0]).toEqual({
      key: 'duration', unit: '', value: null, status: 'no-data'
    });
  });

  it('classifies missing by protocol code and invalid shape separately', () => {
    expect(classifyBulletinError(new ApiMessageError('localized', { code: 15, status: 200 }), 'read-detail')).toBe('error');
    expect(classifyBulletinError(new ApiMessageError('not found', { status: 404 }), 'read-detail')).toBe('missing');
    expect(classifyBulletinError(new ApiMessageError('create rejected', { code: 15, status: 200 }), 'create')).toBe('error');
    expect(classifyBulletinError(new ApiMessageError('update rejected', { code: 15, status: 200 }), 'update')).toBe('error');
    expect(classifyBulletinError(new BulletinContractError())).toBe('invalid');
  });

  it('proves void create, update, and delete mutations by authoritative rereads', async () => {
    const draft = { name: 'Ops', app: 'website', monitorIds: [1], fields: { responseTime: ['duration'] } };
    http.apiMessageGet
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([{ id: 7, ...draft }]))
      .mockResolvedValueOnce({ id: 7, ...draft });
    await expect(createBulletinAndRead(draft)).resolves.toMatchObject({ id: 7, name: 'Ops' });
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/bulletin', draft);

    http.apiMessageGet.mockResolvedValueOnce({ id: 7, ...draft, name: 'Renamed' });
    await expect(updateBulletinAndRead({ id: 7, ...draft, name: 'Renamed' })).resolves.toMatchObject({ name: 'Renamed' });
    expect(http.apiMessagePut).toHaveBeenCalled();

    http.apiMessageGet.mockResolvedValueOnce(null);
    await expect(deleteBulletinAndConfirm(7)).resolves.toBeUndefined();
    expect(http.apiMessageDelete).toHaveBeenCalledWith('/api/bulletin?ids=7');
  });
});

function page(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 25 };
}
