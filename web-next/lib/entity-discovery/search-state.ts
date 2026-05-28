export interface DiscoverySearchSubmission {
  mode: 'idle' | 'search';
  normalizedSearch: string | null;
}

export interface DiscoveryCandidateContext {
  source: 'otlp-candidate';
  identityKey: string;
  identityValue: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  search: string;
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

  return {
    source: 'otlp-candidate',
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

  return `/entities/new?${params.toString()}`;
}
