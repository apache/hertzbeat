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

/** Historical signal pages still represented by persisted shared query assets. */
export const legacySignalRoutes = [
  { id: 'legacy-metrics-manage', path: '/metrics/manage', signal: 'metrics' },
  { id: 'legacy-trace-manage', path: '/trace/manage', signal: 'traces' },
  { id: 'legacy-log-manage', path: '/log/manage', signal: 'logs' },
  { id: 'legacy-ingestion-otlp-metrics', path: '/ingestion/otlp/metrics', signal: 'metrics' }
] as const;

export function normalizeSavedQueryKey(value: string | null | undefined) {
  return value && /^[A-Za-z0-9_.:-]{1,128}$/u.test(value) ? value : undefined;
}
