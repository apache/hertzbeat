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
import { AlertContractError, parseSingleAlertPage } from '@/features/alert';
import { alertSummaryEndpoint } from '@/shared/alert-summary/alert-summary-contract';
import { dashboardApiRequest } from './dashboard-api-failure';
import { parseAlertSummary, parseDashboardSummary } from './dashboard-schema';
import { DashboardContractError } from '../model/dashboard-model';

const dashboardSummaryEndpoint = '/api/summary';
const dashboardRecentAlertsEndpoint = '/api/alerts?status=firing&sort=gmtUpdate&order=desc&pageIndex=0&pageSize=10';
const dashboardRecentAlertsRequest = { status: 'firing', pageIndex: 0, pageSize: 10 } as const;

export function loadDashboardSummary(signal?: AbortSignal) {
  return dashboardApiRequest(async () =>
    parseDashboardSummary(await apiMessageGet(dashboardSummaryEndpoint, signal ? { signal } : undefined))
  );
}

export function loadDashboardAlertSummary(signal?: AbortSignal) {
  return dashboardApiRequest(async () =>
    parseAlertSummary(await apiMessageGet(alertSummaryEndpoint, signal ? { signal } : undefined))
  );
}

export function loadDashboardRecentAlerts(signal?: AbortSignal) {
  return dashboardApiRequest(async () => {
    const value = await apiMessageGet(dashboardRecentAlertsEndpoint, signal ? { signal } : undefined);
    try {
      return parseSingleAlertPage(value, dashboardRecentAlertsRequest);
    } catch (error) {
      if (error instanceof AlertContractError) {
        throw new DashboardContractError(error.message, { cause: error });
      }
      throw error;
    }
  });
}
