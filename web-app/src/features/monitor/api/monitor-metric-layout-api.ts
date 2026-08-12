/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import type { MonitorMetricLayoutDocument } from '../model/monitor-metric-layout-model';
import { parseMonitorMetricLayout } from './monitor-metric-layout-schema';

export type MonitorMetricLayoutSavePayload = MonitorMetricLayoutDocument & { expectedRevision: string };

function buildMonitorMetricLayoutPath(application: string) {
  return `/api/metrics/layout/${encodeURIComponent(application)}`;
}

export async function loadMonitorMetricLayout(application: string, signal?: AbortSignal) {
  const value = await apiMessageGet(buildMonitorMetricLayoutPath(application), signal ? { signal } : undefined);
  return parseMonitorMetricLayout(value);
}

export async function saveMonitorMetricLayout(application: string, payload: MonitorMetricLayoutSavePayload) {
  return parseMonitorMetricLayout(await apiMessagePut(buildMonitorMetricLayoutPath(application), payload));
}

export async function resetMonitorMetricLayout(application: string, expectedRevision: string) {
  const params = new URLSearchParams({ expectedRevision });
  await apiMessageDelete(`${buildMonitorMetricLayoutPath(application)}?${params.toString()}`);
}
