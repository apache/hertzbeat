/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { PagedCollection } from '@/shared/pagination';

export const entityPageSizes = [10, 20, 50] as const;
export const entitySortFields = ['gmtUpdate', 'name', 'type', 'status'] as const;
export const entitySortOrders = ['asc', 'desc'] as const;
type EntitySortField = (typeof entitySortFields)[number];
type EntitySortOrder = (typeof entitySortOrders)[number];

export type EntityQuery = {
  search: string;
  type: string;
  status: string;
  owner: string;
  source: string;
  environment: string;
  lifecycle: string;
  tier: string;
  system: string;
  sort: EntitySortField;
  order: EntitySortOrder;
  pageIndex: number;
  pageSize: (typeof entityPageSizes)[number];
};

export type EntityRecord = {
  id: number;
  type: string;
  name: string;
  displayName?: string;
  environment?: string;
  status?: string;
  owner?: string;
  source?: string;
  lifecycle?: string;
  tier?: string;
  system?: string;
  description?: string;
  labels?: Record<string, string>;
  tags?: string[];
  gmtCreate?: string;
  gmtUpdate?: string;
};

export type EntitySummary = EntityRecord & {
  identityCount: number;
  monitorCount: number;
  relationCount: number;
  activeAlertCount: number;
  statusEvidence?: EntityStatus;
  lastEvidenceAt?: number;
};

export type EntityStatus = {
  status?: string;
  reason?: string;
  monitorTotal?: number;
  monitorUpCount?: number;
  monitorDownCount?: number;
  monitorPausedCount?: number;
  activeAlertCount?: number;
  evaluatedAt?: string;
};

export type EntityIdentity = {
  id?: number;
  identityType: string;
  identityKey: string;
  identityValue: string;
  primaryIdentity?: boolean;
};

export type EntityMonitor = { id: number; name: string; app: string; instance?: string; status?: number };
export type EntityMonitorQuery = {
  status?: number;
  app?: string;
  pageIndex: number;
  pageSize: 50;
};
type EntityMonitorPreview = {
  items: EntityMonitor[];
  total: number;
  complete: boolean;
};
export type EntityRelation = {
  relationId?: number;
  entityId?: number;
  entityName?: string;
  entityType?: string;
  direction?: string;
  relationType?: string;
  relationSource?: string;
  status?: string;
  targetRef?: string;
};

export type EntityEvidenceSummary = {
  activeAlertCount?: number;
  downMonitorCount?: number;
  healthyMonitorCount?: number;
  identityCount?: number;
  logHintCount?: number;
  lastEvidenceAt?: number;
};

export type EntityNoiseControlRule = {
  id: number;
  name: string;
  type: 'silence' | 'inhibit';
  global: boolean;
  matchedLabels: string[];
  updatedAt?: number;
};

export type EntityNoiseControlSummary = {
  activeSilenceCount: number;
  matchingInhibitCount: number;
  activeSilences: EntityNoiseControlRule[];
  matchingInhibits: EntityNoiseControlRule[];
  possibleAlertSuppression: boolean;
};

export const entityNextActionTypes = [
  'review_alerts',
  'complete_owner',
  'complete_runbook',
  'bind_monitor',
  'open_discovery',
  'inspect_logs',
  'review_relations'
] as const;
export type EntityNextActionType = (typeof entityNextActionTypes)[number];

type EntityOpsSummary = {
  ownerReady: boolean;
  runbookReady: boolean;
  relationReady: boolean;
  telemetryReady: boolean;
  statusReady: boolean;
  readinessScore: number;
  relationCount: number;
};

export type EntityNextAction = {
  actionType: EntityNextActionType;
  title: string;
  summary: string;
  actionLabel: string;
  priority: number;
};

export type EntityTriageRecommendation = {
  mode?: string;
  recommendedFocus?: string;
  headline?: string;
  summary?: string;
  whyNow?: string;
  actionLabel?: string;
  generatedAt?: number;
};

/** Safe query context for a known HertzBeat route, never an arbitrary URL. */
export type EntityResponseHandoff = {
  search?: string;
  status?: string;
  severity?: string;
  app?: string;
  content?: string;
  entityId?: number;
  entityType?: string;
  entityName?: string;
  traceId?: string;
  spanId?: string;
  serviceName?: string;
  serviceNamespace?: string;
  severityText?: string;
  query?: string;
  owner?: string;
  system?: string;
  environment?: string;
  start?: number;
  end?: number;
  source?: string;
  focus?: string;
};

export type EntityResponseHandoffs = Partial<
  Record<'alerts' | 'monitors' | 'logs' | 'traces' | 'discovery' | 'editor', EntityResponseHandoff>
>;

export type EntityDetail = {
  entity: EntityRecord;
  identities: EntityIdentity[];
  status?: EntityStatus;
  evidence?: EntityEvidenceSummary;
  noiseControls?: EntityNoiseControlSummary;
  monitorPreview: EntityMonitorPreview;
  monitorSummary?: Record<string, unknown>;
  logSummary?: Record<string, unknown>;
  traceSummary?: Record<string, unknown>;
  metricEvidence?: Record<string, unknown>[];
  logEvidence?: Record<string, unknown>[];
  traceEvidence?: Record<string, unknown>[];
  unifiedEvidenceSummary?: Record<string, unknown>;
  triageRecommendation?: EntityTriageRecommendation;
  opsSummary?: EntityOpsSummary;
  nextActions?: EntityNextAction[];
  responseHandoffs?: EntityResponseHandoffs;
  relations: EntityRelation[];
};

export type EntityPage = PagedCollection<EntitySummary>;
export type EntityMonitorPage = PagedCollection<EntityMonitor>;

export class EntityContractError extends Error {
  constructor(message = 'Entity response is invalid') {
    super(message);
    this.name = 'EntityContractError';
  }
}
