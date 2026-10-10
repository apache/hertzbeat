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

import { createInvestigationLogResult, createInvestigationMetricResults } from '@/features/explore';

import type {
  AlertInvestigationIdentity,
  AlertInvestigationPersesResults,
  AlertInvestigationSnapshot
} from './alert-investigation-contract';

export function createAlertInvestigationPersesResults(
  snapshot: AlertInvestigationSnapshot
): AlertInvestigationPersesResults {
  const window = { from: snapshot.window.start, to: snapshot.window.end };
  const context = queryContext(snapshot.identity.identity);
  return {
    metrics: createInvestigationMetricResults(
      snapshot.metrics.series.map(series => ({
        metricName: series.name,
        unit: null,
        labels: series.labels,
        points: series.points
      })),
      snapshot.metrics.state,
      snapshot.metrics.truncated,
      window,
      context
    ),
    ...(snapshot.logs.state === 'ready'
      ? { logs: createInvestigationLogResult(snapshot.logs.records, snapshot.logs.truncated, window, context) }
      : {})
  };
}

function queryContext(identity: AlertInvestigationIdentity | null) {
  if (!identity) return {};
  return {
    ...(identity.entityId ? { entityId: String(identity.entityId) } : {}),
    ...(identity.monitorId ? { monitorId: String(identity.monitorId) } : {}),
    ...(identity.serviceName ? { serviceName: identity.serviceName } : {}),
    ...(identity.serviceNamespace ? { serviceNamespace: identity.serviceNamespace } : {}),
    ...(identity.deploymentEnvironment ? { environment: identity.deploymentEnvironment } : {})
  };
}
