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

export type EntityDetail = {
  entity: EntityRecord;
  identities: EntityIdentity[];
  status?: EntityStatus;
  evidence?: EntityEvidenceSummary;
  boundMonitors: EntityMonitor[];
  relations: EntityRelation[];
};

export type EntityPage = PagedCollection<EntitySummary>;

export class EntityContractError extends Error {
  constructor(message = 'Entity response is invalid') {
    super(message);
    this.name = 'EntityContractError';
  }
}
