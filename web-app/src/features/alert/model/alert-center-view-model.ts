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

import type { RemotePageState, RemotePayloadState } from '@/shared/remote-state';

import type { AlertGroup, AlertQuery, AlertSummary } from './alert-model';
import type { AlertCapabilities } from './alert-capability-model';
import type { AlertCenterOperationCommand, AlertCenterOperationRecovery } from './alert-center-operation-state';

export type AlertFilterDraft = Pick<AlertQuery, 'search' | 'serviceName' | 'serviceNamespace' | 'environment'>;

export type AlertDraftField = keyof AlertFilterDraft;

export type AlertListState = RemotePageState<AlertGroup, 'unavailable' | 'error'>;

export type AlertSummaryState = RemotePayloadState<{ summary: AlertSummary }, 'unavailable' | 'error'>;

export type AlertCenterState = {
  capabilities: AlertCapabilities;
  command: AlertCenterOperationCommand;
  draft: AlertFilterDraft;
  list: AlertListState;
  query: AlertQuery;
  refreshing: boolean;
  recovery: AlertCenterOperationRecovery | null;
  selectedIds: number[];
  summary: AlertSummaryState;
};
