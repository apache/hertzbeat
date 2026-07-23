/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExactTimeWindow } from '@/shared/query-context';
import { hasExactTimeWindowFields, parseExactTimeWindow, writeExactTimeWindow } from '@/shared/time';

export type TopologyQuery = {
  focusEntityId?: number;
  depth: 1 | 2;
  environment?: string;
  sourceKind?: string;
  window?: ExactTimeWindow;
  relationType?: string;
  hideInternal?: boolean;
  pageIndex?: number;
  pageSize?: number;
};

export type TopologyFailure = { kind: 'permission' | 'unavailable' | 'contract' | 'error' };
export type TopologyScopePatch = {
  focusEntityId?: number | undefined;
  depth?: TopologyQuery['depth'];
  environment?: string | undefined;
  sourceKind?: string | undefined;
  relationType?: string | undefined;
  hideInternal?: boolean | undefined;
};

const JAVA_INTEGER_MAX = 2_147_483_647;
export const topologyDepthValues = [1, 2] as const;
export const topologyPageSizes = [25, 50, 100] as const;
const topologyDefaultPageSize = topologyPageSizes[0];

export function parseTopologyQuery(params: URLSearchParams): TopologyQuery {
  const focusEntityId = readInteger(params, 'focusEntityId', 1, Number.MAX_SAFE_INTEGER);
  const depth = readInteger(params, 'depth', 1, 2) ?? 1;
  const environment = readFilter(params, 'environment');
  const sourceKind = readFilter(params, 'sourceKind');
  const relationType = readFilter(params, 'relationType');
  const hideInternal = readBoolean(params, 'hideInternal');
  const pageIndex = readInteger(params, 'pageIndex', 0, JAVA_INTEGER_MAX);
  const pageSize = readInteger(params, 'pageSize', 1, 200);
  const window = parseExactTimeWindow(params);
  if (hasExactTimeWindowFields(params) && !window) throw new TopologyContractError();
  return {
    depth: depth as 1 | 2,
    ...(focusEntityId === undefined ? {} : { focusEntityId }),
    ...(environment ? { environment } : {}),
    ...(sourceKind ? { sourceKind } : {}),
    ...(window ? { window } : {}),
    ...(relationType ? { relationType } : {}),
    ...(hideInternal === undefined ? {} : { hideInternal }),
    ...(pageIndex === undefined ? {} : { pageIndex }),
    ...(pageSize === undefined ? {} : { pageSize })
  };
}

export function writeTopologyQuery(query: TopologyQuery) {
  const params = new URLSearchParams();
  writeInteger(params, 'focusEntityId', query.focusEntityId, 1, Number.MAX_SAFE_INTEGER);
  writeInteger(params, 'depth', query.depth, 1, 2);
  writeFilter(params, 'environment', query.environment);
  writeFilter(params, 'sourceKind', query.sourceKind);
  const next = query.window ? writeExactTimeWindow(params, query.window) : params;
  writeFilter(next, 'relationType', query.relationType);
  if (query.hideInternal !== undefined) {
    if (typeof query.hideInternal !== 'boolean') throw new TopologyContractError();
    next.set('hideInternal', String(query.hideInternal));
  }
  writeInteger(next, 'pageIndex', query.pageIndex, 0, JAVA_INTEGER_MAX);
  writeInteger(next, 'pageSize', query.pageSize, 1, 200);
  return next;
}

export function changeTopologyScope(query: TopologyQuery, patch: TopologyScopePatch): TopologyQuery {
  const next = { ...query, ...patch };
  return {
    depth: next.depth,
    ...(next.focusEntityId === undefined ? {} : { focusEntityId: next.focusEntityId }),
    ...(next.environment === undefined ? {} : { environment: next.environment }),
    ...(next.sourceKind === undefined ? {} : { sourceKind: next.sourceKind }),
    ...(next.window === undefined ? {} : { window: next.window }),
    ...(next.relationType === undefined ? {} : { relationType: next.relationType }),
    ...(next.hideInternal === undefined ? {} : { hideInternal: next.hideInternal }),
    pageIndex: 0,
    ...(next.pageSize === undefined ? {} : { pageSize: next.pageSize })
  };
}

export function changeTopologyPage(query: TopologyQuery, pageIndex: number, pageSize: number): TopologyQuery {
  return { ...query, pageIndex, pageSize };
}

export function withTopologyPageDefaults(query: TopologyQuery): TopologyQuery {
  return {
    ...query,
    pageIndex: query.pageIndex ?? 0,
    pageSize: query.pageSize ?? topologyDefaultPageSize
  };
}

export class TopologyContractError extends Error {
  constructor() {
    super('Topology contract is invalid');
    this.name = 'TopologyContractError';
  }
}

function readInteger(params: URLSearchParams, field: string, minimum: number, maximum: number) {
  const value = params.get(field);
  if (value === null) return undefined;
  if (!/^\d+$/u.test(value)) throw new TopologyContractError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new TopologyContractError();
  return parsed;
}

function readBoolean(params: URLSearchParams, field: string) {
  const value = params.get(field);
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new TopologyContractError();
}

function readFilter(params: URLSearchParams, field: string) {
  return params.get(field)?.trim() || undefined;
}

function writeInteger(
  params: URLSearchParams,
  field: string,
  value: number | undefined,
  minimum: number,
  maximum: number
) {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new TopologyContractError();
  params.set(field, String(value));
}

function writeFilter(params: URLSearchParams, field: string, value: string | undefined) {
  const normalized = value?.trim();
  if (normalized) params.set(field, normalized);
}
