/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageGet } from '@/core/http/api-message';

import { MonitorContractError } from '../model/monitor-contract';
import { parseMonitorAppList } from './monitor-page-schema';

/** Loads the complete monitor choice set used by app-scoped binding workflows. */
export async function loadMonitorsByApp(app: string, signal?: AbortSignal) {
  const normalizedApp = app.trim();
  if (!normalizedApp) throw new MonitorContractError('Monitor application is required');
  const value = await apiMessageGet(
    `/api/monitors/${encodeURIComponent(normalizedApp)}`,
    signal ? { signal } : undefined
  );
  return parseMonitorAppList(value, normalizedApp);
}
