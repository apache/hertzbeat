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

import { buildExplorePath } from '@/features/explore';
import {
  applicationRoutePaths,
  buildAlertInvestigationRoutePath,
  buildEntityDetailPath,
  buildMonitorDetailPath
} from '@/shared/navigation/app-paths';
import type { AgentTargetRef } from './agent-workspace-contract';
import type { AgentEvidence } from './agent-evidence';

export function agentTargetSourcePath(target: AgentTargetRef): string | undefined {
  if ('log' in target) {
    const log = target.log;
    if (log.severityNumber !== undefined && !log.severityText) return undefined;
    return buildExplorePath({ ...log, signal: 'logs', timeRange: 'last-15m', timeZone: 'UTC', query: log.search });
  }
  if ('trace' in target) {
    if (!/^[0-9a-f]{32}$/u.test(target.trace.traceId)) return undefined;
    return buildExplorePath({ ...target.trace, signal: 'traces', timeRange: 'last-15m', timeZone: 'UTC' });
  }
  if ('topology' in target) {
    const { rootEntityId, ...scope } = target.topology;
    const params = new URLSearchParams({ focusEntityId: String(rootEntityId) });
    for (const [key, value] of Object.entries(scope)) if (value !== undefined) params.set(key, String(value));
    if (scope.start !== undefined) params.set('timeZone', 'UTC');
    return `${applicationRoutePaths.topology}?${params.toString()}`;
  }
  if ('alertId' in target) return buildAlertInvestigationRoutePath(target.alertId);
  if ('monitorId' in target) return buildMonitorDetailPath(target.monitorId);
  if ('entityId' in target) return buildEntityDetailPath(target.entityId);
  return undefined;
}

export function agentEvidenceSourcePath(evidence: AgentEvidence): string | undefined {
  const id = evidence.resourceId;
  if (!id) return undefined;
  if (evidence.resourceType === 'trace') {
    if (!/^[0-9a-f]{32}$/u.test(id) || evidence.start === null || evidence.end === null) return undefined;
    return buildExplorePath({
      signal: 'traces',
      timeRange: 'last-15m',
      traceId: id,
      start: evidence.start,
      end: evidence.end,
      timeZone: 'UTC'
    });
  }
  if (!/^[1-9]\d*$/u.test(id) || !Number.isSafeInteger(Number(id))) return undefined;
  if (evidence.resourceType === 'entity') return buildEntityDetailPath(Number(id));
  if (evidence.resourceType === 'monitor') return buildMonitorDetailPath(Number(id));
  if (evidence.resourceType === 'alert') return buildAlertInvestigationRoutePath(Number(id));
  return undefined;
}
