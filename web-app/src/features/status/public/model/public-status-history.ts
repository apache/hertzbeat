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

import type { PublicStatusComponent, PublicStatusHistory } from './public-status-contract';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function publicStatusAvailability(history: PublicStatusHistory[] | null) {
  if (!history?.length || history.some(entry => entry.state === 'unknown')) return undefined;

  const durationEvidence = history.map(entry => [entry.normal, entry.abnormal, entry.unknowing] as const);
  if (durationEvidence.every(values => values.every(value => value !== undefined))) {
    const normal = durationEvidence.reduce((total, values) => total + (values[0] ?? 0), 0);
    const abnormal = durationEvidence.reduce((total, values) => total + (values[1] ?? 0), 0);
    const unknown = durationEvidence.reduce((total, values) => total + (values[2] ?? 0), 0);
    if (unknown > 0) return undefined;
    if (normal + abnormal > 0) return normal / (normal + abnormal);
  }

  const samples = history
    .map(entry => entry.uptime)
    .filter((value): value is number => value !== undefined && Number.isFinite(value) && value >= 0 && value <= 1);
  if (samples.length !== history.length) return undefined;
  return samples.reduce((total, value) => total + value, 0) / samples.length;
}

export function recentPublicStatusHistory(history: PublicStatusHistory[] | null, limit: number) {
  if (history === null) return { chronological: null, newestFirst: null };
  const newestFirst = [...history].sort((left, right) => right.timestamp - left.timestamp).slice(0, Math.max(0, limit));
  return { chronological: [...newestFirst].reverse(), newestFirst };
}

export function publicStatusHistoryStateCounts(history: PublicStatusHistory[]) {
  return history.reduce(
    (counts, entry) => {
      counts[entry.state] += 1;
      return counts;
    },
    { healthy: 0, incident: 0, unknown: 0 }
  );
}

export function publicStatusHistoryTimeline(
  history: PublicStatusHistory[] | null,
  pointCount: number,
  windowEndTimestamp?: number
) {
  if (history === null) return null;
  const normalizedPointCount = Number.isFinite(pointCount) ? Math.max(0, Math.floor(pointCount)) : 0;
  if (!normalizedPointCount) return [];

  const newestFirst = recentPublicStatusHistory(history, history.length).newestFirst ?? [];
  const newestEntry = newestFirst.at(0);
  if (!newestEntry) return [];
  const requestedWindowEnd =
    windowEndTimestamp !== undefined && Number.isFinite(windowEndTimestamp)
      ? windowEndTimestamp
      : newestEntry.timestamp;
  const windowEnd = Math.max(newestEntry.timestamp, requestedWindowEnd);
  const timeline = Array<PublicStatusHistory | undefined>(normalizedPointCount).fill(undefined);
  for (const entry of newestFirst) {
    const dayOffset = Math.round((windowEnd - entry.timestamp) / millisecondsPerDay);
    const timelineIndex = normalizedPointCount - dayOffset - 1;
    if (timelineIndex >= 0 && timelineIndex < normalizedPointCount && timeline[timelineIndex] === undefined) {
      timeline[timelineIndex] = entry;
    }
  }

  return timeline.map(
    (entry, index): PublicStatusHistory =>
      entry ?? {
        componentId: newestEntry.componentId,
        state: 'unknown',
        timestamp: windowEnd - (normalizedPointCount - index - 1) * millisecondsPerDay
      }
  );
}

export function publicStatusHistoryBounds(components: PublicStatusComponent[]) {
  return historyBounds(components.map(component => component.history));
}

export function publicStatusHistoryTimelineBounds(components: PublicStatusComponent[], pointCount: number) {
  const bounds = publicStatusHistoryBounds(components);
  const normalizedPointCount = Number.isFinite(pointCount) ? Math.max(0, Math.floor(pointCount)) : 0;
  if (!bounds || !normalizedPointCount) return undefined;
  return {
    earliest: bounds.latest - (normalizedPointCount - 1) * millisecondsPerDay,
    latest: bounds.latest
  };
}

function historyBounds(histories: Array<PublicStatusHistory[] | null>) {
  let earliest: number | undefined;
  let latest: number | undefined;
  for (const history of histories) {
    for (const entry of history ?? []) {
      earliest = earliest === undefined ? entry.timestamp : Math.min(earliest, entry.timestamp);
      latest = latest === undefined ? entry.timestamp : Math.max(latest, entry.timestamp);
    }
  }
  return earliest === undefined || latest === undefined ? undefined : { earliest, latest };
}
