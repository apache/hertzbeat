import manifest from '../../lib/parity/route-manifest.json';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildParityRunPlan } from './harness-plan.mjs';
import {
  appendParityPhaseTrace,
  buildParityApiStubResponse,
  buildParityBootstrapWarmupPlan,
  buildParityScreenshotSuppressionCss,
  buildParityArtifactPaths,
  buildParityArtifactIndexPayload,
  buildRepresentativeRouteParityCoverage,
  buildParityResultPayload,
  compareParityContracts,
  detectParityFinalUrlProblem,
  normalizeContractText,
  resolveParityArtifactIndexPath,
  resolveBrowserReadySelector,
  resolveParityReadySelectorProbeTimeoutMs,
  resolveSurfacePostLoadActions,
  resolveSurfaceScreenshotOptions,
  resolveSurfaceBrowserReadySelectors,
  resolveSurfaceBrowserReadySelector,
  resolveParityArtifactDir,
  resolveScreenshotDiffCommand,
  withParityTimeout,
  sanitizeParitySlug
} from './harness-lib.mjs';

describe('parity harness helpers', () => {
  it('normalizes text contracts before comparison', () => {
    expect(normalizeContractText('  HertzBeat \n   Workbench\tShell  ')).toBe('HertzBeat Workbench Shell');
  });

  it('detects missing selectors, texts, and actions in the candidate snapshot', () => {
    expect(
      compareParityContracts(
        {
          selectors: ['form', 'button', '[data-passport-shell="true"]'],
          texts: ['HertzBeat', 'Login'],
          actions: ['Sign in', 'Create account']
        },
        {
          selectors: ['form', '[data-passport-shell="true"]'],
          texts: ['HertzBeat'],
          actions: ['Sign in']
        }
      )
    ).toEqual({
      pass: false,
      missingSelectors: ['button'],
      missingTexts: ['Login'],
      missingActions: ['Create account']
    });
  });

  it('stores temporary artifacts outside tracked source by default', () => {
    expect(resolveParityArtifactDir()).toContain(path.join(os.tmpdir(), 'hertzbeat-parity'));
  });

  it('allocates screenshot diff artifacts under the temporary parity root', () => {
    const artifacts = buildParityArtifactPaths(resolveParityArtifactDir('/tmp/hertzbeat-parity'), 'shared-parity-foundation', 'passport-login-shell');

    expect(artifacts.pairDir).toContain(path.join('/tmp/hertzbeat-parity', 'shared-parity-foundation'));
    expect(artifacts.nextScreenshotPath).toContain('next.png');
    expect(artifacts.referenceScreenshotPath).toContain('angular.png');
    expect(artifacts.diffScreenshotPath).toContain('diff.png');
    expect(artifacts.nextCaptureDebugPath).toContain('next-capture-debug.json');
    expect(artifacts.referenceCaptureDebugPath).toContain('reference-capture-debug.json');
    expect(artifacts.routePhaseTracePath).toContain('route-phase-trace.json');
    expect(artifacts.summaryPath).toContain('shared-parity-foundation-passport-login-shell.json');
  });

  it('appends route phase markers so a stalled parity run still leaves the last completed boundary on disk', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'hertzbeat-parity-phase-'));
    const tracePath = path.join(tempDir, 'route-phase-trace.json');

    try {
      expect(
        appendParityPhaseTrace(tracePath, {
          phase: 'next-capture:start',
          surfaceLabel: 'next'
        })
      ).toMatchObject({
        currentPhase: 'next-capture:start',
        markers: [
          expect.objectContaining({
            phase: 'next-capture:start',
            surfaceLabel: 'next'
          })
        ]
      });

      const payload = appendParityPhaseTrace(tracePath, {
        phase: 'reference-auth:start',
        surfaceLabel: 'reference'
      });

      expect(payload).toMatchObject({
        currentPhase: 'reference-auth:start',
        markers: [
          expect.objectContaining({ phase: 'next-capture:start', surfaceLabel: 'next' }),
          expect.objectContaining({ phase: 'reference-auth:start', surfaceLabel: 'reference' })
        ]
      });
      expect(JSON.parse(readFileSync(tracePath, 'utf8'))).toMatchObject(payload);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('sanitizes routes into stable artifact slugs', () => {
    expect(sanitizeParitySlug('/passport/login?redirect=/monitors&source=guard')).toBe(
      'passport-login-redirect-monitors-source-guard'
    );
  });

  it('chooses an available screenshot diff command when one exists', () => {
    const command = resolveScreenshotDiffCommand(((binary: string) =>
      ({
        status: binary === 'compare' ? 0 : 1
      })) as any);

    expect(command).toEqual({
      command: 'compare',
      argsPrefix: ['-metric', 'AE']
    });
  });

  it('prefers a shared browser-ready selector over Next-only data contracts', () => {
    expect(
      resolveBrowserReadySelector({
        primarySelectors: ['[data-workspace-shell="true"]', 'main', 'aside']
      })
    ).toBe('main');

    expect(
      resolveBrowserReadySelector({
        primarySelectors: ['[data-passport-shell="true"]', '[data-login-shell="passport"]', 'form', 'button']
      })
    ).toBe('form');

    expect(resolveBrowserReadySelector({ primarySelectors: [] })).toBe('body');
  });

  it('uses surface-specific hydrated selectors when representative workbench routes need mounted stage content', () => {
    const contract = {
      primarySelectors: ['[data-workspace-shell="true"]', 'main', 'aside'],
      nextReadySelectors: ['[data-observability-stage-section="true"]'],
      referenceReadySelectors: ['text=checkout-service', 'button:has-text("Search")']
    };

    expect(resolveSurfaceBrowserReadySelector(contract, 'next')).toBe('[data-observability-stage-section="true"]');
    expect(resolveSurfaceBrowserReadySelector(contract, 'reference')).toBe('text=checkout-service');
    expect(resolveSurfaceBrowserReadySelectors(contract, 'reference')).toEqual([
      'text=checkout-service',
      'button:has-text("Search")'
    ]);
  });

  it('suppresses Next dev indicator overlays during live screenshots without mutating the Angular reference capture', () => {
    const nextCss = buildParityScreenshotSuppressionCss('next');
    const referenceCss = buildParityScreenshotSuppressionCss('reference');

    expect(nextCss).toContain('nextjs-portal');
    expect(nextCss).toContain('[data-next-badge-root]');
    expect(referenceCss).toBe('');
  });

  it('uses viewport screenshots for reference captures after post-load interactions', () => {
    expect(
      resolveSurfaceScreenshotOptions({
        artifactPath: '/tmp/angular.png',
        surfaceLabel: 'reference',
        routePair: {
          referencePostLoadActions: [
            {
              kind: 'click',
              selector: 'button.trace-list-row'
            }
          ]
        }
      })
    ).toEqual({
      path: '/tmp/angular.png',
      fullPage: false,
      animations: 'disabled'
    });

    expect(
      resolveSurfaceScreenshotOptions({
        artifactPath: '/tmp/next.png',
        surfaceLabel: 'next',
        routePair: {
          referencePostLoadActions: [
            {
              kind: 'click',
              selector: 'button.trace-list-row'
            }
          ]
        }
      })
    ).toEqual({
      path: '/tmp/next.png',
      fullPage: true
    });
  });

  it('uses route-scoped viewport screenshots when a parity pair opts out of full-page capture', () => {
    expect(
      resolveSurfaceScreenshotOptions({
        artifactPath: '/tmp/angular.png',
        surfaceLabel: 'reference',
        routePair: {
          screenshotMode: 'viewport'
        }
      })
    ).toEqual({
      path: '/tmp/angular.png',
      fullPage: false,
      animations: 'disabled'
    });

    expect(
      resolveSurfaceScreenshotOptions({
        artifactPath: '/tmp/next.png',
        surfaceLabel: 'next',
        routePair: {
          screenshotMode: 'viewport'
        }
      })
    ).toEqual({
      path: '/tmp/next.png',
      fullPage: false,
      animations: 'disabled'
    });
  });

  it('caps per-selector ready probes below the full browser-ready budget so stalled visibility checks surface diagnostics quickly', () => {
    expect(resolveParityReadySelectorProbeTimeoutMs(60000)).toBe(2000);
    expect(resolveParityReadySelectorProbeTimeoutMs(6000)).toBe(500);
    expect(resolveParityReadySelectorProbeTimeoutMs(900)).toBe(250);
  });

  it('uses surface-specific post-load actions when a parity route needs stable readiness before a follow-up interaction', () => {
    const contract = {
      referencePostLoadActions: [
        {
          kind: 'click',
          selector: 'button.trace-list-row',
          noWaitAfter: true,
          waitAfterMs: 250
        }
      ]
    };

    expect(resolveSurfacePostLoadActions(contract, 'reference')).toEqual([
      {
        kind: 'click',
        selector: 'button.trace-list-row',
        noWaitAfter: true,
        waitAfterMs: 250
      }
    ]);
    expect(resolveSurfacePostLoadActions(contract, 'next')).toEqual([]);
  });

  it('bounds parity cleanup waits so a hanging browser close cannot stall the whole route run', async () => {
    await expect(
      withParityTimeout(Promise.resolve('ok'), {
        timeoutMs: 25,
        label: 'cleanup'
      })
    ).resolves.toBe('ok');

    await expect(
      withParityTimeout(
        new Promise(() => {}),
        {
          timeoutMs: 25,
          label: 'cleanup'
        }
      )
    ).rejects.toThrow('cleanup timed out after 25ms');
  });

  it('warms Next routes before browser capture so cold route compilation happens outside page.goto', () => {
    const dirtyTraceManageRoute =
      '/trace/manage?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&start=1713199400000&end=1713200000000&returnTo=%2Foverview%3FreturnLabel%3DOverview&returnLabel=Overview&serviceNamespace=storefront&environment=dev';
    const cleanTraceManageRoute =
      'http://127.0.0.1:4200/trace/manage?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&start=1713199400000&end=1713200000000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev';

    expect(
      buildParityBootstrapWarmupPlan({
        surfaceLabel: 'next',
        baseUrl: 'http://127.0.0.1:4200',
        routePath: '/log/manage',
        routePair: {}
      })
    ).toEqual({
      timeoutMs: 180000,
      urls: ['http://127.0.0.1:4200/log/manage', 'http://127.0.0.1:4200/hb-i18n/en-US']
    });

    expect(
      buildParityBootstrapWarmupPlan({
        surfaceLabel: 'next',
        baseUrl: 'http://127.0.0.1:4200',
        routePath: dirtyTraceManageRoute,
        routePair: {
          nextApiStubKey: 'trace-rich-demo'
        }
      })
    ).toEqual({
      timeoutMs: 180000,
      urls: [cleanTraceManageRoute, 'http://127.0.0.1:4200/hb-i18n/en-US']
    });

    expect(
      buildParityBootstrapWarmupPlan({
        surfaceLabel: 'reference',
        baseUrl: 'http://127.0.0.1:4301',
        routePath: '/trace/manage',
        routePair: {
          referenceApiStubKey: 'trace-rich-demo'
        }
      })
    ).toBeNull();
  });

  it('warms and stubs the configured route locale for locale-sensitive parity captures', () => {
    expect(
      buildParityBootstrapWarmupPlan({
        surfaceLabel: 'next',
        baseUrl: 'http://127.0.0.1:4200',
        routePath: '/monitors/42',
        routePair: {
          locale: 'zh-CN'
        }
      })
    ).toEqual({
      timeoutMs: 180000,
      urls: ['http://127.0.0.1:4200/monitors/42', 'http://127.0.0.1:4200/hb-i18n/zh-CN']
    });

    expect(
      buildParityApiStubResponse({
        surfaceLabel: 'next',
        routePair: { locale: 'zh-CN' },
        requestUrl: 'http://127.0.0.1:4200/api/config/system',
        requestMethod: 'GET'
      })
    ).toEqual({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: {
          locale: 'zh-CN',
          theme: 'dark-ops',
          timeZoneId: 'Asia/Shanghai'
        }
      })
    });
  });

  it('builds seeded Next-side trace API stubs for representative trace parity captures', () => {
    const traceManageRoutePair = manifest
      .find(family => family.key === 'three-signal-desk')
      ?.routePairs.find(routePair => routePair.key === 'trace-manage-desk');

    expect(traceManageRoutePair).toBeTruthy();

    const listStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: traceManageRoutePair,
      requestUrl:
        'http://127.0.0.1:4200/api/traces/list?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&pageIndex=0&pageSize=8',
      requestMethod: 'GET',
      seedContext: {
        traceManageDeepLinkRoute:
          '/trace/manage?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&start=1713199400000&end=1713200000000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
      }
    });
    const detailStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: traceManageRoutePair,
      requestUrl: 'http://127.0.0.1:4200/api/traces/trace-ui-rich-demo-1713200000000/spans',
      requestMethod: 'GET',
      seedContext: {
        traceManageDeepLinkRoute:
          '/trace/manage?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&start=1713199400000&end=1713200000000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
      }
    });

    expect(listStub).toBeTruthy();
    expect(detailStub).toBeTruthy();
    expect(JSON.parse(String(listStub?.body))).toMatchObject({
      code: 0,
      data: {
        totalElements: 1,
        content: [
          expect.objectContaining({
            traceId: 'trace-ui-rich-demo-1713200000000',
            serviceName: 'checkout-service',
            serviceNamespace: 'storefront',
            status: 'ERROR'
          })
        ]
      }
    });
    expect(JSON.parse(String(detailStub?.body))).toMatchObject({
      code: 0,
      data: expect.arrayContaining([
        expect.objectContaining({
          traceId: 'trace-ui-rich-demo-1713200000000',
          serviceName: 'checkout-service',
          resourceAttributes: expect.objectContaining({
            'service.namespace': 'storefront',
            'deployment.environment.name': 'dev'
          })
        })
      ])
    });
  });

  it('builds seeded reference-side trace API stubs and closes long-lived parity SSE subscriptions', () => {
    const traceManageRoutePair = manifest
      .find(family => family.key === 'three-signal-desk')
      ?.routePairs.find(routePair => routePair.key === 'trace-manage-desk');

    expect(traceManageRoutePair).toBeTruthy();

    const listStub = buildParityApiStubResponse({
      surfaceLabel: 'reference',
      routePair: {
        ...traceManageRoutePair,
        referenceApiStubKey: 'trace-rich-demo'
      },
      requestUrl:
        'http://127.0.0.1:4301/api/traces/list?pageIndex=0&pageSize=20&start=1713199400000&end=1713200000000&traceId=trace-ui-rich-demo-1713200000000&errorOnly=true&serviceName=checkout-service&serviceNamespace=storefront&environment=dev&hideInternal=false',
      requestMethod: 'GET',
      seedContext: {
        traceManageDeepLinkRoute:
          '/trace/manage?traceId=trace-ui-rich-demo-1713200000000&serviceName=checkout-service&errorOnly=true&start=1713199400000&end=1713200000000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
      }
    });
    const sseStub = buildParityApiStubResponse({
      surfaceLabel: 'reference',
      routePair: traceManageRoutePair,
      requestUrl: 'http://127.0.0.1:4301/api/alert/sse/subscribe',
      requestMethod: 'GET',
      seedContext: {}
    });

    expect(listStub).toBeTruthy();
    expect(JSON.parse(String(listStub?.body))).toMatchObject({
      code: 0,
      data: {
        totalElements: 1,
        content: [
          expect.objectContaining({
            traceId: 'trace-ui-rich-demo-1713200000000',
            serviceName: 'checkout-service',
            serviceNamespace: 'storefront'
          })
        ]
      }
    });
    expect(sseStub).toEqual({
      status: 204,
      body: ''
    });
  });

  it('builds OTLP parity API stubs for Next live captures when the backend intake APIs are unavailable', () => {
    const otlpRoutePair = manifest
      .find(family => family.key === 'three-signal-desk')
      ?.routePairs.find(routePair => routePair.key === 'otlp-center-desk');

    expect(otlpRoutePair).toMatchObject({
      nextApiStubKey: 'otlp-center'
    });

    const overviewStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: otlpRoutePair,
      requestUrl: 'http://127.0.0.1:4200/api/ingestion/otlp/overview',
      requestMethod: 'GET'
    });
    const guideStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: otlpRoutePair,
      requestUrl: 'http://127.0.0.1:4200/api/ingestion/otlp/guide',
      requestMethod: 'GET'
    });
    const bindingsStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: otlpRoutePair,
      requestUrl: 'http://127.0.0.1:4200/api/ingestion/otlp/bindings',
      requestMethod: 'GET'
    });

    expect(JSON.parse(String(overviewStub?.body))).toMatchObject({
      code: 0,
      data: {
        activeSignalCount: 0,
        metrics: {
          signal: 'metrics'
        },
        logs: {
          signal: 'logs'
        },
        traces: {
          signal: 'traces'
        }
      }
    });
    expect(JSON.parse(String(guideStub?.body))).toMatchObject({
      code: 0,
      data: {
        httpProtocolLabel: 'HTTP',
        grpcProtocolLabel: 'gRPC'
      }
    });
    expect(JSON.parse(String(bindingsStub?.body))).toMatchObject({
      code: 0,
      data: {
        recentBoundEntities: []
      }
    });
  });

  it('builds entity fixture API stubs for entity editor captures when the live entity is missing', () => {
    const editRoutePair = manifest
      .find(family => family.key === 'entity-family')
      ?.routePairs.find(routePair => routePair.key === 'entity-editor-edit');

    expect(editRoutePair).toMatchObject({
      nextApiStubKey: 'entity-fixture',
      referenceApiStubKey: 'entity-fixture'
    });

    const entityStub = buildParityApiStubResponse({
      surfaceLabel: 'next',
      routePair: editRoutePair,
      requestUrl: 'http://127.0.0.1:4200/api/entities/1',
      requestMethod: 'GET'
    });
    const suggestionsStub = buildParityApiStubResponse({
      surfaceLabel: 'reference',
      routePair: editRoutePair,
      requestUrl: 'http://127.0.0.1:4301/api/entities/catalog-suggestions?limit=120',
      requestMethod: 'GET'
    });

    expect(JSON.parse(String(entityStub?.body))).toMatchObject({
      code: 0,
      data: {
        entity: {
          id: 1,
          name: 'entity-1',
          displayName: 'Entity 1'
        }
      }
    });
    expect(JSON.parse(String(suggestionsStub?.body))).toMatchObject({
      code: 0,
      data: {
        owners: []
      }
    });
  });

  it('flags exception pages as invalid live parity destinations', () => {
    expect(
      detectParityFinalUrlProblem({
        expectedRoute: '/exception/404',
        finalUrl: 'http://127.0.0.1:4200/exception/404',
        surfaceLabel: 'next'
      })
    ).toBeNull();

    expect(
      detectParityFinalUrlProblem({
        expectedRoute: '/log/manage',
        finalUrl: 'http://127.0.0.1:4301/exception/404?url=%2Fentities%2Fdiscovery%2Fgovernance-presets%3Flimit%3D8',
        surfaceLabel: 'reference'
      })
    ).toBe('reference resolved to /exception/404 instead of /log/manage');

    expect(
      detectParityFinalUrlProblem({
        expectedRoute: '/log/integration/webhook',
        finalUrl: 'http://127.0.0.1:4200/ingestion/otlp?signal=logs',
        surfaceLabel: 'next'
      })
    ).toBeNull();
  });

  it('surfaces representative RouteParitySpec metadata in harness result payloads and artifact summaries', () => {
    const threeSignalDesk = manifest.find(family => family.key === 'three-signal-desk');
    const compatibilityFamily = manifest.find(family => family.key === 'compatibility-placeholder-family');
    const overviewRoutePair = threeSignalDesk?.routePairs.find(routePair => routePair.key === 'overview-desk');
    const eventsAliasRoutePair = compatibilityFamily?.routePairs.find(routePair => routePair.key === 'events-alias');

    expect(overviewRoutePair).toBeTruthy();
    expect(eventsAliasRoutePair).toBeTruthy();

    const comparison = {
      pass: true,
      missingSelectors: [],
      missingTexts: [],
      missingActions: []
    };
    const overviewPayload = buildParityResultPayload({
      familyKey: 'three-signal-desk',
      routePair: overviewRoutePair,
      resolvedPair: overviewRoutePair,
      nextSnapshot: {
        finalUrl: 'http://127.0.0.1:4200/overview',
        html: '<main><h1>Overview</h1><button>Open workbench</button></main>'
      },
      referenceSnapshot: {
        finalUrl: 'http://127.0.0.1:4301/overview',
        html: '<main><h1>Overview</h1><button>Open workbench</button></main>'
      },
      nextContract: {
        selectors: ['main'],
        texts: ['Overview'],
        actions: ['Open workbench']
      },
      referenceContract: {
        selectors: ['main'],
        texts: ['Overview'],
        actions: ['Open workbench']
      },
      comparison,
      nextScreenshotPath: '/tmp/next.png',
      referenceScreenshotPath: '/tmp/angular.png',
      diffScreenshotPath: '/tmp/diff.png'
    });
    const eventsAliasPayload = buildParityResultPayload({
      familyKey: 'compatibility-placeholder-family',
      routePair: eventsAliasRoutePair,
      resolvedPair: eventsAliasRoutePair,
      nextSnapshot: {
        finalUrl: 'http://127.0.0.1:4200/events',
        html: '<main><h1>Events</h1></main>'
      },
      referenceSnapshot: {
        finalUrl: 'http://127.0.0.1:4301/log/manage',
        html: '<main><h1>Logs</h1></main>'
      },
      nextContract: {
        selectors: ['main'],
        texts: ['Events'],
        actions: []
      },
      referenceContract: {
        selectors: ['main'],
        texts: ['Logs'],
        actions: []
      },
      comparison
    });
    const overviewArtifactSummary = JSON.parse(JSON.stringify(overviewPayload));
    const eventsAliasArtifactSummary = JSON.parse(JSON.stringify(eventsAliasPayload));

    expect(overviewArtifactSummary.routeParitySpec).toMatchObject({
      key: 'overview-home',
      archetype: 'dashboard-home'
    });
    expect(overviewArtifactSummary.routeParitySpec.mustMatchRegions).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'header', expectation: 'present' })])
    );
    expect(overviewArtifactSummary.next.screenshotPath).toBe('/tmp/next.png');
    expect(overviewArtifactSummary.reference.screenshotPath).toBe('/tmp/angular.png');
    expect(overviewArtifactSummary.diffScreenshotPath).toBe('/tmp/diff.png');
    expect(eventsAliasArtifactSummary.routeParitySpec).toBeNull();
  });

  it('aggregates representative RouteParitySpec coverage for multi-route harness outputs', () => {
    const runPlan = buildParityRunPlan(manifest, {
      familyKey: 'three-signal-desk',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(buildRepresentativeRouteParityCoverage(runPlan)).toEqual({
      totalTargetCount: 5,
      exercisedRepresentativeCount: 2,
      exercisedRepresentativeKeys: ['overview-home', 'otlp-center'],
      exercisedRepresentativeArchetypes: ['dashboard-home', 'explorer-workbench'],
      representativeBaselines: [
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'overview-desk',
          routeParitySpecKey: 'overview-home',
          archetype: 'dashboard-home',
          artifactSummaryPath: null
        },
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'otlp-center-desk',
          routeParitySpecKey: 'otlp-center',
          archetype: 'explorer-workbench',
          artifactSummaryPath: null
        }
      ],
      nonRepresentativeRoutePairs: [
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'log-manage-desk',
          artifactSummaryPath: null
        },
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'trace-manage-desk',
          artifactSummaryPath: null
        },
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'otlp-metrics-console',
          artifactSummaryPath: null
        }
      ]
    });
  });

  it('builds a saved aggregate artifact index payload for live parity runs', () => {
    const runPlan = buildParityRunPlan(manifest, {
      familyKey: 'three-signal-desk',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });
    const [overviewTarget, logManageTarget] = runPlan;

    expect(resolveParityArtifactIndexPath('/tmp/hertzbeat-parity', { familyKey: 'three-signal-desk' })).toBe(
      '/tmp/hertzbeat-parity/parity-artifact-index-all-three-signal-desk-all.json'
    );

    expect(
      buildParityArtifactIndexPayload({
        milestone: null,
        familyKey: 'three-signal-desk',
        routeKey: null,
        results: [
          {
            ...overviewTarget,
            family: overviewTarget.familyKey,
            routePair: overviewTarget.routePairKey,
            artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/summary.json',
            next: {
              screenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/next.png'
            },
            reference: {
              screenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/angular.png'
            },
            diffScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/diff.png'
          },
          {
            ...logManageTarget,
            family: logManageTarget.familyKey,
            routePair: logManageTarget.routePairKey,
            artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/summary.json',
            next: {
              screenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/next.png'
            },
            reference: {
              screenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/angular.png'
            },
            diffScreenshotPath: null
          }
        ]
      })
    ).toEqual({
      milestone: null,
      family: 'three-signal-desk',
      route: null,
      representativeRouteParityCoverage: {
        totalTargetCount: 2,
        exercisedRepresentativeCount: 1,
        exercisedRepresentativeKeys: ['overview-home'],
        exercisedRepresentativeArchetypes: ['dashboard-home'],
        representativeBaselines: [
          {
            familyKey: 'three-signal-desk',
            routePairKey: 'overview-desk',
            routeParitySpecKey: 'overview-home',
            archetype: 'dashboard-home',
            artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/summary.json'
          }
        ],
        nonRepresentativeRoutePairs: [
          {
            familyKey: 'three-signal-desk',
            routePairKey: 'log-manage-desk',
            artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/summary.json'
          }
        ]
      },
      familyVerificationCommands: [overviewTarget.familyVerificationCommand],
      familyVerificationChecklist: [
        {
          familyKey: 'three-signal-desk',
          familyParityOwner: overviewTarget.familyParityOwner,
          familyVerificationCommand: overviewTarget.familyVerificationCommand
        }
      ],
      verificationCommands: [
        overviewTarget.minimumVerificationCommand,
        logManageTarget.minimumVerificationCommand
      ],
      routeVerificationChecklist: [
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'overview-desk',
          minimumVerificationCommand: overviewTarget.minimumVerificationCommand
        },
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'log-manage-desk',
          minimumVerificationCommand: logManageTarget.minimumVerificationCommand
        }
      ],
      routeArtifacts: [
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'overview-desk',
          routeParitySpecKey: 'overview-home',
          artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/summary.json',
          nextScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/next.png',
          referenceScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/angular.png',
          diffScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/overview-desk/diff.png',
          minimumVerificationCommand: overviewTarget.minimumVerificationCommand,
          familyVerificationCommand: overviewTarget.familyVerificationCommand
        },
        {
          familyKey: 'three-signal-desk',
          routePairKey: 'log-manage-desk',
          routeParitySpecKey: null,
          artifactSummaryPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/summary.json',
          nextScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/next.png',
          referenceScreenshotPath: '/tmp/hertzbeat-parity/three-signal-desk/log-manage-desk/angular.png',
          diffScreenshotPath: null,
          minimumVerificationCommand: logManageTarget.minimumVerificationCommand,
          familyVerificationCommand: logManageTarget.familyVerificationCommand
        }
      ]
    });
  });
});
