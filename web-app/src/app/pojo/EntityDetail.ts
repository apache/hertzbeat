/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Entity } from './Entity';
import { EntityIdentity } from './EntityIdentity';
import { EntityMonitorBind } from './EntityMonitorBind';
import { EntityRelation } from './EntityRelation';
import { EntityStatus } from './EntityStatus';
import { Monitor } from './Monitor';
import { Page } from './Page';
import { SingleAlert } from './SingleAlert';

export class EntityDto {
  entity!: Entity;
  identities?: EntityIdentity[];
  monitorBinds?: EntityMonitorBind[];
  relations?: EntityRelation[];
}

export class CodeNavigationHint {
  repositoryUrl!: string;
  provider?: string | null;
  defaultPath?: string | null;
  searchQuery?: string | null;
  label?: string | null;
}

export class MetricCorrelationHint {
  entityId?: number | null;
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  start?: number | string | null;
  end?: number | string | null;
  searchQuery?: string | null;
  traceQuery?: string | null;
  logQuery?: string | null;
}

export class EntityLogQueryHint {
  title!: string;
  resourceFilters?: Record<string, string>;
  searchTerms?: string[];
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  start?: number | string | null;
  end?: number | string | null;
}

export class EntityDefinitionActivity {
  id!: number;
  entityId?: number;
  activityType!: string;
  format?: string | null;
  status!: 'success' | 'warning' | 'error' | 'info';
  summary!: string;
  detail?: string;
  creator?: string;
  gmtCreate?: number | string;
}

export class EntityEvidenceSummary {
  activeAlertCount: number = 0;
  downMonitorCount: number = 0;
  healthyMonitorCount: number = 0;
  identityCount: number = 0;
  logHintCount: number = 0;
  lastEvidenceAt?: number | string | null;
}

export class EntityAlertSummary {
  totalActiveAlerts: number = 0;
  recentAlerts: SingleAlert[] = [];
  severityDistribution?: Record<string, number>;
  latestStatusChangeAt?: number | string | null;
}

export class EntityMonitorSummary {
  totalBoundMonitors: number = 0;
  appDistribution?: Record<string, number>;
  statusDistribution?: Record<string, number>;
  abnormalMonitors: Monitor[] = [];
  latestStatusChangeAt?: number | string | null;
}

export class EntityLogSummary {
  hintCount: number = 0;
  preferredQueryType?: string | null;
  preferredQueryTitle?: string | null;
  preferredResourceFilters?: Record<string, string>;
  preferredSearchTerms?: string[];
  fallbackSearchTerm?: string | null;
}

export class EntityTraceSummary {
  recentTraceCount: number = 0;
  recentErrorTraceCount: number = 0;
  latestObservedAt?: number | string | null;
  active: boolean = false;
  latestTraceId?: string | null;
}

export class EntityUnifiedEvidenceSummary {
  activeSignalCount: number = 0;
  metricsActive: boolean = false;
  logsActive: boolean = false;
  tracesActive: boolean = false;
  metricEvidenceCount: number = 0;
  logEvidenceCount: number = 0;
  traceEvidenceCount: number = 0;
  latestObservedAt?: number | string | null;
  activeSignals?: string[];
}

export class EntityTriageRecommendation {
  mode?: string | null;
  recommendedFocus!: 'metrics' | 'logs' | 'traces' | 'evidence';
  headline!: string;
  summary!: string;
  whyNow!: string;
  actionLabel!: string;
  generatedAt?: number | string | null;
}

export class MetricEvidence {
  source!: 'monitor' | 'otlp';
  signal!: 'metrics';
  entityId?: number | null;
  identitySnapshot?: Record<string, any> | null;
  observedAt?: number | string | null;
  severityOrHealth?: string | null;
  queryHint?: string | null;
  metricName!: string;
  displayName?: string | null;
  metricType?: string | null;
  unit?: string | null;
  value?: number | null;
  attributes?: Record<string, string> | null;
  monitorContext?: Record<string, any> | null;
  otelContext?: Record<string, any> | null;
  correlationHint?: MetricCorrelationHint | null;
  codeNavigationHint?: CodeNavigationHint | null;
}

export class LogEvidence {
  source!: 'otlp';
  signal!: 'logs';
  entityId?: number | null;
  identitySnapshot?: Record<string, any> | null;
  observedAt?: number | string | null;
  severityOrHealth?: string | null;
  queryHint?: string | null;
  body?: string | null;
  severityText?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  resource?: Record<string, string> | null;
  preferredSearchTerms?: string[] | null;
  codeNavigationHint?: CodeNavigationHint | null;
}

