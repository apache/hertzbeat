/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusOrgNotFoundError } from '@/features/status/shared/status-error-model';

import type { PublicStatusComponent, PublicStatusIncidentPage, PublicStatusOrg } from '../model/public-status-contract';
import { createPublicStatusIncidentRange } from '../model/public-status-incident-range';
import { usePublicStatusController } from './use-public-status-controller';

type QueryEvidence = {
  data?: unknown;
  error?: unknown;
  isFetching: boolean;
  isPending: boolean;
  refetch: ReturnType<typeof vi.fn>;
};
type QueryOptions = {
  queryKey: readonly [string, ...unknown[]];
  queryFn: (context: { signal: AbortSignal }) => unknown;
};

const reactQuery = vi.hoisted(() => ({
  useQuery: vi.fn<(options: QueryOptions) => QueryEvidence>()
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: reactQuery.useQuery }));
const api = vi.hoisted(() => ({
  loadPublicStatusComponents: vi.fn(),
  loadPublicStatusIncidents: vi.fn(),
  loadPublicStatusOrg: vi.fn()
}));
vi.mock('../api/public-status-api', () => api);

const org: PublicStatusOrg = {
  name: 'HertzBeat',
  description: 'Status',
  home: '/',
  logo: '/logo.svg',
  state: 'healthy'
};
const components: PublicStatusComponent[] = [{ id: 1, name: 'API', state: 'healthy', history: [] }];
const incidents: PublicStatusIncidentPage = {
  content: [{ id: 2, name: 'Maintenance', state: 'identified', components: [], contents: [] }],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20
};
const evidence = new Map<string, QueryEvidence>();

