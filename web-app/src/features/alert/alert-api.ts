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
import { alertSummaryEndpoint } from '@/shared/alert-summary/alert-summary-contract';

import { writeAlertQuery, type AlertQuery } from './alert-model';
import { alertApiRequest } from './alert-api-failure';
import { parseAlertGroupPage, parseAlertSummary } from './alert-schema';

export function buildAlertListPath(query: AlertQuery) {
  const params = writeAlertQuery(query);
  params.set('sort', 'gmtUpdate');
  params.set('order', 'desc');
  return `/api/alerts/group?${params.toString()}`;
}

export function loadAlertSummary() {
  return alertApiRequest(async () => parseAlertSummary(await apiMessageGet(alertSummaryEndpoint)));
}

export function loadAlertGroups(query: AlertQuery) {
  return alertApiRequest(async () => parseAlertGroupPage(await apiMessageGet(buildAlertListPath(query)), query));
}
