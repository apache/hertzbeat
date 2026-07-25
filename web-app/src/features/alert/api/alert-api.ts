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

import { apiMessageDelete, apiMessageGet } from '@/core/http/api-message';
import { openBrowserEventStream } from '@/core/http/event-stream';
import { alertSummaryEndpoint } from '@/shared/alert-summary/alert-summary-contract';

import { AlertContractError, writeAlertQuery, type AlertQuery } from '../model/alert-model';
import { alertApiRequest } from './alert-api-failure';
import { parseAlertGroupPage, parseAlertSummary } from './alert-schema';

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
  return alertApiRequest(() => apiMessageDelete(buildAlertDeletePath(ids)));
}

export function openAlertGroupStream(handlers: {
  onOpen: () => void;
  onAlert: () => void;
  onRetrying: () => void;
  onUnavailable: () => void;
}) {
  return openBrowserEventStream('/api/alert/sse/subscribe', {
    eventNames: ['ALERT_EVENT'],
    onOpen: handlers.onOpen,
    onRetrying: handlers.onRetrying,
    onUnavailable: handlers.onUnavailable,
    // Alert bodies stay at the transport boundary; the list and summary are
    // projected again from their canonical APIs after receiving only a signal.
    onEvent: () => handlers.onAlert()
  });
}

function buildAlertDeletePath(ids: number[]) {
  const uniqueIds = [...new Set(ids)].sort((left, right) => left - right);
  if (uniqueIds.length === 0 || uniqueIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new AlertContractError('Alert group ids are invalid');
  }
  const params = new URLSearchParams();
  uniqueIds.forEach(id => params.append('ids', String(id)));
  return `/api/alerts/group?${params.toString()}`;
}
