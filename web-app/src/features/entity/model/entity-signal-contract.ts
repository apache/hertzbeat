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

type EntityRedValues = {
  requestCount: number;
  errorCount: number;
  requestRatePerSecond: number;
  errorRate: number;
  latencyAverageMs: number | null;
  latencyP95Ms: number | null;
};

export type EntityRedPoint = EntityRedValues & { timestamp: number };

type EntityRedBase = {
  source: 'greptime_flow';
  resolutionSeconds: 60;
  window: { start: number; end: number };
  identity: {
    workspaceId: string;
    entityId: string;
    entityType: string;
    serviceName: string;
    serviceNamespace: string | null;
    deploymentEnvironment: string | null;
  };
};

export type EntityRedReadySignal = EntityRedBase & {
  state: 'ready';
  summary: EntityRedValues;
  series: EntityRedPoint[];
};

export type EntityRedSignal =
  EntityRedReadySignal | (EntityRedBase & { state: 'empty' | 'unavailable'; summary: null; series: [] });

export type EntityRedViewState = EntityRedReadySignal | { state: 'empty' | 'unavailable' };
