import { fromKeyValueDraft, normalizeTags, parseCommaSeparated, type KeyValueDraft } from './draft-utils';
import { buildInitialEntityDraft } from './initial-state';
import type { EntityCatalogSuggestions, EntityContactRef, EntityDto, EntityLinkRef, EntityOwnerRef, Monitor } from '@/lib/types';

export type EntityEditorPayloadInput = {
  draft: EntityDto;
  labelRows: KeyValueDraft[];
  tagsText: string;
  links: EntityLinkRef[];
  contacts: EntityContactRef[];
  owners: EntityOwnerRef[];
  componentOfText: string;
  componentsText: string;
  implementedByText: string;
  languagesText: string;
  identitiesItems: string[];
  monitorBindItems: string[];
  relationItems: string[];
};

type InvalidJsonMessageBuilder = (label: string, index: number) => string;
type EntityCreate = (payload: EntityDto) => Promise<number>;
type EntityUpdate = (payload: EntityDto) => Promise<void>;
type ApiGetter = <T>(url: string) => Promise<T>;
type EntityCatalogSuggestionsReader = (limit?: number) => Promise<EntityCatalogSuggestions>;
type EntityEditorEntityReader = (entityId: string) => Promise<EntityDto>;
type MonitorSeedReader = (monitorId: string) => Promise<Monitor | { monitor?: Monitor }>;

export type EntityEditorNewDraftSeed = {
  source?: string | null;
  monitorId?: string | null;
  identityKey?: string | null;
  identityValue?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
};

const hostLikeApps = new Set([
  'linux',
  'windows',
  'macos',
  'darwin',
  'centos',
  'debian',
  'ubuntu',
  'almalinux',
  'redhat',
  'rockylinux',
  'opensuse',
  'euleros',
  'coreos',
  'freebsd'
]);

const serviceLikeApps = new Set([
  'springboot2',
  'springboot3',
  'jvm',
  'jetty',
  'tomcat',
  'nginx',
  'hertzbeat',
  'fullsite',
  'website',
  'prometheus',
  'registry'
]);

const apiLikeApps = new Set(['api', 'api_code']);
const queueLikeApps = new Set(['kafka', 'rabbitmq', 'rocketmq', 'emq', 'activemq']);
const endpointLikeApps = new Set(['dns', 'website', 'fullsite', 'port', 'udp_port', 'ping', 'ssl_cert', 'websocket']);
const databaseLikeApps = new Set([
  'mysql',
  'postgresql',
  'postgres',
  'oracle',
  'sqlserver',
  'mongodb',
  'opengauss',
  'tidb',
  'db2',
  'dm',
  'clickhouse',
  'elasticsearch'
]);

const middlewareLikeApps = new Set([
  'redis',
  'kafka',
  'rabbitmq',
  'rocketmq',
  'zookeeper',
  'consul',
  'nacos',
  'etcd',
  'memcached',
  'emq',
  'activemq'
]);

const deviceLikeApps = new Set(['snmp', 'modbus']);
const telemetryIdentityKeys = new Set([
  'service.name',
  'service.namespace',
  'service.version',
  'service.instance.id',
  'deployment.environment.name',
  'host.name',
  'host.id',
  'k8s.namespace.name',
  'k8s.deployment.name',
  'k8s.pod.name',
  'container.name',
  'cloud.provider',
  'cloud.region',
  'cloud.resource_id',
  'messaging.destination.name',
  'k8s.workload.name',
  'endpoint.url'
]);

function hasAnyValue(item: object) {
  return Object.values(item as Record<string, unknown>).some(Boolean);
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && error.message.includes('404');
}

