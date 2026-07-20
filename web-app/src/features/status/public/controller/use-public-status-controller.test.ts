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

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusOrgNotFoundError } from '@/features/status/shared/status-error-model';

import type { PublicStatusComponent, PublicStatusIncidentPage, PublicStatusOrg } from '../model/public-status-contract';
import { usePublicStatusController } from './use-public-status-controller';

type QueryEvidence = { data?: unknown; error?: unknown; isPending: boolean };

const reactQuery = vi.hoisted(() => ({
  useQuery: vi.fn<(options: { queryKey: readonly string[] }) => QueryEvidence>()
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: reactQuery.useQuery }));

const org: PublicStatusOrg = { name: 'HertzBeat', description: 'Status', state: 'healthy' };
const components: PublicStatusComponent[] = [{ id: 1, name: 'API', state: 'healthy' }];
const incidents: PublicStatusIncidentPage = {
  content: [{ id: 2, name: 'Maintenance', state: 'identified' }],
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
    reactQuery.useQuery.mockImplementation(({ queryKey }: { queryKey: readonly string[] }) => {
      const result = evidence.get(queryKey[0] ?? '');
      if (!result) throw new Error('Missing public status query evidence');
      return result;
    });
  });

  it('returns authoritative successful resources and established cache identities', () => {
    const { result } = renderHook(() => usePublicStatusController());

    expect(result.current).toEqual({ org, components, incidents: incidents.content, loading: false, state: 'ready' });
    expect(reactQuery.useQuery.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ['public-status-org'],
      ['public-status-components'],
      ['public-status-incidents']
    ]);
  });

  it('keeps pending evidence ahead of cached data', () => {
    setEvidence({ data: org }, { data: components, isPending: true }, { data: incidents });

    const { result } = renderHook(() => usePublicStatusController());

    expect(result.current).toEqual({
      org: undefined,
      components: [],
      incidents: [],
      loading: true,
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
      org: undefined,
      components: [],
      incidents: [],
      loading: false,
      state: 'error'
    });
  });
});

function setEvidence(
  orgResult: Omit<QueryEvidence, 'isPending'> & { isPending?: boolean },
  componentResult: Omit<QueryEvidence, 'isPending'> & { isPending?: boolean },
  incidentResult: Omit<QueryEvidence, 'isPending'> & { isPending?: boolean }
) {
  evidence.set('public-status-org', { isPending: false, ...orgResult });
  evidence.set('public-status-components', { isPending: false, ...componentResult });
  evidence.set('public-status-incidents', { isPending: false, ...incidentResult });
}
