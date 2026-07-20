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

import { apiMessageGet } from '@/core/http/api-message';
import { statusApiRequest, type StatusApiFailureContext } from '@/features/status/api/status-api-failure';

import type { PublicStatusIncidentPage } from '../model/public-status-contract';
import { isCompletePublicStatusIncidentPage } from '../model/public-status-model';
import {
  parsePublicStatusComponents,
  parsePublicStatusIncidents,
  parsePublicStatusOrg,
  PublicStatusContractError
} from './public-status-schema';

export type {
  PublicStatusComponent,
  PublicStatusIncident,
  PublicStatusIncidentPage,
  PublicStatusOrg
} from '../model/public-status-contract';

const incidentPath = '/api/status/page/public/incident';
const incidentPageSize = 20;
const maximumIncidentPages = 100;

type PublicStatusQueryContext = { signal?: AbortSignal };

export const loadPublicStatusOrg = async (context?: PublicStatusQueryContext) =>
  parsePublicStatusOrg(await get('/api/status/page/public/org', context, { resource: 'organization' }));

export const loadPublicStatusComponents = async (context?: PublicStatusQueryContext) =>
  parsePublicStatusComponents(await get('/api/status/page/public/component', context));

export async function loadPublicStatusIncidents(context?: PublicStatusQueryContext) {
  const firstPage = await loadIncidentPage(0, context);
  assertFirstPage(firstPage);
  const pages = [firstPage];

  // The validated first page fixes the termination bound; every later page must keep that snapshot metadata.
  for (let pageIndex = 1; pageIndex < firstPage.totalPages; pageIndex += 1) {
    const page = await loadIncidentPage(pageIndex, context);
    assertContinuationPage(firstPage, page, pageIndex);
    pages.push(page);
  }

  const result = { ...firstPage, content: pages.flatMap(page => page.content) };
  if (!isCompletePublicStatusIncidentPage(result)) throw new PublicStatusContractError();
  return result;
}

async function loadIncidentPage(pageIndex: number, context?: PublicStatusQueryContext) {
  const path = `${incidentPath}?pageIndex=${pageIndex}&pageSize=${incidentPageSize}`;
  return parsePublicStatusIncidents(await get(path, context));
}

function assertFirstPage(page: PublicStatusIncidentPage) {
  const expectedPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  if (
    page.number !== 0 ||
    page.totalPages !== expectedPages ||
    page.totalPages > maximumIncidentPages ||
    page.content.length > page.size
  ) {
    throw new PublicStatusContractError();
  }
}

function assertContinuationPage(
  firstPage: PublicStatusIncidentPage,
  page: PublicStatusIncidentPage,
  pageIndex: number
) {
  const remaining = firstPage.totalElements - pageIndex * firstPage.size;
  const expectedLength = Math.min(firstPage.size, remaining);
  if (
    page.number !== pageIndex ||
    page.totalPages !== firstPage.totalPages ||
    page.totalElements !== firstPage.totalElements ||
    page.size !== firstPage.size ||
    page.content.length !== expectedLength
  ) {
    throw new PublicStatusContractError();
  }
}

function get(path: string, context?: PublicStatusQueryContext, failureContext?: StatusApiFailureContext) {
  return statusApiRequest(
    () => (context?.signal ? apiMessageGet(path, { signal: context.signal }) : apiMessageGet(path)),
    failureContext
  );
}