function trimText(value?: string | number | null) {
  if (value == null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function appKey(value?: string | null) {
  return trimText(value)?.toLowerCase() || '';
}

function putTelemetryIdentityCandidate(target: Map<string, string>, key: string, value?: string) {
  const normalized = trimText(value);
  if (!key || normalized == null || target.has(key)) {
    return;
  }
  target.set(key, normalized);
}

function resolveTelemetryEndpointIdentity(instance?: string, name?: string) {
  const normalizedInstance = trimText(instance);
  if (normalizedInstance != null && !normalizedInstance.toLowerCase().startsWith('null:')) {
    return normalizedInstance;
  }
  return trimText(name) || normalizedInstance;
}

function getEntityIdentityPriority(identityKey?: string) {
  switch (identityKey) {
    case 'service.instance.id':
    case 'host.id':
      return 140;
    case 'cloud.resource_id':
      return 130;
    case 'endpoint.url':
    case 'messaging.destination.name':
      return 120;
    case 'service.name':
    case 'host.name':
    case 'k8s.deployment.name':
    case 'k8s.workload.name':
      return 90;
    case 'k8s.pod.name':
    case 'monitor.instance':
      return 80;
    case 'container.name':
      return 70;
    case 'monitor.name':
      return 50;
    case 'service.namespace':
    case 'k8s.namespace.name':
      return 30;
    case 'deployment.environment.name':
    case 'monitor.app':
      return 20;
    case 'service.version':
      return 15;
    case 'cloud.provider':
    case 'cloud.region':
      return 10;
    default:
      return 40;
  }
}

function getPrimaryIdentityKeyForEntityType(entityType?: string) {
  switch (entityType) {
    case 'host':
    case 'device':
      return 'host.name';
    case 'queue':
      return 'messaging.destination.name';
    case 'endpoint':
      return 'endpoint.url';
    case 'k8s_workload':
      return 'k8s.workload.name';
    default:
      return 'service.name';
  }
}

function extractTelemetryIdentityMatches(monitor: Monitor) {
  const identities = new Map<string, string>();
  Object.entries(monitor.labels || {}).forEach(([key, value]) => {
    if (telemetryIdentityKeys.has(key)) {
      putTelemetryIdentityCandidate(identities, key, value);
    }
  });
  Object.entries(monitor.annotations || {}).forEach(([key, value]) => {
    if (telemetryIdentityKeys.has(key)) {
      putTelemetryIdentityCandidate(identities, key, value);
    }
  });

  const app = appKey(monitor.app);
  if (hostLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'host.name', monitor.name);
    putTelemetryIdentityCandidate(identities, 'host.id', monitor.instance);
  }
  if (queueLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'messaging.destination.name', monitor.name || monitor.instance);
  }
  if (serviceLikeApps.has(app) || databaseLikeApps.has(app) || (middlewareLikeApps.has(app) && !queueLikeApps.has(app))) {
    putTelemetryIdentityCandidate(identities, 'service.name', monitor.name);
  }
  if (endpointLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'endpoint.url', resolveTelemetryEndpointIdentity(monitor.instance, monitor.name));
  }
  if (identities.has('k8s.namespace.name')) {
    putTelemetryIdentityCandidate(identities, 'k8s.workload.name', monitor.name);
  }

  return Array.from(identities.entries()).map(([key, value]) => ({ key, value }));
}

function inferTelemetryEntityType(monitor: Monitor, identities: Array<{ key: string; value: string }>) {
  const app = appKey(monitor.app);
  if (identities.some(identity => identity.key === 'k8s.workload.name')) {
    return 'k8s_workload';
  }
  if (hostLikeApps.has(app)) {
    return 'host';
  }
  if (deviceLikeApps.has(app)) {
    return 'device';
  }
  if (queueLikeApps.has(app) || identities.some(identity => identity.key === 'messaging.destination.name')) {
    return 'queue';
  }
  if (apiLikeApps.has(app)) {
    return 'api';
  }
  if (endpointLikeApps.has(app) || identities.some(identity => identity.key === 'endpoint.url')) {
    return 'endpoint';
  }
  if (databaseLikeApps.has(app)) {
    return 'database';
  }
  if (middlewareLikeApps.has(app)) {
    return 'middleware';
  }
  return 'service';
}

function findTelemetryIdentityValue(identities: Array<{ key: string; value: string }>, key: string) {
  return identities.find(identity => identity.key === key)?.value;
}

function inferTelemetryEntityName(monitor: Monitor, entityType: string, identities: Array<{ key: string; value: string }>) {
  const primaryIdentityKey = getPrimaryIdentityKeyForEntityType(entityType);
  const primaryValue = identities.find(identity => identity.key === primaryIdentityKey)?.value;
  if (primaryValue != null) {
    return primaryValue;
  }
  return (
    findTelemetryIdentityValue(identities, 'messaging.destination.name') ||
    findTelemetryIdentityValue(identities, 'service.name') ||
    findTelemetryIdentityValue(identities, 'host.name') ||
    findTelemetryIdentityValue(identities, 'endpoint.url') ||
    trimText(monitor.name) ||
    trimText(monitor.instance) ||
    'monitor-unknown'
  );
}

function extractTelemetryRunbook(monitor: Monitor) {
  return (
    trimText(monitor.annotations?.runbook) ||
    trimText(monitor.annotations?.documentation) ||
    trimText(monitor.labels?.runbook) ||
    trimText(monitor.labels?.documentation)
  );
}

function unwrapSeedMonitor(payload: Monitor | { monitor?: Monitor }) {
  if (payload && typeof payload === 'object' && 'monitor' in payload && payload.monitor) {
    return payload.monitor;
  }
  return payload as Monitor;
}

