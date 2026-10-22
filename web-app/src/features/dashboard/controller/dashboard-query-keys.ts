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

type Identity = ReadonlyArray<string | null | undefined>;
export const dashboardQueryKeys = {
  monitors: () => ['dashboard', 'monitors'] as const,
  alerts: () => ['dashboard', 'alerts'] as const,
  services: () => ['dashboard', 'services'] as const,
  status: (identity: Identity, status: string) => ['dashboard-v2', ...identity, 'monitors', status] as const,
  firing: (identity: Identity) => ['dashboard-v2', ...identity, 'firing'] as const,
  saved: (identity: Identity) => ['dashboard-v2', ...identity, 'saved'] as const,
  metric: (identity: Identity, key: string, revision: number | null | undefined, scope: string, end: number) =>
    ['dashboard-v2', ...identity, 'metric', key, revision, scope, end] as const,
  logTrend: (identity: Identity, scope: string, end: number) =>
    ['dashboard-v2', ...identity, 'log-trend', scope, end] as const,
  traceTrend: (identity: Identity, scope: string, end: number) =>
    ['dashboard-v2', ...identity, 'trace-histogram', scope, end] as const,
  traceSamples: (identity: Identity, scope: string, end: number) =>
    ['dashboard-v2', ...identity, 'trace-error-samples', scope, end] as const,
  errors: (identity: Identity, scope: string, end: number) =>
    ['dashboard-v2', ...identity, 'repeated-errors', scope, end] as const,
  errorRecords: (identity: Identity, scope: string, end: number, group: string | undefined) =>
    ['dashboard-v2', ...identity, 'repeated-error-records', scope, end, group] as const,
  catalog: (identity: Identity) => ['dashboard-v2', ...identity, 'service-catalog'] as const
};
