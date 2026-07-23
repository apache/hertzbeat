/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';

import {
  TopologyContractError,
  writeTopologyQuery,
  type TopologyFailure,
  type TopologyQuery
} from '../model/topology-model';
import { parseTopologyGraph } from './topology-schema';

const topologyPath = '/api/topology';

export async function loadTopologyGraph(query: TopologyQuery, signal?: AbortSignal) {
  const params = writeTopologyQuery(query);
  const value = await apiMessageGet(`${topologyPath}?${params.toString()}`, signal ? { signal } : undefined);
  return parseTopologyGraph(value);
}

export function classifyTopologyError(error: unknown): TopologyFailure {
  if (error instanceof TopologyContractError) return { kind: 'contract' };
  if (error instanceof ApiMessageError) {
    if (error.status === 401 || error.status === 403) return { kind: 'permission' };
    if (error.code === 15) return { kind: 'unavailable' };
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return { kind: 'unavailable' };
  }
  return { kind: 'error' };
}
