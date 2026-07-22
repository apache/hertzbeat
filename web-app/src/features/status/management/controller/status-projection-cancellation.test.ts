/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  loadStatusComponent: vi.fn(),
  loadStatusComponents: vi.fn(),
  loadStatusIncident: vi.fn(),
  loadStatusIncidents: vi.fn()
}));
vi.mock('../api/status-management-api', () => api);

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { projectStatusComponents } from './status-component-projection';
import { projectStatusIncidents } from './status-incident-projection';
import { statusManagementQueryKeys } from './status-management-query-keys';

const component: StatusComponent = { id: 4, orgId: 1, name: 'API', method: 0, configState: 0, state: 0 };
const incident: StatusIncident = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  components: [component],
  contents: []
};
const incidentQuery = { search: '', pageIndex: 0, pageSize: 8 };

describe('status management projection cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadStatusComponents.mockResolvedValue([component]);
    api.loadStatusIncidents.mockResolvedValue({
      content: [incident],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
  });

  it('passes the projection query signal to component and incident list reads', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await projectStatusComponents(client, new Set());
    await projectStatusIncidents(client, incidentQuery, new Set());

    expect(api.loadStatusComponents).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.loadStatusIncidents).toHaveBeenCalledWith(incidentQuery, expect.any(AbortSignal));
  });

  it('does not publish an obsolete component projection after query cancellation', async () => {
    const projection = deferred<StatusComponent[]>();
    api.loadStatusComponents.mockReturnValueOnce(projection.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const request = projectStatusComponents(client, new Set());
    await vi.waitFor(() => expect(api.loadStatusComponents).toHaveBeenCalledTimes(1));
    const signal = api.loadStatusComponents.mock.calls[0]?.[0] as AbortSignal;

    await client.cancelQueries({ queryKey: statusManagementQueryKeys.components() });
    projection.resolve([{ ...component, name: 'Obsolete' }]);

    await expect(request).rejects.toBeDefined();
    expect(signal.aborted).toBe(true);
    expect(client.getQueryData(statusManagementQueryKeys.components())).toBeUndefined();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
}
