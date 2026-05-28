import type { TopologyRouteContext } from './topology-surface/view-model';

type QueryRecord = Record<string, string | number | boolean | null | undefined>;

function compactRecord(record: QueryRecord = {}) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value != null && value !== ''));
}

export const queryKeys = {
  session: {
    current: ['session', 'current'] as const
  },
  monitors: {
    all: ['monitors'] as const,
    list: (query: QueryRecord = {}) => ['monitors', 'list', compactRecord(query)] as const,
    detail: (monitorId: string | number) => ['monitors', 'detail', String(monitorId)] as const,
    history: (monitorId: string | number, metric: string, query: QueryRecord = {}) =>
      ['monitors', 'history', String(monitorId), metric, compactRecord(query)] as const
  },
  entities: {
    all: ['entities'] as const,
    detail: (entityId: string | number) => ['entities', 'detail', String(entityId)] as const
  },
  metrics: {
    all: ['metrics'] as const,
    monitorRealtime: (monitorId: string | number, metricName: string) =>
      ['metrics', 'monitor-realtime', String(monitorId), metricName] as const
  },
  logs: {
    all: ['logs'] as const,
    list: (query: QueryRecord = {}) => ['logs', 'list', compactRecord(query)] as const
  },
  traces: {
    all: ['traces'] as const,
    detail: (traceId: string) => ['traces', 'detail', traceId] as const,
    spans: (traceId: string) => ['traces', 'spans', traceId] as const
  },
  topology: {
    all: ['topology'] as const,
    graph: (context: TopologyRouteContext = {}) => ['topology', 'graph', compactRecord(context as QueryRecord)] as const
  },
  overview: {
    all: ['overview'] as const,
    console: (query: QueryRecord = {}) => ['overview', 'console', compactRecord(query)] as const
  },
  alerts: {
    all: ['alerts'] as const,
    list: (query: QueryRecord = {}) => ['alerts', 'list', compactRecord(query)] as const
  }
} as const;