describe('usePublicStatusController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEvidence({ data: org }, { data: components }, { data: incidents });
    reactQuery.useQuery.mockImplementation(({ queryKey }: QueryOptions) => {
      const result = evidence.get(queryKey[0]);
      if (!result) throw new Error('Missing public status query evidence');
      return result;
    });
  });

  it('returns authoritative successful resources and established cache identities', () => {
    const { result } = renderHook(() => usePublicStatusController());
    const range = createPublicStatusIncidentRange(new Date().getFullYear());

    expect(result.current).toEqual({
      ...actions(range),
      org,
      components,
      incidents: incidents.content,
      loading: false,
      state: 'ready'
    });
    expect(reactQuery.useQuery.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ['public-status-org'],
      ['public-status-components'],
      ['public-status-incidents', range.year, range.startTime, range.endTime]
    ]);
  });

  it('passes each TanStack cancellation signal to the owning status API', async () => {
    renderHook(() => usePublicStatusController());
    const controller = new AbortController();

    await Promise.all(
      reactQuery.useQuery.mock.calls.map(([options]) => options.queryFn({ signal: controller.signal }))
    );

    expect(api.loadPublicStatusOrg).toHaveBeenCalledWith({ signal: controller.signal });
    expect(api.loadPublicStatusComponents).toHaveBeenCalledWith({ signal: controller.signal });
    expect(api.loadPublicStatusIncidents).toHaveBeenCalledWith(
      createPublicStatusIncidentRange(new Date().getFullYear()),
      { signal: controller.signal }
    );
  });

  it('keeps pending evidence ahead of cached data', () => {
    setEvidence({ data: org }, { data: components, isPending: true }, { data: incidents });

    const { result } = renderHook(() => usePublicStatusController());

    expect(result.current).toEqual({
      ...actions(createPublicStatusIncidentRange(new Date().getFullYear())),
      org: undefined,
      components: [],
      incidents: [],
      loading: true,
      state: 'ready'
    });
  });

  it('keeps organization and components visible while a selected incident year loads', () => {
    setEvidence({ data: org }, { data: components }, { isPending: true, isFetching: true });

    expect(renderHook(() => usePublicStatusController()).result.current).toEqual({
      ...actions(createPublicStatusIncidentRange(new Date().getFullYear())),
      incidentLoading: true,
      org,
      components,
      incidents: [],
      loading: false,
      state: 'ready'
    });
  });

  it('uses unconfigured only for exact missing organization with successful sibling queries', () => {
    const missing = new StatusOrgNotFoundError();
    setEvidence({ error: missing }, { data: [] }, { data: { ...incidents, content: [], totalElements: 0 } });
    expect(renderHook(() => usePublicStatusController()).result.current.state).toBe('unconfigured');

    setEvidence({ error: missing }, { error: new Error('components unavailable') }, { data: incidents });
    expect(renderHook(() => usePublicStatusController()).result.current.state).toBe('error');
  });

  it('preserves a confirmed organization header when a sibling query fails', () => {
    setEvidence({ data: org }, { error: new Error('components unavailable') }, { data: incidents });

    expect(renderHook(() => usePublicStatusController()).result.current).toEqual({
      ...actions(createPublicStatusIncidentRange(new Date().getFullYear())),
      org,
      components: [],
      incidents: [],
      loading: false,
      state: 'error'
    });
  });

  it('distinguishes rejected requests from unavailable transport', () => {
    setEvidence({ data: org }, { error: new Error('invalid contract') }, { data: incidents });

    expect(renderHook(() => usePublicStatusController()).result.current.state).toBe('error');
  });

  it('fails closed when a completed successful query has no authoritative data', () => {
    setEvidence({ data: org }, {}, { data: incidents });

    expect(renderHook(() => usePublicStatusController()).result.current).toMatchObject({
      components: [],
      incidents: [],
      loading: false,
      state: 'error'
    });
  });

  it('does not present an incomplete incident page as ready', () => {
    setEvidence({ data: org }, { data: components }, { data: { ...incidents, totalElements: 2 } });

    expect(renderHook(() => usePublicStatusController()).result.current).toEqual({
      ...actions(createPublicStatusIncidentRange(new Date().getFullYear())),
      org: undefined,
      components: [],
      incidents: [],
      loading: false,
      state: 'error'
    });
  });

  it('switches incident query ownership to the selected canonical year range', () => {
    const { result } = renderHook(() => usePublicStatusController());
    const historicalYear = new Date().getFullYear() - 1;
    const historicalRange = createPublicStatusIncidentRange(historicalYear);

    act(() => result.current.selectIncidentYear(historicalYear));

    expect(reactQuery.useQuery.mock.calls.at(-1)?.[0].queryKey).toEqual([
      'public-status-incidents',
      historicalRange.year,
      historicalRange.startTime,
      historicalRange.endTime
    ]);
    expect(result.current.incidentRange).toEqual(historicalRange);
  });

  it('ignores incident years outside the backend timestamp range', () => {
    const { result } = renderHook(() => usePublicStatusController());
    const initialRange = result.current.incidentRange;

    act(() => result.current.selectIncidentYear(1969));

    expect(result.current.incidentRange).toEqual(initialRange);
  });

  it('refreshes only the currently selected incident query', () => {
    const { result } = renderHook(() => usePublicStatusController());
    const orgEvidence = evidence.get('public-status-org');
    const componentEvidence = evidence.get('public-status-components');
    const incidentEvidence = evidence.get('public-status-incidents');

    act(() => void result.current.refreshIncidents());

    expect(incidentEvidence?.refetch).toHaveBeenCalledOnce();
    expect(orgEvidence?.refetch).not.toHaveBeenCalled();
    expect(componentEvidence?.refetch).not.toHaveBeenCalled();
  });
});

function setEvidence(
  orgResult: Partial<QueryEvidence>,
  componentResult: Partial<QueryEvidence>,
  incidentResult: Partial<QueryEvidence>
) {
  evidence.set('public-status-org', queryEvidence(orgResult));
  evidence.set('public-status-components', queryEvidence(componentResult));
  evidence.set('public-status-incidents', queryEvidence(incidentResult));
}

function queryEvidence(result: Partial<QueryEvidence>): QueryEvidence {
  return { isFetching: false, isPending: false, refetch: vi.fn(), ...result };
}

function actions(range: ReturnType<typeof createPublicStatusIncidentRange>) {
  return {
    incidentLoading: false,
    incidentRange: range,
    incidentRefreshing: false,
    refreshIncidents: expect.any(Function),
    selectIncidentYear: expect.any(Function)
  };
}