export class TraceEvidence {
  source!: 'otlp';
  signal!: 'traces';
  entityId?: number | null;
  identitySnapshot?: Record<string, any> | null;
  observedAt?: number | string | null;
  severityOrHealth?: string | null;
  queryHint?: string | null;
  traceId?: string | null;
  rootSpanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  errorState?: boolean | null;
  spanCount?: number | null;
  duration?: number | null;
  resource?: Record<string, string> | null;
  codeNavigationHint?: CodeNavigationHint | null;
}

export class EntityTraceQueryHint {
  title!: string;
  resourceFilters?: Record<string, string>;
  searchTerms?: string[];
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  start?: number | string | null;
  end?: number | string | null;
}

export class EntityOpsSummary {
  ownerReady: boolean = false;
  runbookReady: boolean = false;
  relationReady: boolean = false;
  telemetryReady: boolean = false;
  statusReady: boolean = false;
  readinessScore: number = 0;
}

export class EntityNextAction {
  actionType!: string;
  title!: string;
  summary!: string;
  actionLabel!: string;
  priority: number = 0;
}

export class EntityStatusPageSummary {
  linked: boolean = false;
  componentCount: number = 0;
  latestIncidentAt?: number | string | null;
  suggestExpose: boolean = false;
}

export class EntityNoiseControlRule {
  id?: number;
  name!: string;
  type!: 'silence' | 'inhibit';
  global: boolean = false;
  matchedLabels: string[] = [];
  updatedAt?: number | string | null;
}

export class EntityNoiseControlSummary {
  activeSilenceCount: number = 0;
  matchingInhibitCount: number = 0;
  activeSilences: EntityNoiseControlRule[] = [];
  matchingInhibits: EntityNoiseControlRule[] = [];
  possibleAlertSuppression: boolean = false;
}

export class EntityResponseHandoff {
  search?: string | null;
  status?: string | null;
  severity?: string | null;
  app?: string | null;
  content?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  severityText?: string | null;
  query?: string | null;
  owner?: string | null;
  system?: string | null;
  environment?: string | null;
  source?: string | null;
  focus?: string | null;
  start?: number | string | null;
  end?: number | string | null;
  returnTo?: string | null;
  returnLabel?: string | null;
  codeNavigationHint?: CodeNavigationHint | null;
}

export class EntityResponseHandoffs {
  alerts: EntityResponseHandoff = new EntityResponseHandoff();
  monitors: EntityResponseHandoff = new EntityResponseHandoff();
  logs: EntityResponseHandoff = new EntityResponseHandoff();
  traces: EntityResponseHandoff = new EntityResponseHandoff();
  discovery: EntityResponseHandoff = new EntityResponseHandoff();
  editor: EntityResponseHandoff = new EntityResponseHandoff();
}

export class EntityTriageSummary {
  mode!: 'ai' | 'rule';
  headline!: string;
  summary!: string;
  whyNow!: string;
  recommendedFocus!: 'alerts' | 'monitors' | 'logs' | 'evidence';
  recommendedActionLabel!: string;
  generatedAt?: number | string | null;
}

export class EntityDetail {
  entity!: EntityDto;
  status!: EntityStatus;
  evidenceSummary!: EntityEvidenceSummary;
  alertSummary!: EntityAlertSummary;
  monitorSummary!: EntityMonitorSummary;
  logSummary!: EntityLogSummary;
  traceSummary!: EntityTraceSummary;
  metricEvidence?: MetricEvidence[];
  logEvidence?: LogEvidence[];
  traceEvidence?: TraceEvidence[];
  unifiedEvidenceSummary?: EntityUnifiedEvidenceSummary;
  triageRecommendation?: EntityTriageRecommendation;
  opsSummary!: EntityOpsSummary;
  nextActions!: EntityNextAction[];
  statusPageSummary!: EntityStatusPageSummary;
  responseHandoffs!: EntityResponseHandoffs;
  noiseControlSummary!: EntityNoiseControlSummary;
  boundMonitors!: Monitor[];
  activeAlerts!: SingleAlert[];
  logQueryHints!: EntityLogQueryHint[];
  traceQueryHints!: EntityTraceQueryHint[];
  definitionActivities!: EntityDefinitionActivity[];
}

export type EntityAlertPage = Page<SingleAlert>;
export type EntityMonitorPage = Page<Monitor>;
