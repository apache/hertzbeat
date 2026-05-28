import type { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export const OTLP_OVERVIEW_URL = '/ingestion/otlp/overview';
export const OTLP_GUIDE_URL = '/ingestion/otlp/guide';
export const OTLP_BINDINGS_URL = '/ingestion/otlp/bindings';

const fallbackGuide: OtlpIngestionGuide = {
  httpProtocolLabel: 'HTTP',
  grpcProtocolLabel: 'gRPC',
  authHeaderName: 'Authorization',
  authHeaderExample: 'Bearer <token>',
  grpcAuthorityExample: 'hertzbeat.internal:4317',
  signals: [
    {
      signal: 'metrics',
      protocol: 'http',
      mode: 'push',
      endpoint: '/api/otlp/v1/metrics',
      summary: 'otlp.guide.fallback.metrics.summary'
    },
    {
      signal: 'logs',
      protocol: 'http',
      mode: 'push',
      endpoint: '/api/otlp/v1/logs',
      summary: 'otlp.guide.fallback.logs.summary'
    },
    {
      signal: 'traces',
      protocol: 'http',
      mode: 'push',
      endpoint: '/api/otlp/v1/traces',
      summary: 'otlp.guide.fallback.traces.summary'
    }
  ],
  snippets: []
};

const fallbackBindings: OtlpEntityBindingSummary = {
  canonicalIdentityKeys: ['service.name', 'service.namespace', 'deployment.environment'],
  recentServices: [],
  recentBoundEntities: [],
  recentUnboundCandidates: [],
  recentIdentitySamples: []
};

async function loadWithFallback<T>(load: Promise<T>, fallback: T): Promise<T> {
  try {
    return await load;
  } catch {
    return fallback;
  }
}

export async function loadOtlpPageData(apiGet: ApiGetter) {
  const [overview, guide, bindings] = await Promise.all([
    apiGet<OtlpIngestionOverview>(OTLP_OVERVIEW_URL),
    loadWithFallback(apiGet<OtlpIngestionGuide>(OTLP_GUIDE_URL), fallbackGuide),
    loadWithFallback(apiGet<OtlpEntityBindingSummary>(OTLP_BINDINGS_URL), fallbackBindings)
  ]);

  return { overview, guide, bindings };
}
