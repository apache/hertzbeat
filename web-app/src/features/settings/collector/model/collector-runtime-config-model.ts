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

export const managedRuntimeResourceDetectors = [
  'ENV',
  'SYSTEM',
  'DOCKER',
  'EC2',
  'ECS',
  'EKS',
  'GCP',
  'AZURE',
  'AKS'
] as const;
export const managedRuntimeFilterPresets = ['HEALTH_CHECK_TRACES'] as const;
export const managedRuntimeHostScrapers = [
  'CPU',
  'DISK',
  'FILESYSTEM',
  'LOAD',
  'MEMORY',
  'NETWORK',
  'PAGING',
  'PROCESSES'
] as const;
export const managedRuntimeSafeNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
export const managedRuntimeHostMetricsIntervalLimits = { minimum: 10, maximum: 300 } as const;

type ManagedRuntimeResourceDetector = (typeof managedRuntimeResourceDetectors)[number];
type ManagedRuntimeFilterPreset = (typeof managedRuntimeFilterPresets)[number];
type ManagedRuntimeHostScraper = (typeof managedRuntimeHostScrapers)[number];

export type ManagedRuntimeCoreDraft = {
  environment: string;
  hostMetricsEnabled: boolean;
  hostMetricsIntervalSeconds: number;
  hostMetricsScrapers: readonly ManagedRuntimeHostScraper[];
  resourceDetectors: readonly ManagedRuntimeResourceDetector[];
  telemetryFilterPresets: readonly ManagedRuntimeFilterPreset[];
};

export type ManagedRuntimeConfigView = ManagedRuntimeCoreDraft & {
  schemaVersion: 1 | 2 | 3;
  revision: number;
  prometheusTargetCount: number;
  fileLogSourceCount: number;
};

export function managedRuntimeCoreDraft(config: ManagedRuntimeConfigView): ManagedRuntimeCoreDraft {
  return {
    environment: config.environment,
    hostMetricsEnabled: config.hostMetricsEnabled,
    hostMetricsIntervalSeconds: config.hostMetricsIntervalSeconds,
    hostMetricsScrapers: [...config.hostMetricsScrapers],
    resourceDetectors: [...config.resourceDetectors],
    telemetryFilterPresets: [...config.telemetryFilterPresets]
  };
}
