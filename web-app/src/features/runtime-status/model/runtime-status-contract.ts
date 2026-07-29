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

type RuntimeStatusState = (typeof RUNTIME_STATUS_STATES)[number];
type RuntimeServerErrorCode = 'server_unavailable';
type RuntimeStorageErrorCode = 'storage_unavailable' | 'storage_query_failed';
type RuntimeCollectorsErrorCode = 'collector_status_unavailable';
type RuntimeStatusErrorCode = RuntimeServerErrorCode | RuntimeStorageErrorCode | RuntimeCollectorsErrorCode;
// Request failures are transport evidence and must never populate backend-owned section error codes.
export type RuntimeStatusRequestFailure = 'permission' | 'unavailable' | 'contract' | 'error';

type RuntimeSectionStatus<ErrorCode extends RuntimeStatusErrorCode> = Readonly<{
  status: RuntimeStatusState;
  errorCode: ErrorCode | null;
}>;

type RuntimeServerStatus = RuntimeSectionStatus<RuntimeServerErrorCode>;

type RuntimeStorageStatus = RuntimeSectionStatus<RuntimeStorageErrorCode> & Readonly<{ kind: 'greptime' }>;

export type RuntimeCollectorsStatus = RuntimeSectionStatus<RuntimeCollectorsErrorCode> &
  Readonly<{
    total: number | null;
    online: number | null;
    runtimeHealthy: number | null;
    lastReportedAt: string | null;
  }>;

export type RuntimeStatusPresentation = Readonly<{
  status: RuntimeStatusState;
  errorCode: RuntimeStatusErrorCode | null;
}>;

export type RuntimeStatusSnapshot = Readonly<{
  observedAt: string | null;
  server: RuntimeServerStatus;
  storage: RuntimeStorageStatus;
  collectors: RuntimeCollectorsStatus;
}>;

export type RuntimeStatusViewModel =
  | Readonly<{ state: 'loading'; snapshot: null }>
  | Readonly<{ state: 'ready'; snapshot: RuntimeStatusSnapshot }>
  | Readonly<{ state: 'request-failed'; snapshot: null; failure: RuntimeStatusRequestFailure }>;
