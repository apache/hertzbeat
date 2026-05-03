import { describe, expect, it } from 'vitest';
import {
  buildAngularReferenceStubPayload,
  resolveAngularReferenceStubResponse
} from './angular-reference-server-lib.mjs';

describe('angular reference server stub helpers', () => {
  it('stubs Milestone 2 paged endpoints with query-aware empty payloads', () => {
    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities?pageIndex=3&pageSize=8')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 8,
        number: 3,
        numberOfElements: 0,
        pageIndex: 3,
        pageSize: 8
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/traces/list?pageIndex=2&pageSize=50')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 50,
        number: 2,
        numberOfElements: 0,
        pageIndex: 2,
        pageSize: 50
      }
    });
  });

  it('stubs Milestone 2 support endpoints even outside overview referers', () => {
    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/definition-activities?limit=8')
    ).toEqual({
      code: 0,
      data: []
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/definition/templates?limit=8')
    ).toEqual({
      code: 0,
      data: []
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/discovery/governance-presets?limit=8')
    ).toEqual({
      code: 0,
      data: []
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/discovery/governance-activities?limit=24')
    ).toEqual({
      code: 0,
      data: []
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/definition/workspace-activities?limit=24')
    ).toEqual({
      code: 0,
      data: []
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/catalog-suggestions?limit=120')
    ).toEqual({
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/config/mute')
    ).toEqual({
      code: 0,
      data: {
        mute: true
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/alerts?sort=gmtUpdate&order=desc&pageIndex=0&pageSize=5&status=firing')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 5,
        number: 0,
        numberOfElements: 0,
        pageIndex: 0,
        pageSize: 5
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/monitors?pageIndex=0&pageSize=1')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 1,
        number: 0,
        numberOfElements: 0,
        pageIndex: 0,
        pageSize: 1
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/42')
    ).toEqual({
      code: 0,
      data: {
        entity: {
          id: 42,
          type: 'service',
          name: 'entity-42',
          displayName: 'Entity 42',
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/42/detail')
    ).toEqual({
      code: 0,
      data: {
        entity: {
          entity: {
            id: 42,
            name: 'entity-42',
            displayName: 'Entity 42',
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/42/alerts?pageIndex=2&pageSize=5')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 5,
        number: 2,
        numberOfElements: 0,
        pageIndex: 2,
        pageSize: 5
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/42/monitors?pageIndex=0&pageSize=10&status=2')
    ).toEqual({
      code: 0,
      data: {
        content: [],
        totalPages: 0,
        totalElements: 0,
        size: 10,
        number: 0,
        numberOfElements: 0,
        pageIndex: 0,
        pageSize: 10
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/entities/42/definition?format=yaml')
    ).toEqual({
      code: 0,
      data: [
        'apiVersion: hertzbeat.apache.org/v1',
        'kind: Entity',
        'metadata:',
        '  name: entity-42',
        'spec:',
        '  type: service',
        '  displayName: Entity 42',
        '  owner: platform',
        '  system: catalog',
        '  environment: prod',
        '  source: manual'
      ].join('\n')
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/ingestion/otlp/overview')
    ).toEqual({
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/ingestion/otlp/guide')
    ).toEqual({
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/ingestion/otlp/bindings')
    ).toEqual({
      code: 0,
      data: {
        canonicalIdentityKeys: [],
        recentServices: [],
        recentIdentitySamples: [],
        recentBoundEntities: []
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/ingestion/otlp/metrics/console?entityId=7')
    ).toEqual({
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
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/api/traces/stats/overview')
    ).toEqual({
      code: 0,
      data: {
        totalTraceCount: 0,
        errorTraceCount: 0,
        latestObservedAt: null,
        hasActiveTrace: false
      }
    });

    expect(
      buildAngularReferenceStubPayload('http://127.0.0.1:1157/apps/hierarchy?lang=en-US')
    ).toEqual({
      code: 0,
      data: []
    });
  });

  it('only serves stub responses for 404 GET or HEAD requests on known routes', () => {
    expect(
      resolveAngularReferenceStubResponse({
        method: 'GET',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/api/ingestion/otlp/overview'
      })
    ).toEqual({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
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
      })
    });

    expect(
      resolveAngularReferenceStubResponse({
        method: 'HEAD',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/api/traces/list?pageIndex=0&pageSize=20'
      })
    ).toEqual({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: ''
    });

    expect(
      resolveAngularReferenceStubResponse({
        method: 'GET',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/apps/hierarchy?lang=en-US'
      })
    ).toEqual({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        code: 0,
        data: []
      })
    });

    expect(
      resolveAngularReferenceStubResponse({
        method: 'POST',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/api/entities/discovery/governance-presets'
      })
    ).toBeNull();

    expect(
      resolveAngularReferenceStubResponse({
        method: 'GET',
        upstreamStatus: 200,
        targetUrl: 'http://127.0.0.1:1157/api/ingestion/otlp/overview'
      })
    ).toBeNull();

    expect(
      resolveAngularReferenceStubResponse({
        method: 'GET',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/api/alerts'
      })
    ).toEqual({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        code: 0,
        data: {
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: 10,
          number: 0,
          numberOfElements: 0,
          pageIndex: 0,
          pageSize: 10
        }
      })
    });

    expect(
      resolveAngularReferenceStubResponse({
        method: 'GET',
        upstreamStatus: 404,
        targetUrl: 'http://127.0.0.1:1157/api/not-stubbed'
      })
    ).toBeNull();
  });
});
