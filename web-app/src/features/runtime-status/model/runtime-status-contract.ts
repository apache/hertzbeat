/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const RUNTIME_STATUS_STATES = ['available', 'degraded', 'unavailable', 'unknown'] as const;
export const RUNTIME_STATUS_ERROR_CODES = [
  'server_unavailable',
  'storage_unavailable',
  'storage_query_failed',
  'collector_status_unavailable'
] as const;

type RuntimeStatusState = (typeof RUNTIME_STATUS_STATES)[number];
export type RuntimeStatusErrorCode = (typeof RUNTIME_STATUS_ERROR_CODES)[number];

export type RuntimeComponentStatus = {
  status: RuntimeStatusState;
  errorCode: RuntimeStatusErrorCode | null;
};

type RuntimeStorageStatus = RuntimeComponentStatus & { kind: 'greptime' };

type RuntimeCollectorsStatus = RuntimeComponentStatus & {
  total: number | null;
  online: number | null;
  runtimeHealthy: number | null;
  lastReportedAt: string | null;
};

export type RuntimeStatusSnapshot = {
  observedAt: string | null;
  server: RuntimeComponentStatus;
  storage: RuntimeStorageStatus;
  collectors: RuntimeCollectorsStatus;
};

export type RuntimeStatusViewModel =
  | { state: 'loading'; snapshot: null }
  | { state: 'ready'; snapshot: RuntimeStatusSnapshot }
  | { state: 'unavailable'; snapshot: RuntimeStatusSnapshot };
