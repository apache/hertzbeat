function toUrl(targetUrl) {
  return targetUrl instanceof URL ? targetUrl : new URL(targetUrl, 'http://127.0.0.1');
}

function normalizeStubPath(targetUrl) {
  const pathname = toUrl(targetUrl).pathname;
  if (pathname === '/api') {
    return '/';
  }
  return pathname.startsWith('/api/') ? pathname.slice(4) : pathname;
}

function readIntegerParam(targetUrl, key, fallbackValue) {
  const raw = toUrl(targetUrl).searchParams.get(key);
  if (raw == null) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function buildEmptyPage(targetUrl, defaultPageSize) {
  const pageIndex = readIntegerParam(targetUrl, 'pageIndex', 0);
  const pageSize = readIntegerParam(targetUrl, 'pageSize', defaultPageSize);

  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size: pageSize,
    number: pageIndex,
    numberOfElements: 0,
    pageIndex,
    pageSize
  };
}

function buildStubEntityDto(targetUrl) {
  const pathname = normalizeStubPath(targetUrl);
  const rawId = pathname.split('/')[2] || '1';
  const parsedId = Number.parseInt(rawId, 10);
  const normalizedId = Number.isFinite(parsedId) ? parsedId : 1;

  return {
    code: 0,
    data: {
      entity: {
        id: normalizedId,
        type: 'service',
        name: `entity-${normalizedId}`,
        displayName: `Entity ${normalizedId}`,
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
    }
  };
}

function buildStubEntityDefinition(targetUrl) {
  const url = toUrl(targetUrl);
  const rawId = normalizeStubPath(url).split('/')[2] || '1';
  const format = url.searchParams.get('format') || 'yaml';

  if (format === 'json') {
    return {
      code: 0,
      data: JSON.stringify(
        {
          apiVersion: 'hertzbeat.apache.org/v1',
          kind: 'Entity',
          metadata: {
            name: `entity-${rawId}`
          },
          spec: {
            type: 'service',
            displayName: `Entity ${rawId}`,
            owner: 'platform',
            system: 'catalog',
            environment: 'prod',
            source: 'manual'
          }
        },
        null,
        2
      )
    };
  }

  return {
    code: 0,
    data: [
      'apiVersion: hertzbeat.apache.org/v1',
      'kind: Entity',
      'metadata:',
      `  name: entity-${rawId}`,
      'spec:',
      '  type: service',
      `  displayName: Entity ${rawId}`,
      '  owner: platform',
      '  system: catalog',
      '  environment: prod',
      '  source: manual'
    ].join('\n')
  };
}

function buildStubEntityDetail(targetUrl) {
  const rawId = normalizeStubPath(targetUrl).split('/')[2] || '1';
  const parsedId = Number.parseInt(rawId, 10);
  const normalizedId = Number.isFinite(parsedId) ? parsedId : 1;

  return {
    code: 0,
    data: {
      entity: {
        entity: {
          id: normalizedId,
          name: `entity-${normalizedId}`,
          displayName: `Entity ${normalizedId}`,
          type: 'service',
          status: 'unknown',
          owner: 'platform',
          environment: 'prod',
          system: 'catalog',
          source: 'manual',
          description: 'Fallback entity workspace while backend entity detail APIs are unavailable.'
        },
        identities: [],
        monitorBinds: [],
        relations: []
      },
      evidenceSummary: {
        activeAlertCount: 0,
        downMonitorCount: 0,
        healthyMonitorCount: 0,
        identityCount: 0,
        logHintCount: 0,
        lastEvidenceAt: null
      },
      alertSummary: {
        totalActiveAlerts: 0,
        latestStatusChangeAt: null
      },
      monitorSummary: {
        totalBoundMonitors: 0,
        latestStatusChangeAt: null
      },
      logSummary: {
        hintCount: 0,
        preferredQueryTitle: null,
        fallbackSearchTerm: null
      },
      traceSummary: {
        recentTraceCount: 0,
        recentErrorTraceCount: 0,
        latestObservedAt: null,
        active: false,
        latestTraceId: null
      },
      boundMonitors: [],
      activeAlerts: [],
      nextActions: [
        {
          actionType: 'definition',
          title: 'Open definition workspace',
          summary: 'Review the definition shell before adding ownership or evidence.',
          actionLabel: 'Open definition',
          priority: 1
        }
      ]
    }
  };
}

export function buildAngularReferenceStubPayload(targetUrl) {
  const normalizedPath = normalizeStubPath(targetUrl);

  if (/^\/entities\/\d+$/.test(normalizedPath)) {
    return buildStubEntityDto(targetUrl);
  }

  if (/^\/entities\/\d+\/detail$/.test(normalizedPath)) {
    return buildStubEntityDetail(targetUrl);
  }

  if (/^\/entities\/\d+\/alerts$/.test(normalizedPath) || /^\/entities\/\d+\/monitors$/.test(normalizedPath)) {
    return {
      code: 0,
      data: buildEmptyPage(targetUrl, 10)
    };
  }

  if (/^\/entities\/\d+\/definition$/.test(normalizedPath)) {
    return buildStubEntityDefinition(targetUrl);
  }

  switch (normalizedPath) {
    case '/apps/hierarchy':
      return {
        code: 0,
        data: []
      };
    case '/config/mute':
      return {
        code: 0,
        data: {
          mute: true
        }
      };
    case '/alerts':
    case '/monitors':
      return {
        code: 0,
        data: buildEmptyPage(targetUrl, 10)
      };
    case '/entities':
      return {
        code: 0,
        data: buildEmptyPage(targetUrl, 10)
      };
    case '/entities/definition-activities':
    case '/entities/definition/templates':
    case '/entities/discovery/governance-presets':
    case '/entities/discovery/governance-activities':
    case '/entities/definition/workspace-activities':
      return {
        code: 0,
        data: []
      };
    case '/entities/catalog-suggestions':
      return {
        code: 0,
        data: {
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
        }
      };
    case '/ingestion/otlp/overview':
      return {
        code: 0,
        data: {
          metrics: {
            signal: 'metrics',
            active: false,
            totalCount: 0,
            latestObservedAt: null,
            intakeMode: 'pull',
            summary: ''
          },
          logs: {
            signal: 'logs',
            active: false,
            totalCount: 0,
            latestObservedAt: null,
            intakeMode: 'push',
            summary: ''
          },
          traces: {
            signal: 'traces',
            active: false,
            totalCount: 0,
            latestObservedAt: null,
            intakeMode: 'push',
            summary: ''
          },
          activeSignalCount: 0,
          latestObservedAt: null,
          recentServiceCount: 0,
          boundEntityCount: 0,
          recentEvents: []
        }
      };
    case '/ingestion/otlp/guide':
      return {
        code: 0,
        data: {
          httpProtocolLabel: 'HTTP',
          grpcProtocolLabel: 'gRPC',
          authHeaderName: 'Authorization',
          authHeaderExample: 'Bearer <token>',
          grpcAuthorityExample: '',
          signals: [],
          snippets: []
        }
      };
    case '/ingestion/otlp/bindings':
      return {
        code: 0,
        data: {
          canonicalIdentityKeys: [],
          recentServices: [],
          recentIdentitySamples: [],
          recentBoundEntities: []
        }
      };
    case '/ingestion/otlp/metrics/console':
      return {
        code: 0,
        data: {
          context: {},
          query: null,
          datasource: null,
          queryMode: null,
          results: {
            refId: null,
            status: 0,
            msg: '',
            frames: []
          },
          stats: {
            totalSeries: 0,
            nonEmptySeries: 0,
            latestObservedAt: null
          },
          emptyStateReason: 'no-data',
          errorMessage: null
        }
      };
    case '/traces/list':
      return {
        code: 0,
        data: buildEmptyPage(targetUrl, 20)
      };
    case '/traces/stats/overview':
      return {
        code: 0,
        data: {
          totalTraceCount: 0,
          errorTraceCount: 0,
          latestObservedAt: null,
          hasActiveTrace: false
        }
      };
    default:
      return null;
  }
}

export function resolveAngularReferenceStubResponse({ method = 'GET', targetUrl, upstreamStatus }) {
  if (upstreamStatus !== 404) {
    return null;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return null;
  }

  const payload = buildAngularReferenceStubPayload(targetUrl);
  if (!payload) {
    return null;
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: method === 'HEAD' ? '' : JSON.stringify(payload)
  };
}
