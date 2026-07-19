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

import { isStatusOrgNotFound } from '@/features/status/shared/status-error-model';

import type { PublicStatusIncidentPage, PublicStatusState } from './public-status-contract';

export { isStatusOrgNotFound } from '@/features/status/shared/status-error-model';
export type { PublicStatusState } from './public-status-contract';

export function publicStatusState(
  orgError: unknown,
  componentsError: unknown,
  incidentsError: unknown
): PublicStatusState {
  if (isStatusOrgNotFound(orgError) && !componentsError && !incidentsError) return 'unconfigured';
  if (orgError || componentsError || incidentsError) return 'unavailable';
  return 'ready';
}

export function isCompletePublicStatusIncidentPage(page: PublicStatusIncidentPage) {
  if (page.number !== 0) return false;
  if (page.content.length !== page.totalElements) return false;
  if (new Set(page.content.map(incident => incident.id)).size !== page.content.length) return false;
  const expectedPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  return page.totalPages === expectedPages;
}
