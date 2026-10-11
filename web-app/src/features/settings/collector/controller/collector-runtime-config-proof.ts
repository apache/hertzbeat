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

import type { ManagedOtelRuntimeConfig } from '../api/collector-runtime-config-schema';

export function sameManagedRuntimeConfig(left: ManagedOtelRuntimeConfig, right: ManagedOtelRuntimeConfig) {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.revision === right.revision &&
    left.hostMetricsEnabled === right.hostMetricsEnabled &&
    left.hostMetricsInterval === right.hostMetricsInterval &&
    left.environment === right.environment &&
    sameSet(left.resourceDetectors, right.resourceDetectors) &&
    sameSet(left.telemetryFilterPresets, right.telemetryFilterPresets) &&
    sameSet(left.hostMetricsScrapers, right.hostMetricsScrapers) &&
    samePrometheusTargets(left.prometheusTargets, right.prometheusTargets) &&
    sameFileLogSources(left.fileLogSources, right.fileLogSources)
  );
}

function sameSet(left: readonly string[], right: readonly string[]) {
  const expected = new Set(right);
  return left.length === expected.size && left.every(value => expected.has(value));
}

function samePrometheusTargets(
  left: ManagedOtelRuntimeConfig['prometheusTargets'],
  right: ManagedOtelRuntimeConfig['prometheusTargets']
) {
  return (
    left.length === right.length &&
    left.every((target, index) => {
      const candidate = right[index];
      return (
        candidate !== undefined &&
        target.name === candidate.name &&
        target.endpoint === candidate.endpoint &&
        target.interval === candidate.interval &&
        target.timeout === candidate.timeout &&
        target.tlsCaProfile === candidate.tlsCaProfile &&
        sameStringMap(target.headerSecretRefs, candidate.headerSecretRefs)
      );
    })
  );
}

function sameFileLogSources(
  left: ManagedOtelRuntimeConfig['fileLogSources'],
  right: ManagedOtelRuntimeConfig['fileLogSources']
) {
  return (
    left.length === right.length &&
    left.every((source, index) => {
      const candidate = right[index];
      return candidate !== undefined && source.name === candidate.name && source.pathProfile === candidate.pathProfile;
    })
  );
}

function sameStringMap(left: Readonly<Record<string, string>>, right: Readonly<Record<string, string>>) {
  const normalizedRight = new Map(Object.entries(right).map(([key, value]) => [key.toLowerCase(), value]));
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === normalizedRight.size &&
    leftEntries.every(([key, value]) => normalizedRight.get(key.toLowerCase()) === value)
  );
}
