import type { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

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
      summary: '通过 Collector 或 SDK 推送指标，再绑定到 HertzBeat 监控模板。'
    },
    {
      signal: 'logs',
      protocol: 'http',
      mode: 'push',
      endpoint: '/api/otlp/v1/logs',
      summary: '通过 OTLP 日志上报进入日志工作台，并参与实体归并。'
    },
    {
      signal: 'traces',
      protocol: 'http',
      mode: 'push',
      endpoint: '/api/otlp/v1/traces',
      summary: '通过 OTLP 链路上报生成服务调用关系和拓扑证据。'
    }
  ],
  snippets: []
};

const fallbackBindings: OtlpEntityBindingSummary = {
  canonicalIdentityKeys: ['service.name', 'service.namespace', 'deployment.environment'],
  recentServices: [],
  recentBoundEntities: [],
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
    apiGet<OtlpIngestionOverview>('/ingestion/otlp/overview'),
    loadWithFallback(apiGet<OtlpIngestionGuide>('/ingestion/otlp/guide'), fallbackGuide),
    loadWithFallback(apiGet<OtlpEntityBindingSummary>('/ingestion/otlp/bindings'), fallbackBindings)
  ]);

  return { overview, guide, bindings };
}
