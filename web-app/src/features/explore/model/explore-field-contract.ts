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

export const EXPLORE_METRIC_AGGREGATIONS = ['avg', 'sum', 'min', 'max', 'count'] as const;

export type ExploreMetricAggregation = (typeof EXPLORE_METRIC_AGGREGATIONS)[number];
export type OptionalExploreField<T> = { valid: true; value: T | undefined } | { valid: false };

const MAX_METRIC_STEP_SECONDS = 86_400;

/** Keeps URL parsing and form submission on the same backend field contract. */
export function parseMetricAggregation(
  value: string | null | undefined
): OptionalExploreField<ExploreMetricAggregation> {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) return { valid: true, value: undefined };
  const aggregation = EXPLORE_METRIC_AGGREGATIONS.find(candidate => candidate === normalized);
  return aggregation ? { valid: true, value: aggregation } : { valid: false };
}

export function parseMetricStep(value: string | null | undefined): OptionalExploreField<string> {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return { valid: true, value: undefined };
  if (!/^[1-9]\d*$/.test(normalized)) return { valid: false };
  const seconds = Number(normalized);
  return Number.isSafeInteger(seconds) && seconds <= MAX_METRIC_STEP_SECONDS
    ? { valid: true, value: normalized }
    : { valid: false };
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
