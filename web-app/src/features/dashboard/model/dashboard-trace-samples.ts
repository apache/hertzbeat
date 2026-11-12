/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { buildExplorePath, type TraceRow } from '@/features/explore';
import type { DashboardTraceSignals } from './dashboard-signals';
export function dashboardTraceSampleState(read: DashboardTraceSignals['traceSamples'] | undefined) {
  if (!read || read.isPending || read.isFetching) return 'loading';
  if (read.error || !read.isSuccess) return 'error';
  if (read.data.state === 'unsupported') return 'unsupported';
  return read.data.rows.length ? 'ready' : 'unavailable';
}
export function dashboardTraceSampleTarget(row: TraceRow, signals: DashboardTraceSignals) {
  return buildExplorePath({
    signal: 'traces',
    timeRange: 'last-15m',
    errorOnly: true,
    traceId: row.traceId,
    start: signals.clock.start,
    end: signals.clock.end,
    timeZone: 'UTC',
    serviceName: signals.serviceName || undefined,
    environment: signals.environment || undefined
  });
}
