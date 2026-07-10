import type { EntitySummaryInfo } from '@/lib/types';

export interface DiscoverySearchSubmission {
  mode: 'idle' | 'search';
  normalizedSearch: string | null;
}

export interface DiscoveryCandidateContext {
  source: 'otlp-candidate';
  returnSource?: string;
  identityKey: string;
  identityValue: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  search: string;
}

export interface DiscoveryCandidateEntityMatch {
  entityId: string;
  entityName: string;
}

type SearchParamsLike = {
  get(name: string): string | null;
};

function cleanParam(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function resolveDiscoverySearchSubmission(search: string): DiscoverySearchSubmission {
  const normalizedSearch = search.trim();

  if (normalizedSearch === '') {
    return {
      mode: 'idle',
      normalizedSearch: null
    };
  }

  return {
    mode: 'search',
    normalizedSearch
  };
}

export function resolveDiscoveryCandidateContext(searchParams: SearchParamsLike): DiscoveryCandidateContext | null {
  const identityKey = cleanParam(searchParams.get('identityKey'));
  const identityValue = cleanParam(searchParams.get('identityValue'));

  if (identityKey == null || identityValue == null) {
    return null;
  }

  const serviceName = cleanParam(searchParams.get('serviceName'));
  const serviceNamespace = cleanParam(searchParams.get('serviceNamespace'));
  const environment = cleanParam(searchParams.get('environment'));
  const returnSource = cleanParam(searchParams.get('source'));

  return {
    source: 'otlp-candidate',
    returnSource,
    identityKey,
    identityValue,
    serviceName,
    serviceNamespace,
    environment,
    search: serviceName ?? identityValue
  };
}

export function buildDiscoveryCandidateActionHref(candidateContext: DiscoveryCandidateContext): string {
  const params = new URLSearchParams();
  params.set('source', candidateContext.source);
  params.set('identityKey', candidateContext.identityKey);
  params.set('identityValue', candidateContext.identityValue);

  if (candidateContext.serviceName != null) {
    params.set('serviceName', candidateContext.serviceName);
  }
  if (candidateContext.serviceNamespace != null) {
    params.set('serviceNamespace', candidateContext.serviceNamespace);
  }
  if (candidateContext.environment != null) {
    params.set('environment', candidateContext.environment);
  }

  params.set('returnTo', buildDiscoveryCandidateReturnHref(candidateContext));

  return `/entities/new?${params.toString()}`;
}

export function buildDiscoveryCandidateEntityLookupUrl(candidateContext: DiscoveryCandidateContext): string {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '8',
    sort: 'gmtUpdate',
    order: 'desc'
  });
  params.set('search', candidateContext.serviceName ?? candidateContext.identityValue);
  return `/entities?${params.toString()}`;
}

export function buildDiscoveryCandidateExistingEntityHref(
  candidateContext: DiscoveryCandidateContext,
  match: DiscoveryCandidateEntityMatch
): string {
  const params = new URLSearchParams();
  params.set('source', candidateContext.source);
  params.set('returnTo', buildDiscoveryCandidateReturnHref(candidateContext));
  return `/entities/${encodeURIComponent(match.entityId)}?${params.toString()}`;
}

export function buildDiscoveryCandidateReturnHref(candidateContext: DiscoveryCandidateContext): string {
  const params = new URLSearchParams();
  params.set('identityKey', candidateContext.identityKey);
  params.set('identityValue', candidateContext.identityValue);

  if (candidateContext.serviceName != null) {
    params.set('serviceName', candidateContext.serviceName);
  }
  if (candidateContext.serviceNamespace != null) {
    params.set('serviceNamespace', candidateContext.serviceNamespace);
  }
  if (candidateContext.environment != null) {
    params.set('environment', candidateContext.environment);
  }
  if (candidateContext.returnSource != null) {
    params.set('source', candidateContext.returnSource);
  }

  return `/entities/discovery?${params.toString()}`;
}

function normalizeCandidateText(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function candidateTextMatches(expected: string | null | undefined, actual: string | number | null | undefined) {
  const normalizedExpected = normalizeCandidateText(expected);
  if (!normalizedExpected) {
    return true;
  }
  const normalizedActual = normalizeCandidateText(actual);
  return !normalizedActual || normalizedActual === normalizedExpected;
}

export function resolveDiscoveryCandidateEntityMatch(
  candidateContext: DiscoveryCandidateContext,
  items: EntitySummaryInfo[]
): DiscoveryCandidateEntityMatch | null {
  const expectedNames = [candidateContext.serviceName, candidateContext.identityValue]
    .map(value => normalizeCandidateText(value))
    .filter(Boolean);

  let match: EntitySummaryInfo | undefined;
  for (const expectedName of expectedNames) {
    match = items.find(item => {
      const entity = item.entity;
      if (entity?.id == null) {
        return false;
      }
      const candidateNames = [entity.name, entity.displayName].map(value => normalizeCandidateText(value)).filter(Boolean);
      const nameMatches = candidateNames.some(name => name === expectedName);
      if (!nameMatches) {
        return false;
      }
      return candidateTextMatches(candidateContext.serviceNamespace, entity.namespace) && candidateTextMatches(candidateContext.environment, entity.environment);
    });
    if (match != null) {
      break;
    }
  }

  if (match?.entity?.id == null) {
    return null;
  }

  return {
    entityId: String(match.entity.id),
    entityName: match.entity.displayName || match.entity.name || String(match.entity.id)
  };
}
