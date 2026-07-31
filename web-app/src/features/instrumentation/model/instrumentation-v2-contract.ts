/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const SOURCE_KINDS = ['quick_start', 'application', 'existing_opentelemetry'] as const;
export const SIGNALS = ['metrics', 'logs', 'traces'] as const;
export const BLOCK_TYPES = ['command', 'code', 'environment', 'download', 'note', 'warning', 'link', 'check'] as const;
export const DETECTION_STATUSES = ['waiting', 'received', 'unsupported', 'unavailable', 'error'] as const;
export const DETECTION_ERROR_CODES = [
  'signal_not_received',
  'signal_not_supported',
  'storage_unavailable',
  'storage_query_failed',
  'collector_unavailable',
  'authentication_failed',
  'invalid_context'
] as const;
export const POLLING_DECISIONS = ['continue_polling', 'complete', 'manual_retry'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];
export type Signal = (typeof SIGNALS)[number];
type BlockType = (typeof BLOCK_TYPES)[number];
type DetectionStatus = (typeof DETECTION_STATUSES)[number];
type DetectionErrorCode = (typeof DETECTION_ERROR_CODES)[number];
type PollingDecision = (typeof POLLING_DECISIONS)[number];
type SignalValues<T> = { metrics: T; logs: T; traces: T };

export type ServiceIdentity = {
  name: string;
  namespace: string;
  environment: string;
  serviceInstanceId?: string | undefined;
  endpoint?: string | undefined;
};

export function canonicalServiceIdentity(service: ServiceIdentity): ServiceIdentity {
  const serviceInstanceId = service.serviceInstanceId?.trim();
  const endpoint = service.endpoint?.trim();
  return {
    name: service.name,
    namespace: service.namespace,
    environment: service.environment,
    ...(serviceInstanceId ? { serviceInstanceId } : {}),
    ...(endpoint ? { endpoint } : {})
  };
}

type OfficialComponent = {
  name: string;
  sourceUrl: string;
  version: string | null;
  versionPolicy: 'pinned' | 'language_specific';
  license: string;
  installationLocationKey: string;
  official: boolean;
  bundledWithHertzBeat: boolean;
  dependencies: Array<{
    name: string;
    sourceUrl: string;
    version: string;
    license: string;
    purposeKey: string;
    official: boolean;
    bundledWithHertzBeat: boolean;
  }>;
  artifacts: Array<{
    name: string;
    downloadUrl: string;
    algorithm: string;
    digest: string;
    provenanceUrl: string;
  }>;
};

export type Recipe = {
  id: string;
  kind: SourceKind;
  labelKey: string;
  preview: boolean;
  language?: string | undefined;
  framework?: string | undefined;
  method?: string | undefined;
  environments: string[];
  platforms: string[];
  signals: SignalValues<'supported' | 'preview' | 'unsupported'>;
  components: OfficialComponent[];
  blocksPreview: BlockType[];
};

export type CatalogResponse = {
  schemaVersion: 2;
  groups: SourceGroup[];
  sources: SourceEntry[];
  recipes: Recipe[];
};

type SourceGroup = { id: string; labelKey: string };
export type SourceEntry = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  iconKey: string;
  groupIds: string[];
  support: 'supported' | 'preview' | 'unsupported';
  sourceKind?: SourceKind | undefined;
  recipeIds: string[];
  signals: SignalValues<'supported' | 'preview' | 'unsupported'>;
  documentationUrl?: string | undefined;
};

type IntakeProfile = {
  id: string;
  kind: 'server' | 'hertzbeat_collector' | 'external_otel_collector';
  availability: 'available' | 'unavailable';
  gateway?: 'server' | 'collector' | 'external' | undefined;
  supportedTransports: Array<'http_protobuf' | 'grpc'>;
  endpoints: {
    http_protobuf?: { url: string; security: 'tls' | 'plaintext' } | undefined;
    grpc?: { url: string; security: 'tls' | 'plaintext' } | undefined;
  };
  authentication?: 'none' | 'bearer_token' | undefined;
  authorizationHeader: 'Authorization' | null;
  collectorId?: string | undefined;
  errorCode?: string | undefined;
};

export type IntakeProfilesResponse = {
  schemaVersion: 2;
  status: 'available' | 'unconfigured' | 'unavailable';
  errorCode?: 'intake_profile_discovery_unavailable' | undefined;
  defaultProfileId?: string | undefined;
  profiles: IntakeProfile[];
};

export type Selection = {
  sourceKind: SourceKind;
  recipeId?: string | undefined;
  language?: string | undefined;
  framework?: string | undefined;
  method?: string | undefined;
  environment?: string | undefined;
  platform?: string | undefined;
};

export type RenderRequest = Selection & {
  schemaVersion: 2;
  intakeProfileId: string;
  service: ServiceIdentity;
};
export type DetectionRequest = RenderRequest & { startedAt: number };

export type GuideBlock = {
  id: string;
  type: BlockType;
  titleKey: string;
  bodyKey?: string | undefined;
  executionLocationKey: string;
  language?: string | undefined;
  content?: string | undefined;
  href?: string | undefined;
  placeholders: Array<'authorizationToken'>;
};

export type RenderResponse = {
  schemaVersion: 2;
  sourceKind: SourceKind;
  recipeId: string;
  intakeProfile: IntakeProfile;
  service: ServiceIdentity;
  signals: SignalValues<'supported' | 'preview' | 'unsupported'>;
  components: OfficialComponent[];
  secretPlaceholders: {
    authorizationToken?: { marker: '${HERTZBEAT_TOKEN}'; kind: 'authorization_token' } | undefined;
  };
  blocks: GuideBlock[];
};

export type QueryJumpContext = {
  serviceName: string;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  intakeProfileId: string;
  collectorId?: string | undefined;
  serviceInstanceId?: string | undefined;
  endpoint?: string | undefined;
  startedAt: number;
  detectedAt: number;
};

export type DetectionResponse = {
  schemaVersion: 2;
  detectedAt: number;
  context: Selection & {
    service: ServiceIdentity;
    intakeProfileId: string;
    collectorId?: string | undefined;
    startedAt: number;
    windowEndAt: number;
  };
  signals: SignalValues<{
    status: DetectionStatus;
    lastReceivedAt?: number | undefined;
    errorCode?: DetectionErrorCode | undefined;
  }>;
  polling: { decision: PollingDecision; pollAfterMs?: number | undefined; deadlineAt: number };
  queryJumpContext: QueryJumpContext;
  queryJumps: Array<{ signal: Signal; enabled: boolean; context: QueryJumpContext }>;
};
