import { uniqueSuggestions } from './draft-utils';
import type { Entity, EntityCatalogSuggestions, EntityDto } from '@/lib/types';
import { interpolate, type TranslationParams } from '../i18n';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

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

export type EntityEditorAttributionNavigationContext = {
  returnTo?: string | null;
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

export type EntityEditorViewModelTranslator = (key: string, params?: TranslationParams) => string;

export function translateEntityEditorViewModel(key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

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

function buildIdentityMeta(identities: unknown[], t: EntityEditorViewModelTranslator = translateEntityEditorViewModel) {
  const first = firstRecord(identities);
  if (!first) {
    return t('entities.editor.attribution.identity.waiting-meta');
  }

  const key = readRecordText(first, ['identityKey', 'key', 'name', 'attributeKey']);
  const value = readRecordText(first, ['identityValue', 'value', 'id', 'attributeValue']);

  if (key && value) {
    return `${key}=${value}`;
  }
  if (key) {
    return key;
  }
  return value || t('entities.editor.attribution.identity.recognized-meta');
}

function buildMonitorBindMeta(monitorBinds: unknown[], t: EntityEditorViewModelTranslator = translateEntityEditorViewModel) {
  const first = firstRecord(monitorBinds);
  if (!first) {
    return t('entities.editor.attribution.monitor.waiting-meta');
  }

  const monitorId = readRecordText(first, ['monitorId', 'id']);
  if (monitorId) {
    return `monitorId ${monitorId}`;
  }

  return readRecordText(first, ['templateName', 'template', 'app', 'bindType']) || t('entities.editor.attribution.monitor.existing-meta');
}

function safeInternalHref(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(normalized, 'https://hertzbeat.local');
    if (parsed.origin !== 'https://hertzbeat.local') {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolveEntityEditorDiscoveryReturnHref(value?: string | null): string | null {
  const safeHref = safeInternalHref(value);
  if (safeHref == null) {
    return null;
  }

  if (safeHref === '/entities/discovery' || safeHref.startsWith('/entities/discovery?')) {
    return safeHref;
  }

  try {
    const parsed = new URL(safeHref, 'https://hertzbeat.local');
    const nestedReturnTo = parsed.searchParams.get('returnTo');
    if (nestedReturnTo && nestedReturnTo !== value) {
      return resolveEntityEditorDiscoveryReturnHref(nestedReturnTo);
    }
  } catch {
    return null;
  }

  return null;
}

function buildDiscoveryHref(monitorBinds: unknown[], navigationContext: EntityEditorAttributionNavigationContext = {}) {
  const returnDiscoveryHref = resolveEntityEditorDiscoveryReturnHref(navigationContext.returnTo);
  if (returnDiscoveryHref != null) {
    return returnDiscoveryHref;
  }

  const first = firstRecord(monitorBinds);
  const monitorId = first ? readRecordText(first, ['monitorId', 'id']) : undefined;
  if (!monitorId) {
    return '/entities/discovery';
  }
  return `/entities/discovery?source=telemetry&monitorId=${encodeURIComponent(monitorId)}`;
}

function missingSystemEnvironmentCopy(
  system: string | undefined,
  environment: string | undefined,
  t: EntityEditorViewModelTranslator = translateEntityEditorViewModel
) {
  if (system && environment) {
    return `${system} · ${environment}`;
  }
  if (system) {
    return t('entities.editor.attribution.system-environment.missing-environment', { system });
  }
  if (environment) {
    return t('entities.editor.attribution.system-environment.missing-system', { environment });
  }
  return t('entities.editor.attribution.system-environment.missing-both');
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

export function buildEntityEditorAttributionRows(
  payload: EntityDto,
  t: EntityEditorViewModelTranslator = translateEntityEditorViewModel,
  navigationContext: EntityEditorAttributionNavigationContext = {}
): EntityEditorAttributionRow[] {
  const entity = payload.entity || {};
  const identities = Array.isArray(payload.identities) ? payload.identities : [];
  const monitorBinds = Array.isArray(payload.monitorBinds) ? payload.monitorBinds : [];
  const owner = readText(entity.owner);
  const system = readText(entity.system);
  const environment = readText(entity.environment);
  const discoveryHref = buildDiscoveryHref(monitorBinds, navigationContext);

  return [
    {
      key: 'identity',
      title: t('entities.editor.attribution.identity.title'),
      copy: identities.length > 0
        ? t('entities.editor.attribution.identity.count', { count: identities.length })
        : t('entities.editor.attribution.identity.missing'),
      meta: buildIdentityMeta(identities, t),
      state: identities.length > 0 ? 'ready' : 'missing'
    },
    {
      key: 'monitor-binding',
      title: t('entities.editor.attribution.monitor.title'),
      copy: t('entities.editor.attribution.monitor.count', { count: monitorBinds.length }),
      meta: buildMonitorBindMeta(monitorBinds, t),
      state: monitorBinds.length > 0 ? 'ready' : 'missing'
    },
    {
      key: 'ownership',
      title: t('entities.editor.attribution.owner.title'),
      copy: owner || t('entities.editor.attribution.owner.missing'),
      meta: owner ? t('entities.editor.attribution.owner.ready-meta') : t('entities.editor.attribution.owner.missing-meta'),
      state: owner ? 'ready' : 'missing'
    },
    {
      key: 'system-environment',
      title: t('entities.editor.attribution.system-environment.title'),
      copy: missingSystemEnvironmentCopy(system, environment, t),
      meta: t('entities.editor.attribution.system-environment.meta'),
      state: system && environment ? 'ready' : 'review'
    },
    {
      key: 'discovery-return',
      title: t('entities.editor.attribution.discovery.title'),
      copy: t('entities.editor.attribution.discovery.copy'),
      meta: discoveryHref,
      state: discoveryHref.includes('monitorId=') ? 'ready' : 'review',
      href: discoveryHref
    }
  ];
}
