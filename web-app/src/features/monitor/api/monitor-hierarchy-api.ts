/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { apiMessageGet } from '@/core/http/api-message';

import { MonitorContractError } from './monitor-contract';
import { parseMonitorAppHierarchy } from './monitor-hierarchy-schema';

function normalizeHierarchyInput(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new MonitorContractError();
  return normalized;
}

export function buildMonitorAppHierarchyPath(app: string, locale: string) {
  const requestedApp = normalizeHierarchyInput(app);
  const requestedLocale = normalizeHierarchyInput(locale);
  const query = new URLSearchParams({ lang: requestedLocale });
  return `/api/apps/hierarchy/${encodeURIComponent(requestedApp)}?${query.toString()}`;
}

export async function loadMonitorAppHierarchy(app: string, locale: string, signal?: AbortSignal) {
  const requestedApp = normalizeHierarchyInput(app);
  const path = buildMonitorAppHierarchyPath(requestedApp, locale);
  const value = await apiMessageGet(path, signal ? { signal } : undefined);
  return parseMonitorAppHierarchy(value, requestedApp);
}
