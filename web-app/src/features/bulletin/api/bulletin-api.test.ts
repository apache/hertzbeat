/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  captureBulletinCreateBaseline,
  createBulletin,
  deleteBulletins,
  loadBulletin,
  loadBulletinMetrics,
  loadBulletins,
  proveBulletinCreated,
  proveBulletinsDeleted,
  proveBulletinUpdated,
  updateBulletin
} from './bulletin-api';

const http = vi.hoisted(() => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn(),
  apiMessageDelete: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({ ...(await importOriginal()), ...http }));

describe('bulletin api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates page identity and detail identity', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 8 });
    await expect(loadBulletins({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
    http.apiMessageGet.mockResolvedValueOnce({ id: 8, name: 'x', app: 'website', monitorIds: [], fields: {} });
    await expect(loadBulletin(7)).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'uncertain' });
  });

  it('accepts an empty out-of-range page as valid pagination recovery evidence', async () => {
    http.apiMessageGet.mockResolvedValueOnce({
      content: [],
      totalElements: 9,
      totalPages: 2,
      number: 2,
      size: 8
    });

    await expect(loadBulletins({ search: '', pageIndex: 2, pageSize: 8 })).resolves.toMatchObject({
      content: [],
      totalElements: 9,
      totalPages: 2,
      number: 2,
      size: 8
    });
  });

  it('rejects duplicate stable identities in an ordinary list page', async () => {
    http.apiMessageGet.mockResolvedValueOnce({
      content: [bulletin(7), bulletin(7)],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 8
    });

    await expect(loadBulletins({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('keeps valid empty metrics distinct from unavailable metrics', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ name: 'Ops', content: [] });
    await expect(loadBulletinMetrics(7)).resolves.toEqual({ name: 'Ops', content: [] });
  });

  it('forwards caller cancellation through list and metrics reads', async () => {
    const controller = new AbortController();
    http.apiMessageGet
      .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 })
      .mockResolvedValueOnce({ name: 'Ops', content: [] });

    await loadBulletins({ search: '', pageIndex: 0, pageSize: 8 }, controller.signal);
    await loadBulletinMetrics(7, controller.signal);

    expect(http.apiMessageGet).toHaveBeenNthCalledWith(1, '/api/bulletin?pageIndex=0&pageSize=8', {
      signal: controller.signal
    });
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/bulletin/metrics?id=7', {
      signal: controller.signal
    });
  });

  it('normalizes the legacy no-data sentinel instead of exposing a healthy value', async () => {
    http.apiMessageGet.mockResolvedValueOnce({
      name: 'Ops',
      content: [
        {
          monitorName: 'site',
          monitorId: 7,
          host: 'localhost',
          metrics: [
            {
              name: 'responseTime',
              fields: [[{ key: 'duration', unit: '', value: 'No Data' }]]
            }
          ]
        }
      ]
    });
    const metrics = await loadBulletinMetrics(7);
    expect(metrics.content[0]?.metrics[0]?.fields[0]?.[0]).toEqual({
      key: 'duration',
      unit: '',
      value: null,
      status: 'no-data'
    });
  });

  it('sends void create, update, and delete mutations through their owned endpoints', async () => {
    let postedFields: [string, string[]][] = [];
    let putFields: [string, string[]][] = [];
    http.apiMessagePost.mockImplementationOnce((_path: string, payload: { fields: Record<string, string[]> }) => {
      postedFields = Object.entries(payload.fields);
    });
    http.apiMessagePut.mockImplementationOnce((_path: string, payload: { fields: Record<string, string[]> }) => {
      putFields = Object.entries(payload.fields);
    });
    const draft = {
      name: 'Ops',
      app: 'website',
      monitorIds: [1],
      fields: { zMetric: ['zField', 'aField'], aMetric: ['zField', 'aField'] }
    };
    await expect(createBulletin(draft)).resolves.toBeUndefined();
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/bulletin', draft);
    expect(postedFields).toEqual(Object.entries(draft.fields));

    await expect(updateBulletin({ id: 7, ...draft, name: 'Renamed' })).resolves.toBeUndefined();
    expect(http.apiMessagePut).toHaveBeenCalledWith('/api/bulletin', { id: 7, ...draft, name: 'Renamed' });
    expect(putFields).toEqual(Object.entries(draft.fields));

    await expect(deleteBulletins([7])).resolves.toBeUndefined();
    expect(http.apiMessageDelete).toHaveBeenCalledWith('/api/bulletin?ids=7');
  });

  it('canonicalizes one batch delete into repeated ids and proves every identity absent', async () => {
    await expect(deleteBulletins([9, 7, 9])).resolves.toBeUndefined();
    expect(http.apiMessageDelete).toHaveBeenCalledWith('/api/bulletin?ids=7&ids=9');

    http.apiMessageGet.mockResolvedValue(null);
    await expect(proveBulletinsDeleted([9, 7, 9])).resolves.toBeUndefined();
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/bulletin/7');
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/bulletin/9');
  });

  it('rejects empty or invalid batch identities before transport', async () => {
    await expect(deleteBulletins([])).rejects.toThrow();
    await expect(deleteBulletins([7, 0])).rejects.toThrow();
    expect(http.apiMessageDelete).not.toHaveBeenCalled();
  });

  it('exposes proof-only continuations that never repeat a mutation', async () => {
    const draft = { name: 'Ops', app: 'website', monitorIds: [1], fields: { responseTime: ['duration'] } };
    http.apiMessageGet
      .mockResolvedValueOnce(page([{ id: 3, ...draft }]))
      .mockResolvedValueOnce(
        page([
          { id: 3, ...draft },
          { id: 7, ...draft }
        ])
      )
      .mockResolvedValueOnce({ id: 7, ...draft })
      .mockResolvedValueOnce({ id: 7, ...draft, name: 'Renamed' })
      .mockResolvedValueOnce(null);

    const beforeIds = await captureBulletinCreateBaseline(draft.name);
    await expect(proveBulletinCreated(draft, beforeIds)).resolves.toMatchObject({ id: 7 });
    await expect(proveBulletinUpdated({ id: 7, ...draft, name: 'Renamed' })).resolves.toMatchObject({ id: 7 });
    await expect(proveBulletinsDeleted([7])).resolves.toBeUndefined();

    expect(http.apiMessagePost).not.toHaveBeenCalled();
    expect(http.apiMessagePut).not.toHaveBeenCalled();
    expect(http.apiMessageDelete).not.toHaveBeenCalled();
  });

  it('rejects a created candidate whose canonical detail changed before proof completed', async () => {
    const draft = { name: 'Ops', app: 'website', monitorIds: [1], fields: { responseTime: ['duration'] } };
    http.apiMessageGet
      .mockResolvedValueOnce(page([{ id: 7, ...draft }]))
      .mockResolvedValueOnce({ id: 7, ...draft, fields: { responseTime: ['status'] } });

    await expect(proveBulletinCreated(draft, [])).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('rejects metadata drift while scanning exact-name create evidence', async () => {
    const firstPage = Array.from({ length: 25 }, (_, index) => bulletin(index + 1));
    http.apiMessageGet
      .mockResolvedValueOnce(paged(firstPage, 26, 2, 0))
      .mockResolvedValueOnce(paged([bulletin(26), bulletin(27)], 27, 2, 1));

    await expect(captureBulletinCreateBaseline('Ops')).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('rejects duplicate identities across exact-name evidence pages', async () => {
    const firstPage = Array.from({ length: 25 }, (_, index) => bulletin(index + 1));
    http.apiMessageGet
      .mockResolvedValueOnce(paged(firstPage, 26, 2, 0))
      .mockResolvedValueOnce(paged([bulletin(1)], 26, 2, 1));

    await expect(captureBulletinCreateBaseline('Ops')).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });
});

function page(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 25 };
}

function paged(content: unknown[], totalElements: number, totalPages: number, number: number) {
  return { content, totalElements, totalPages, number, size: 25 };
}

function bulletin(id: number) {
  return {
    id,
    name: 'Ops',
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] }
  };
}
