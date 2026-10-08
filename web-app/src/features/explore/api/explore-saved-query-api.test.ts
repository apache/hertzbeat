/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePut: vi.fn(), apiMessageDelete: vi.fn() }));
vi.mock('@/core/http/api-message', () => api);
import { loadSavedQueries, saveQueryRecord, deleteQueryRecord } from './explore-saved-query-api';

const record = {
  signal: 'logs' as const,
  viewKey: 'legacy-1',
  label: 'Old query',
  route: '/log/manage?search=timeout',
  payload: '{broken'
};
beforeEach(() => vi.clearAllMocks());
describe('saved query API', () => {
  it('keeps invalid payloads and exact original fields in a successful list without writing', async () => {
    api.apiMessageGet.mockResolvedValue([record]);
    expect(await loadSavedQueries('logs')).toEqual([record]);
    expect(api.apiMessagePut).not.toHaveBeenCalled();
  });
  it('does not turn failed or mismatching signal lists into empty results', async () => {
    api.apiMessageGet.mockResolvedValue([record]);
    await expect(loadSavedQueries('traces')).rejects.toThrow();
    api.apiMessageGet.mockRejectedValue(new Error('Forbidden'));
    await expect(loadSavedQueries('logs')).rejects.toThrow('Forbidden');
  });
  it('requires matching identity and persisted content before calling a save successful', async () => {
    api.apiMessagePut.mockResolvedValue({ ...record, viewKey: 'wrong' });
    await expect(saveQueryRecord(record)).rejects.toThrow();
    api.apiMessagePut.mockResolvedValue({ ...record, payload: '{}' });
    await expect(saveQueryRecord(record)).rejects.toThrow();
    api.apiMessagePut.mockResolvedValue({ ...record, id: 1, revision: 0 });
    expect(await saveQueryRecord(record)).toMatchObject({ ...record, id: 1, revision: 0 });
  });
  it('deletes only a validated signal/key and propagates denial', async () => {
    api.apiMessageDelete.mockRejectedValue(new Error('No permission'));
    await expect(deleteQueryRecord('logs', 'legacy-1', 2)).rejects.toThrow('No permission');
    expect(api.apiMessageDelete).toHaveBeenCalledWith('/api/signal/saved-view/logs/legacy-1?revision=2');
    await expect(deleteQueryRecord('logs', '../other', 2)).rejects.toThrow();
  });
});

it('requires an advanced revision on update and does not send an unversioned delete', async () => {
  api.apiMessagePut.mockResolvedValue({ ...record, revision: 2 });
  await expect(saveQueryRecord({ ...record, revision: 2 })).rejects.toThrow();
  api.apiMessagePut.mockResolvedValue({ ...record, revision: 3 });
  await expect(saveQueryRecord({ ...record, revision: 2 })).resolves.toMatchObject({ revision: 3 });
  await expect(deleteQueryRecord('logs', 'legacy-1', undefined)).rejects.toThrow('Missing saved query revision');
  expect(api.apiMessageDelete).not.toHaveBeenCalled();
});
