/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ServiceOperation } from '../model/services-model';
import { z } from 'zod';
import { apiMessageGet } from '@/core/http/api-message';
import { loadEntities, loadEntityDetail, readEntityQuery } from '@/features/entity/queries';
import { servicesExactWindow, type ServicesQuery } from '@/shared/navigation/services-path';
import { parseQueryContext, writeQueryContext } from '@/shared/query-context';

const count = z.number().int().nonnegative().safe();
const latency = z.number().finite().nonnegative().nullable();
const operationSchema = z
  .object({
    value: z.string(),
    traceCount: count,
    errorTraceCount: count,
    latencyAvgMs: latency,
    latencyP95Ms: latency
  })
  .refine(row => row.errorTraceCount <= row.traceCount);
const operationsSchema = z.object({ groupBy: z.literal('operation.name'), groups: z.array(operationSchema).max(20) });

export async function loadServices(query: ServicesQuery, signal?: AbortSignal) {
  const filters = readEntityQuery(
    new URLSearchParams({
      type: 'service',
      search: query.search ?? '',
      environment: query.environmentFilter ?? '',
      pageIndex: String(query.pageIndex ?? 0)
    })
  );
  const page = await loadEntities(filters, signal);
  if (page.content.some(row => row.type !== 'service')) throw new Error('Expected service catalog records');
  return page;
}

export async function loadServiceDetail(id: number, signal?: AbortSignal) {
  const detail = await loadEntityDetail(id, signal);
  if (detail.entity.type !== 'service') throw new Error('Expected service entity');
  return detail;
}

export async function loadServiceOperations(query: ServicesQuery, signal?: AbortSignal): Promise<ServiceOperation[]> {
  const params = serviceSignalParams(query);
  for (const [key, value] of Object.entries({
    groupBy: 'operation.name',
    spanScope: 'root',
    orderBy: 'error-count-desc',
    limit: '20',
    minCount: '1'
  }))
    params.set(key, value);
  const value = await apiMessageGet(`/api/traces/stats/group-by?${params}`, signal ? { signal } : undefined);
  return operationsSchema.parse(value).groups;
}

export async function loadServiceTraceFreshness(query: ServicesQuery, signal?: AbortSignal) {
  const value = await apiMessageGet(
    `/api/traces/stats/overview?${serviceSignalParams(query)}`,
    signal ? { signal } : undefined
  );
  return (
    z
      .object({
        totalTraceCount: count,
        errorTraceCount: count,
        latestObservedAt: count.nullish(),
        hasActiveTrace: z.boolean()
      })
      .refine(value => value.errorTraceCount <= value.totalTraceCount)
      .parse(value).latestObservedAt ?? null
  );
}

function serviceSignalParams(query: ServicesQuery) {
  const window = servicesExactWindow(query);
  if (!window) throw new Error('Service signals require a bounded exact window');
  const context = parseQueryContext(writeQueryContext(new URLSearchParams(), query));
  const params = writeQueryContext(new URLSearchParams(), context);
  // Intake profiles select setup instructions; they are not a signal repository predicate.
  params.delete('intakeProfileId');
  params.set('start', String(window.from));
  params.set('end', String(window.to));
  return params;
}
