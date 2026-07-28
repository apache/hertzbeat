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

import { isStatusOrgNotFound, statusRequestFailureKind } from '@/features/status/shared/status-error-model';

import type {
  PublicStatusComponentState,
  PublicStatusIncidentPage,
  PublicStatusIncidentState,
  PublicStatusOrgState,
  PublicStatusState
} from './public-status-contract';
import { PublicStatusContractError as PublicStatusContractFailure } from './public-status-contract';

export { isStatusOrgNotFound } from '@/features/status/shared/status-error-model';
export type { PublicStatusState } from './public-status-contract';

export function publicStatusState(
  orgError: unknown,
  componentsError: unknown,
  incidentsError: unknown
): PublicStatusState {
  if (isStatusOrgNotFound(orgError) && !componentsError && !incidentsError) return 'unconfigured';
  const errors = [orgError, componentsError, incidentsError].filter(Boolean);
  if (errors.some(error => statusRequestFailureKind(error) === 'permission')) return 'permission';
  if (errors.some(error => statusRequestFailureKind(error) === 'unavailable')) return 'unavailable';
  if (errors.some(error => error instanceof PublicStatusContractFailure)) return 'invalid';
  if (errors.length) return 'error';
  return 'ready';
}

export function publicOrgStateKey(state: PublicStatusOrgState) {
  if (state === 'healthy') return 'status.operational';
  if (state === 'degraded') return 'status.degraded';
  if (state === 'incident') return 'status.incident';
  return 'statusManagement.unknown';
}

export function publicComponentStateKey(state: PublicStatusComponentState) {
  if (state === 'healthy') return 'status.normal';
  if (state === 'incident') return 'status.abnormal';
  return 'statusManagement.unknown';
}

export function publicIncidentStateKey(state: PublicStatusIncidentState) {
  if (state === 'investigating') return 'statusManagement.investigating';
  if (state === 'identified') return 'statusManagement.identified';
  if (state === 'monitoring') return 'statusManagement.monitoring';
  if (state === 'resolved') return 'statusManagement.resolved';
  return 'statusManagement.unknown';
}

export function isCompletePublicStatusIncidentPage(page: PublicStatusIncidentPage) {
  if (page.number !== 0) return false;
  if (page.content.length !== page.totalElements) return false;
  if (new Set(page.content.map(incident => incident.id)).size !== page.content.length) return false;
  const expectedPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  return page.totalPages === expectedPages;
}