async function loadSeedMonitor(apiGet: ApiGetter, monitorId: string) {
  return unwrapSeedMonitor(await apiGet<Monitor | { monitor?: Monitor }>(buildEntityEditorSeedMonitorUrl(monitorId)));
}

export function buildTelemetrySeededEntityDraft(monitor: Monitor): EntityDto {
  const baseDraft = buildInitialEntityDraft();
  const identities = extractTelemetryIdentityMatches(monitor);
  const entityType = inferTelemetryEntityType(monitor, identities);
  const entityName = inferTelemetryEntityName(monitor, entityType, identities);
  const namespace = findTelemetryIdentityValue(identities, 'service.namespace') || findTelemetryIdentityValue(identities, 'k8s.namespace.name') || '';
  const environment = findTelemetryIdentityValue(identities, 'deployment.environment.name') || '';

  return {
    ...baseDraft,
    entity: {
      ...baseDraft.entity,
      type: entityType,
      name: entityName,
      displayName: trimText(monitor.name) || entityName,
      namespace,
      environment,
      system: trimText(monitor.app) || '',
      source: 'otel_resource',
      runbook: extractTelemetryRunbook(monitor) || ''
    },
    identities: identities.map((identity, index) => ({
      identityType: 'otel_resource',
      identityKey: identity.key,
      identityValue: identity.value,
      priority: getEntityIdentityPriority(identity.key),
      primaryIdentity: index === 0
    })),
    monitorBinds: [
      {
        monitorId: monitor.id,
        bindType: 'suggested',
        source: 'otel_resource',
        status: 'active'
      }
    ],
    relations: []
  };
}

export function buildOtlpCandidateEntityDraft(seed: EntityEditorNewDraftSeed): EntityDto {
  const identityKey = trimText(seed.identityKey);
  const identityValue = trimText(seed.identityValue);

  if (identityKey == null || identityValue == null) {
    return buildInitialEntityDraft();
  }

  const serviceName = trimText(seed.serviceName);
  const serviceNamespace = trimText(seed.serviceNamespace);
  const environment = trimText(seed.environment);
  const entityName = serviceName || identityValue;
  const identities = new Map<string, string>();
  const baseDraft = buildInitialEntityDraft();
  putTelemetryIdentityCandidate(identities, identityKey, identityValue);
  putTelemetryIdentityCandidate(identities, 'service.namespace', serviceNamespace);
  putTelemetryIdentityCandidate(identities, 'deployment.environment.name', environment);

  return {
    ...baseDraft,
    entity: {
      ...baseDraft.entity,
      type: 'service',
      name: entityName,
      displayName: entityName,
      namespace: serviceNamespace || '',
      environment: environment || '',
      source: 'otel_resource',
      labels: {
        'hertzbeat.discovery.source': 'otlp-candidate'
      }
    },
    identities: Array.from(identities.entries()).map(([key, value], index) => ({
      identityType: 'otel_resource',
      identityKey: key,
      identityValue: value,
      priority: getEntityIdentityPriority(key),
      primaryIdentity: index === 0
    })),
    monitorBinds: [],
    relations: []
  };
}

export function buildEmptyEntityCatalogSuggestions(): EntityCatalogSuggestions {
  return {
    owners: [],
    namespaces: [],
    environments: [],
    systems: [],
    lifecycles: [],
    tiers: [],
    inheritFromRefs: [],
    entityRefs: [],
    languages: [],
    linkProviders: []
  };
}

export function buildFallbackEntityDto(entityId: string): EntityDto {
  const parsedId = Number.parseInt(entityId, 10);
  const normalizedId = Number.isFinite(parsedId) ? parsedId : undefined;
  const name = normalizedId != null ? `entity-${normalizedId}` : 'entity-draft';

  return {
    entity: {
      id: normalizedId,
      type: 'service',
      name,
      displayName: normalizedId != null ? `Entity ${normalizedId}` : 'Entity Draft',
      owner: 'platform',
      system: 'catalog',
      environment: 'prod',
      lifecycle: 'production',
      source: 'manual',
      labels: {},
      tags: [],
      additionalOwners: [],
      links: [],
      contacts: [],
      componentOf: [],
      components: [],
      implementedBy: [],
      languages: []
    },
    identities: [],
    monitorBinds: [],
    relations: []
  };
}

