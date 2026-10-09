/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { apiMessageGet } from '@/core/http/api-message';
import { servicesExactWindow, type ServicesQuery } from '@/shared/navigation/services-path';
import {
  serviceSortKeys,
  servicePerformancePageSchema,
  type ServicePerformancePage
} from '../model/service-performance-model';
export async function loadServicePerformance(
  query: ServicesQuery,
  signal?: AbortSignal
): Promise<ServicePerformancePage> {
  const window = servicesExactWindow(query);
  if (!window) throw new Error('Service performance requires an exact window');
  const { params, sort, order, pageIndex } = performanceRequest(query, window);
  const page = servicePerformancePageSchema.parse(
    await apiMessageGet(`/api/entities/services/red?${params}`, signal ? { signal } : undefined)
  );
  if (
    page.window.start !== window.from ||
    page.window.end !== window.to ||
    page.sort !== sort ||
    page.order !== order ||
    page.pageIndex !== pageIndex
  )
    throw new Error('Service performance response scope mismatch');
  return page;
}

function performanceRequest(query: ServicesQuery, window: { from: number; to: number }) {
  const sort = z.enum(serviceSortKeys).parse(query.sort ?? 'errorCount');
  const order = z.enum(['asc', 'desc']).parse(query.order ?? 'desc');
  const pageIndex = z
    .number()
    .int()
    .nonnegative()
    .safe()
    .parse(query.pageIndex ?? 0);
  const params = new URLSearchParams({
    start: String(window.from),
    end: String(window.to),
    sort,
    order,
    pageIndex: String(pageIndex),
    pageSize: '10'
  });
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.environmentFilter?.trim()) params.set('environment', query.environmentFilter.trim());
  return { params, sort, order, pageIndex };
}
