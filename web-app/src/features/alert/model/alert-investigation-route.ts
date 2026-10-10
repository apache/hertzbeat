/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { buildAlertInvestigationRoutePath, normalizeAlertCenterReturnTo } from '@/shared/navigation/app-paths';
import { normalizeInvestigationTimeZone, type InvestigationTimeWindow } from '@/shared/query-context';

import type { AlertRecord } from './alert-model';

const halfWindowMilliseconds = 15 * 60_000;
const maximumWindowMilliseconds = 24 * 60 * 60_000;

export type AlertInvestigationRoute =
  { kind: 'invalid' } | { kind: 'ready'; alertId: number; window: InvestigationTimeWindow; returnTo: string };

export function buildAlertInvestigationPath(
  alert: Pick<AlertRecord, 'id' | 'activeAt' | 'startAt'>,
  timeZone: string,
  returnTo?: string
) {
  const anchor = validTimestamp(alert.activeAt) ? alert.activeAt : validTimestamp(alert.startAt) ? alert.startAt : null;
  const normalizedTimeZone = normalizeInvestigationTimeZone(timeZone);
  if (!validAlertId(alert.id) || anchor == null || !normalizedTimeZone) return undefined;
  const window = { from: anchor - halfWindowMilliseconds, to: anchor + halfWindowMilliseconds };
  if (!validWindow(window.from, window.to)) return undefined;
  const params = new URLSearchParams({
    start: String(window.from),
    end: String(window.to),
    timeZone: normalizedTimeZone,
    returnTo: normalizeAlertCenterReturnTo(returnTo) ?? '/alerts'
  });
  return `${buildAlertInvestigationRoutePath(alert.id)}?${params.toString()}`;
}

export function readAlertInvestigationRoute(
  alertIdParam: string | undefined,
  params: URLSearchParams
): AlertInvestigationRoute {
  const alertId = positiveInteger(alertIdParam);
  const from = positiveInteger(params.get('start') ?? undefined);
  const to = positiveInteger(params.get('end') ?? undefined);
  const timeZone = normalizeInvestigationTimeZone(params.get('timeZone'));
  if (alertId == null || from == null || to == null || !validWindow(from, to) || !timeZone) {
    return { kind: 'invalid' };
  }
  return {
    kind: 'ready',
    alertId,
    window: { from, to, timeZone },
    returnTo: normalizeAlertCenterReturnTo(params.get('returnTo')) ?? '/alerts'
  };
}

function validAlertId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function validTimestamp(value: number | null): value is number {
  return value != null && Number.isSafeInteger(value) && value > 0;
}

function positiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function validWindow(from: number, to: number) {
  return from > 0 && to > from && to - from <= maximumWindowMilliseconds;
}
