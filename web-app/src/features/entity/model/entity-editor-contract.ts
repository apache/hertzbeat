/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const entityTypes = [
  'service',
  'host',
  'system',
  'database',
  'queue',
  'middleware',
  'device',
  'api',
  'endpoint',
  'k8s_workload'
] as const;
export const entityStatuses = ['unknown', 'healthy', 'degraded', 'critical', 'paused'] as const;
export const entityCriticalities = ['low', 'medium', 'high', 'critical'] as const;

export type EditableEntityInfo = {
  id?: number;
  type: string;
  name: string;
  displayName?: string | null;
  subtype?: string | null;
  namespace?: string | null;
  environment?: string | null;
  status?: string | null;
  criticality?: string | null;
  owner?: string | null;
  additionalOwners?: unknown[] | null;
  runbook?: string | null;
  lifecycle?: string | null;
  tier?: string | null;
  system?: string | null;
  componentOf?: string[] | null;
  components?: string[] | null;
  implementedBy?: string[] | null;
  apiInterface?: unknown;
  inheritFrom?: string | null;
  languages?: string[] | null;
  links?: unknown[] | null;
  contacts?: unknown[] | null;
  integrations?: unknown;
  extensions?: unknown;
  hertzbeat?: unknown;
  source?: string | null;
  description?: string | null;
  labels?: Record<string, string> | null;
  tags?: string[] | null;
  workspaceId?: string | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
  [key: string]: unknown;
};

export type EditableEntityDto = {
  entity: EditableEntityInfo;
  identities: Record<string, unknown>[] | null;
  monitorBinds: Record<string, unknown>[] | null;
  relations: Record<string, unknown>[] | null;
};

export type EntityCatalogSuggestions = {
  owners: string[];
  namespaces: string[];
  environments: string[];
  systems: string[];
  lifecycles: string[];
  tiers: string[];
  inheritFromRefs: string[];
  entityRefs: string[];
  languages: string[];
  linkProviders: string[];
};

export type EntityEditorDraft = {
  type: string;
  name: string;
  displayName: string;
  namespace: string;
  environment: string;
  owner: string;
  system: string;
  lifecycle: string;
  tier: string;
  criticality: string;
  runbook: string;
  description: string;
  labels: string;
  tags: string;
};

export type EntityEditorField = keyof EntityEditorDraft;
export type EntityEditorErrors = Partial<Record<EntityEditorField, 'required' | 'unsupported' | 'invalid'>>;