export function buildEntityEditorCatalogSuggestionsUrl(limit = 120) {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/entities/catalog-suggestions?${params.toString()}`;
}

export function buildEntityEditorEntityUrl(entityId: string) {
  return `/entities/${entityId}`;
}

export function buildEntityEditorSeedMonitorUrl(monitorId: string) {
  return `/monitor/${monitorId}`;
}

export async function loadEntityEditorCatalogSuggestions(apiGet: ApiGetter) {
  try {
    return await apiGet<EntityCatalogSuggestions>(buildEntityEditorCatalogSuggestionsUrl());
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildEmptyEntityCatalogSuggestions();
    }
    throw error;
  }
}

export async function loadEntityEditorCatalogSuggestionsFromFacade(readCatalogSuggestions: EntityCatalogSuggestionsReader, limit = 120) {
  try {
    return await readCatalogSuggestions(limit);
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildEmptyEntityCatalogSuggestions();
    }
    throw error;
  }
}

export async function loadEntityEditorEntity(apiGet: ApiGetter, entityId: string) {
  try {
    return await apiGet<EntityDto>(buildEntityEditorEntityUrl(entityId));
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildFallbackEntityDto(entityId);
    }
    throw error;
  }
}

export async function loadEntityEditorEntityFromFacade(readEntity: EntityEditorEntityReader, entityId: string) {
  try {
    return await readEntity(entityId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildFallbackEntityDto(entityId);
    }
    throw error;
  }
}

export async function buildEntityEditorNewDraft(apiGet: ApiGetter, seed: EntityEditorNewDraftSeed) {
  const source = trimText(seed.source)?.toLowerCase();
  const monitorId = trimText(seed.monitorId);

  if (source === 'otlp-candidate') {
    return buildOtlpCandidateEntityDraft(seed);
  }

  if (source !== 'telemetry' || monitorId == null) {
    return buildInitialEntityDraft();
  }

  try {
    return buildTelemetrySeededEntityDraft(await loadSeedMonitor(apiGet, monitorId));
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildInitialEntityDraft();
    }
    throw error;
  }
}

export async function buildEntityEditorNewDraftFromFacade(readSeedMonitor: MonitorSeedReader, seed: EntityEditorNewDraftSeed) {
  const source = trimText(seed.source)?.toLowerCase();
  const monitorId = trimText(seed.monitorId);

  if (source === 'otlp-candidate') {
    return buildOtlpCandidateEntityDraft(seed);
  }

  if (source !== 'telemetry' || monitorId == null) {
    return buildInitialEntityDraft();
  }

  try {
    return buildTelemetrySeededEntityDraft(unwrapSeedMonitor(await readSeedMonitor(monitorId)));
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildInitialEntityDraft();
    }
    throw error;
  }
}

export function parseEntityJsonCollection(items: string[], label: string, buildInvalidJsonMessage: InvalidJsonMessageBuilder) {
  return items
    .map((item, index) => {
      if (!item.trim()) return null;
      try {
        return JSON.parse(item);
      } catch {
        throw new Error(buildInvalidJsonMessage(label, index + 1));
      }
    })
    .filter(item => item != null);
}

export function buildEntityPayload(input: EntityEditorPayloadInput, buildInvalidJsonMessage: InvalidJsonMessageBuilder): EntityDto {
  const {
    draft,
    labelRows,
    tagsText,
    links,
    contacts,
    owners,
    componentOfText,
    componentsText,
    implementedByText,
    languagesText,
    identitiesItems,
    monitorBindItems,
    relationItems
  } = input;

  return {
    ...draft,
    entity: {
      ...draft.entity,
      labels: fromKeyValueDraft(labelRows),
      tags: normalizeTags(tagsText),
      links: links.filter(link => hasAnyValue(link)),
      contacts: contacts.filter(contact => hasAnyValue(contact)),
      additionalOwners: owners.filter(owner => hasAnyValue(owner)),
      componentOf: parseCommaSeparated(componentOfText),
      components: parseCommaSeparated(componentsText),
      implementedBy: parseCommaSeparated(implementedByText),
      languages: parseCommaSeparated(languagesText)
    },
    identities: parseEntityJsonCollection(identitiesItems, 'Identities', buildInvalidJsonMessage),
    monitorBinds: parseEntityJsonCollection(monitorBindItems, 'Monitor binds', buildInvalidJsonMessage),
    relations: parseEntityJsonCollection(relationItems, 'Relations', buildInvalidJsonMessage)
  };
}

export async function saveEntityPayload(
  mode: 'new' | 'edit',
  payload: EntityDto,
  actions: {
    createEntity: EntityCreate;
    updateEntity: EntityUpdate;
    buildCreateSuccessMessage: (id: number) => string;
    saveSuccessMessage: string;
  }
) {
  if (mode === 'new') {
    const id = await actions.createEntity(payload);
    return actions.buildCreateSuccessMessage(id);
  }

  await actions.updateEntity(payload);
  return actions.saveSuccessMessage;
}
