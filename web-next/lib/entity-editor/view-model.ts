import { uniqueSuggestions } from './draft-utils';
import type { Entity, EntityCatalogSuggestions, EntityDto } from '@/lib/types';

type Fact = { label: string; value: string };
type Row = { title: string; copy: string; meta?: string };

export type EntityEditorAttributionState = 'ready' | 'review' | 'missing';

export type EntityEditorAttributionRow = {
  key: 'identity' | 'monitor-binding' | 'ownership' | 'system-environment' | 'discovery-return';
  title: string;
  copy: string;
  meta: string;
  state: EntityEditorAttributionState;
  href?: string;
};

type EntityEditorFactCopy = {
  workspace: string;
  type: string;
  owner: string;
  system: string;
};

type EntityEditorTitleCopy = {
  newTitle: string;
  editTitle: (entityId: string) => string;
};

type EntityEditorCatalogCopy = {
  owners: string;
  systems: string;
  environments: string;
  lifecycleTier: string;
  count: (count: number) => string;
  seed: string;
};

type EntityEditorNextStepsCopy = {
  importTitle: string;
  importCopy: string;
  reviewTitle: string;
  reviewCopy: string;
  discoveryTitle: string;
  discoveryCopy: string;
};

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRecordText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readText(record[key]);
    if (value) {
      return value;
    }
    if (typeof record[key] === 'number' && Number.isFinite(record[key])) {
      return String(record[key]);
    }
  }
  return undefined;
}

function firstRecord(items: unknown[] | undefined) {
  return items?.find(item => item && typeof item === 'object') as Record<string, unknown> | undefined;
}

function buildIdentityMeta(identities: unknown[]) {
  const first = firstRecord(identities);
  if (!first) {
    return '等待 service.name 或 hertzbeat.entity_id';
  }

  const key = readRecordText(first, ['identityKey', 'key', 'name', 'attributeKey']);
  const value = readRecordText(first, ['identityValue', 'value', 'id', 'attributeValue']);

  if (key && value) {
    return `${key}=${value}`;
  }
  if (key) {
    return key;
  }
  return value || '已识别身份';
}

function buildMonitorBindMeta(monitorBinds: unknown[]) {
  const first = firstRecord(monitorBinds);
  if (!first) {
    return '等待监控对象或模板绑定';
  }

  const monitorId = readRecordText(first, ['monitorId', 'id']);
  if (monitorId) {
    return `monitorId ${monitorId}`;
  }

  return readRecordText(first, ['templateName', 'template', 'app', 'bindType']) || '已有监控绑定';
}

function buildDiscoveryHref(monitorBinds: unknown[]) {
  const first = firstRecord(monitorBinds);
  const monitorId = first ? readRecordText(first, ['monitorId', 'id']) : undefined;
  if (!monitorId) {
    return '/entities/discovery';
  }
  return `/entities/discovery?source=telemetry&monitorId=${encodeURIComponent(monitorId)}`;
}

function missingSystemEnvironmentCopy(system: string | undefined, environment: string | undefined) {
  if (system && environment) {
    return `${system} · ${environment}`;
  }
  if (system) {
    return `${system} · 缺少环境`;
  }
  if (environment) {
    return `缺少系统 · ${environment}`;
  }
  return '缺少系统、环境';
}

export function buildEntityEditorTitle(mode: 'new' | 'edit', entityId: string | undefined, copy: EntityEditorTitleCopy) {
  return mode === 'new' ? copy.newTitle : copy.editTitle(entityId || '-');
}

export function buildEntityEditorFacts(mode: 'new' | 'edit', entityId: string | undefined, entity: Entity, copy: EntityEditorFactCopy): Fact[] {
  return [
    { label: copy.workspace, value: mode === 'new' ? 'entities/new' : `entities/${entityId}/edit` },
    { label: copy.type, value: entity.type || '-' },
    { label: copy.owner, value: entity.owner || '-' },
    { label: copy.system, value: entity.system || '-' }
  ];
}

