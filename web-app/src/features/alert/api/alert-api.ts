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

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';
import { openBrowserEventStream } from '@/core/http/event-stream';
import { alertSummaryEndpoint } from '@/shared/alert-summary/alert-summary-contract';

import {
  AlertContractError,
  alertGroupTargetStatuses,
  normalizeAlertGroupIds,
  writeAlertQuery,
  type AlertGroupTargetStatus,
  type AlertQuery
} from '../model/alert-model';
import { alertApiRequest } from './alert-api-failure';
import { parseAlertEventSignal, type AlertEventSignal } from './alert-event-schema';
import { parseAlertGroupPage, parseAlertSummary } from './alert-schema';

const alertGroupEndpoint = '/api/alerts/group';
const alertGroupStatusEndpoint = `${alertGroupEndpoint}/status`;

export function buildAlertListPath(query: AlertQuery) {
  const params = writeAlertQuery(query);
  params.set('sort', 'gmtUpdate');
  params.set('order', 'desc');
  return `/api/alerts/group?${params.toString()}`;
}

export function loadAlertSummary(signal?: AbortSignal) {
  return alertApiRequest(
    async () =>
      parseAlertSummary(
        await (signal ? apiMessageGet(alertSummaryEndpoint, { signal }) : apiMessageGet(alertSummaryEndpoint))
      ),
    signal
  );
}

export function loadAlertGroups(query: AlertQuery, signal?: AbortSignal) {
  return alertApiRequest(async () => {
    const path = buildAlertListPath(query);
    const response = await (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path));
    return parseAlertGroupPage(response, query);
  }, signal);
}

export function deleteAlertGroups(ids: number[]) {
  return alertApiRequest(() => apiMessageDelete(buildAlertGroupCommandPath(alertGroupEndpoint, ids)));
}

export function updateAlertGroupStatus(ids: number[], status: AlertGroupTargetStatus) {
  if (!alertGroupTargetStatuses.includes(status)) {
    return Promise.reject(new AlertContractError('Alert group target status is invalid'));
  }
  return alertApiRequest(() =>
    apiMessagePut(buildAlertGroupCommandPath(`${alertGroupStatusEndpoint}/${status}`, ids), null)
  );
}

export function openAlertGroupStream(handlers: {
  onOpen: () => void;
  onAlert: (event: AlertEventSignal | null) => void;
  onMutation: () => void;
  onRetrying: () => void;
  onUnavailable: () => void;
}) {
  return openBrowserEventStream('/api/alert/sse/subscribe', {
    eventNames: ['ALERT_EVENT', 'ALERT_GROUP_MUTATION'],
    onOpen: handlers.onOpen,
    onRetrying: handlers.onRetrying,
    onUnavailable: handlers.onUnavailable,
    // Raw alert bodies stay at the transport boundary. Only id and status may
    // drive an in-memory notification; canonical APIs still own rendered data.
    onEvent: (name, data) => {
      if (name === 'ALERT_GROUP_MUTATION') {
        // Sparse mutation events are invalidation signals, never notification payloads.
        handlers.onMutation();
        return;
      }
      handlers.onAlert(parseAlertEventSignal(data));
    }
  });
}

function buildAlertGroupCommandPath(endpoint: string, ids: number[]) {
  const params = new URLSearchParams();
  normalizeAlertGroupIds(ids).forEach(id => params.append('ids', String(id)));
  return `${endpoint}?${params.toString()}`;
}
