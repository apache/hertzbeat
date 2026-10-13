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

export {
  EXPLORE_METRIC_AGGREGATIONS,
  parseMetricAggregation,
  parseMetricStep,
  isMetricQueryName
} from '@/platform/perses';
export type { OptionalExploreField } from '@/platform/perses';
import { parseMetricAggregation, parseMetricStep, type OptionalExploreField } from '@/platform/perses';

export function parseExploreAutoRefresh(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const interval = Number(value);
  return interval === 30_000 || interval === 60_000 ? interval : undefined;
}

export function parseTraceDuration(value: string | null | undefined): OptionalExploreField<number> {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return { valid: true, value: undefined };
  if (!/^\d+$/.test(normalized)) return { valid: false };
  const duration = Number(normalized);
  return Number.isSafeInteger(duration) ? { valid: true, value: duration } : { valid: false };
}

export function isOrderedTraceDurationRange(minimum: number | undefined, maximum: number | undefined) {
  return minimum == null || maximum == null || minimum <= maximum;
}

export function acceptedExploreField<T>(result: OptionalExploreField<T>) {
  return result.valid ? result.value : undefined;
}

/** Parses every constrained URL field before it can become a transport query. */
export function parseExploreFilterParams(params: URLSearchParams) {
  const minimumDuration = acceptedExploreField(parseTraceDuration(params.get('minDurationMs')));
  const maximumDuration = acceptedExploreField(parseTraceDuration(params.get('maxDurationMs')));
  const durationRangeValid = isOrderedTraceDurationRange(minimumDuration, maximumDuration);
  return {
    aggregation: acceptedExploreField(parseMetricAggregation(params.get('aggregation'))),
    step: acceptedExploreField(parseMetricStep(params.get('step'))),
    minDurationMs: durationRangeValid ? minimumDuration : undefined,
    maxDurationMs: durationRangeValid ? maximumDuration : undefined
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export const LOG_RECORD_UID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function isLogRecordUid(value: unknown): value is string {
  return typeof value === 'string' && LOG_RECORD_UID_PATTERN.test(value);
}

export function validExploreTimeZone(value: string | undefined) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