export function buildEntityEditorSuggestions(catalogSuggestions: EntityCatalogSuggestions | undefined) {
  return {
    ownerSuggestions: uniqueSuggestions(catalogSuggestions?.owners),
    systemSuggestions: uniqueSuggestions(catalogSuggestions?.systems),
    environmentSuggestions: uniqueSuggestions(catalogSuggestions?.environments),
    lifecycleSuggestions: uniqueSuggestions(catalogSuggestions?.lifecycles),
    tierSuggestions: uniqueSuggestions(catalogSuggestions?.tiers),
    languageSuggestions: uniqueSuggestions(catalogSuggestions?.languages),
    providerSuggestions: uniqueSuggestions(catalogSuggestions?.linkProviders)
  };
}

export function buildEntityEditorCatalogRows(
  catalogSuggestions: EntityCatalogSuggestions | undefined,
  derived: {
    ownerSuggestions: string[];
    systemSuggestions: string[];
    environmentSuggestions: string[];
    lifecycleSuggestions: string[];
    tierSuggestions: string[];
  },
  copy: EntityEditorCatalogCopy
): Row[] {
  return [
    {
      title: copy.owners,
      copy: derived.ownerSuggestions.join(', ') || '-',
      meta: copy.count(catalogSuggestions?.owners?.length || 0)
    },
    {
      title: copy.systems,
      copy: derived.systemSuggestions.join(', ') || '-',
      meta: copy.count(catalogSuggestions?.systems?.length || 0)
    },
    {
      title: copy.environments,
      copy: derived.environmentSuggestions.join(', ') || '-',
      meta: copy.count(catalogSuggestions?.environments?.length || 0)
    },
    {
      title: copy.lifecycleTier,
      copy: `${derived.lifecycleSuggestions.join(', ') || '-'} · ${derived.tierSuggestions.join(', ') || '-'}`,
      meta: copy.seed
    }
  ];
}

export function buildEntityEditorNextStepRows(mode: 'new' | 'edit', entityId: string | undefined, copy: EntityEditorNextStepsCopy): Row[] {
  return [
    {
      title: mode === 'new' ? copy.importTitle : copy.reviewTitle,
      copy: mode === 'new' ? copy.importCopy : copy.reviewCopy,
      meta: mode === 'new' ? '/entities/import' : `/entities/${entityId}/definition`
    },
    {
      title: copy.discoveryTitle,
      copy: copy.discoveryCopy,
      meta: '/entities/discovery'
    }
  ];
}

export function buildEntityEditorAttributionRows(payload: EntityDto): EntityEditorAttributionRow[] {
  const entity = payload.entity || {};
  const identities = Array.isArray(payload.identities) ? payload.identities : [];
  const monitorBinds = Array.isArray(payload.monitorBinds) ? payload.monitorBinds : [];
  const owner = readText(entity.owner);
  const system = readText(entity.system);
  const environment = readText(entity.environment);
  const discoveryHref = buildDiscoveryHref(monitorBinds);

  return [
    {
      key: 'identity',
      title: '身份标识',
      copy: identities.length > 0 ? `${identities.length} 个身份标识` : '缺少身份标识',
      meta: buildIdentityMeta(identities),
      state: identities.length > 0 ? 'ready' : 'missing'
    },
    {
      key: 'monitor-binding',
      title: '监控绑定',
      copy: monitorBinds.length > 0 ? `${monitorBinds.length} 个监控绑定` : '0 个监控绑定',
      meta: buildMonitorBindMeta(monitorBinds),
      state: monitorBinds.length > 0 ? 'ready' : 'missing'
    },
    {
      key: 'ownership',
      title: '负责人',
      copy: owner || '缺少负责人',
      meta: owner ? '可追责' : '先补负责人或值班组',
      state: owner ? 'ready' : 'missing'
    },
    {
      key: 'system-environment',
      title: '系统与环境',
      copy: missingSystemEnvironmentCopy(system, environment),
      meta: '用于告警收敛和拓扑',
      state: system && environment ? 'ready' : 'review'
    },
    {
      key: 'discovery-return',
      title: '发现回路',
      copy: '可回到遥测发现',
      meta: discoveryHref,
      state: discoveryHref.includes('monitorId=') ? 'ready' : 'review',
      href: discoveryHref
    }
  ];
}
