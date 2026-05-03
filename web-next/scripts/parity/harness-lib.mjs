import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAngularReferenceStubPayload } from './angular-reference-server-lib.mjs';

export function normalizeContractText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeParitySlug(value = '') {
  return String(value)
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function resolveParityArtifactDir(providedDir = process.env.PARITY_ARTIFACT_DIR) {
  return providedDir ? path.resolve(providedDir) : path.join(os.tmpdir(), 'hertzbeat-parity');
}

export function buildParityArtifactPaths(artifactRoot, familyKey, routeKey) {
  const familySlug = sanitizeParitySlug(familyKey);
  const routeSlug = sanitizeParitySlug(routeKey);
  const pairDir = path.join(path.resolve(artifactRoot), familySlug, routeSlug);

  return {
    pairDir,
    nextScreenshotPath: path.join(pairDir, 'next.png'),
    referenceScreenshotPath: path.join(pairDir, 'angular.png'),
    diffScreenshotPath: path.join(pairDir, 'diff.png'),
    nextCaptureDebugPath: path.join(pairDir, 'next-capture-debug.json'),
    referenceCaptureDebugPath: path.join(pairDir, 'reference-capture-debug.json'),
    routePhaseTracePath: path.join(pairDir, 'route-phase-trace.json'),
    summaryPath: path.join(pairDir, `${sanitizeParitySlug(`${familyKey}-${routeKey}`)}.json`)
  };
}

export function appendParityPhaseTrace(
  tracePath,
  marker,
  {
    existsSyncImpl = existsSync,
    mkdirSyncImpl = mkdirSync,
    readFileSyncImpl = readFileSync,
    writeFileSyncImpl = writeFileSync
  } = {}
) {
  const nextMarker = {
    at: new Date().toISOString(),
    ...marker
  };
  let markers = [];

  if (existsSyncImpl(tracePath)) {
    try {
      const existing = JSON.parse(readFileSyncImpl(tracePath, 'utf8'));
      if (Array.isArray(existing?.markers)) {
        markers = existing.markers;
      }
    } catch {
      markers = [];
    }
  }

  const payload = {
    currentPhase: nextMarker.phase ?? null,
    markers: [...markers, nextMarker]
  };

  mkdirSyncImpl(path.dirname(tracePath), { recursive: true });
  writeFileSyncImpl(tracePath, JSON.stringify(payload, null, 2));

  return payload;
}

export function resolveParityArtifactIndexPath(
  artifactRoot,
  { milestone = null, familyKey = null, routeKey = null } = {}
) {
  return path.join(
    path.resolve(artifactRoot),
    `${sanitizeParitySlug(`parity-artifact-index-${milestone ?? 'all'}-${familyKey ?? 'all'}-${routeKey ?? 'all'}`)}.json`
  );
}

export function resolveBrowserReadySelector(contract) {
  const selectors = contract.primarySelectors.filter(Boolean);
  const sharedSelector = selectors.find(selector => !selector.startsWith('[data-'));
  return sharedSelector || selectors[0] || 'body';
}

export function resolveSurfaceBrowserReadySelectors(contract, surfaceLabel = 'reference') {
  if (surfaceLabel === 'next') {
    const nextReadySelectors = (contract.nextReadySelectors || []).filter(Boolean);
    if (nextReadySelectors.length > 0) {
      return nextReadySelectors;
    }
  }

  if (surfaceLabel === 'reference') {
    const referenceReadySelectors = (contract.referenceReadySelectors || []).filter(Boolean);
    if (referenceReadySelectors.length > 0) {
      return referenceReadySelectors;
    }
  }

  return [resolveBrowserReadySelector(contract)];
}

export function resolveSurfaceBrowserReadySelector(contract, surfaceLabel = 'reference') {
  return resolveSurfaceBrowserReadySelectors(contract, surfaceLabel)[0];
}

export function resolveSurfacePostLoadActions(contract, surfaceLabel = 'reference') {
  const key = surfaceLabel === 'next' ? 'nextPostLoadActions' : 'referencePostLoadActions';
  const actions = Array.isArray(contract?.[key]) ? contract[key] : [];

  return actions
    .filter(action => action?.kind === 'click' && typeof action?.selector === 'string' && action.selector.trim() !== '')
    .map(action => ({
      kind: 'click',
      selector: action.selector,
      noWaitAfter: action.noWaitAfter === true,
      waitAfterMs: Number.isFinite(action.waitAfterMs) ? Number(action.waitAfterMs) : 0
    }));
}

export function resolveParityReadySelectorProbeTimeoutMs(browserReadyTimeoutMs = 45000) {
  const normalized = Number.isFinite(browserReadyTimeoutMs) ? browserReadyTimeoutMs : 45000;
  return Math.max(250, Math.min(2000, Math.floor(normalized / 12)));
}

export function buildParityScreenshotSuppressionCss(surfaceLabel = 'reference') {
  if (surfaceLabel !== 'next') {
    return '';
  }

  const selectors = ['nextjs-portal', '[data-next-badge-root]', '[data-next-mark]', 'next-route-announcer'];
  return `${selectors.join(', ')} { display: none !important; visibility: hidden !important; opacity: 0 !important; }`;
}

export function resolveSurfaceScreenshotOptions({ artifactPath, surfaceLabel = 'reference', routePair = {} }) {
  const hasPostLoadActions = resolveSurfacePostLoadActions(routePair, surfaceLabel).length > 0;
  const surfaceScreenshotMode =
    surfaceLabel === 'next' ? routePair.nextScreenshotMode : routePair.referenceScreenshotMode;
  const screenshotMode = surfaceScreenshotMode || routePair.screenshotMode;
  const useViewportCapture =
    screenshotMode === 'viewport' || (!screenshotMode && surfaceLabel === 'reference' && hasPostLoadActions);

  return {
    path: artifactPath,
    fullPage: !useViewportCapture,
    ...(useViewportCapture ? { animations: 'disabled' } : {})
  };
}

export function resolveParityRouteLocale(routePair = {}) {
  return routePair?.locale || process.env.PARITY_LOCALE || 'en-US';
}

export function stripParityDisplayLabelParams(routePath = '', baseUrl = 'http://127.0.0.1', depth = 0) {
  if (!routePath || depth > 3) {
    return routePath;
  }

  const rawRoutePath = String(routePath);
  let url;
  try {
    url = new URL(rawRoutePath, baseUrl);
  } catch {
    return routePath;
  }

  url.searchParams.delete('returnLabel');

  const returnTo = url.searchParams.get('returnTo');
  if (returnTo) {
    url.searchParams.set('returnTo', stripParityDisplayLabelParams(returnTo, baseUrl, depth + 1));
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(rawRoutePath) ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

export function buildParityBootstrapWarmupPlan({
  surfaceLabel = 'reference',
  baseUrl,
  routePath,
  routePair
} = {}) {
  if (surfaceLabel !== 'next' || !baseUrl || !routePath) {
    return null;
  }

  const routeUrl = new URL(stripParityDisplayLabelParams(routePath, baseUrl), String(baseUrl)).toString();
  const routeLocale = resolveParityRouteLocale(routePair);
  const i18nUrl = new URL(`/hb-i18n/${routeLocale}`, String(baseUrl)).toString();

  return {
    timeoutMs: 180000,
    urls: [routeUrl, i18nUrl]
  };
}

function buildParityJsonStub(payload, requestMethod = 'GET') {
  return {
    status: 200,
    contentType: 'application/json',
    body: requestMethod === 'HEAD' ? '' : JSON.stringify(payload)
  };
}

function parseParityNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveTraceRichDemoFixture(seedContext = {}, requestUrl) {
  const fallbackUrl = requestUrl instanceof URL ? requestUrl : new URL(String(requestUrl), 'http://127.0.0.1');
  const deepLinkUrl = seedContext.traceManageDeepLinkRoute
    ? new URL(seedContext.traceManageDeepLinkRoute, fallbackUrl.origin)
    : fallbackUrl;
  const requestSearch = fallbackUrl.searchParams;
  const deepLinkSearch = deepLinkUrl.searchParams;
  const requestPath = fallbackUrl.pathname;
  const pathTraceIdMatch = requestPath.match(/^\/api\/traces\/([^/]+)(?:\/|$)/);
  const pathTraceIdCandidate = pathTraceIdMatch?.[1] && !['list', 'stats'].includes(pathTraceIdMatch[1]) ? pathTraceIdMatch[1] : null;
  const traceId = decodeURIComponent(pathTraceIdCandidate || requestSearch.get('traceId') || deepLinkSearch.get('traceId') || 'trace-ui-rich-demo');
  const serviceName = requestSearch.get('serviceName') || deepLinkSearch.get('serviceName') || 'checkout-service';
  const serviceNamespace = requestSearch.get('serviceNamespace') || deepLinkSearch.get('serviceNamespace') || 'storefront';
  const environment = requestSearch.get('environment') || deepLinkSearch.get('environment') || 'dev';
  const startMs = parseParityNumber(requestSearch.get('start') || deepLinkSearch.get('start'), Date.now() - 10 * 60 * 1000);
  const endMs = parseParityNumber(requestSearch.get('end') || deepLinkSearch.get('end'), startMs + 10 * 60 * 1000);
  const traceStartMs = Math.max(startMs, Math.min(endMs - 2_000, startMs + 3 * 60 * 1000));
  const rootDurationMs = 1_250;
  const rootSpanId = `${traceId}-root`;
  const dbSpanId = `${traceId}-db`;
  const cacheSpanId = `${traceId}-cache`;
  const resourceAttributes = {
    'service.namespace': serviceNamespace,
    'deployment.environment.name': environment
  };
  const spans = [
    {
      traceId,
      spanId: rootSpanId,
      parentSpanId: null,
      spanName: 'POST /checkout',
      serviceName,
      status: 'ERROR',
      spanKind: 'SERVER',
      durationNanos: rootDurationMs * 1_000_000,
      startTime: traceStartMs,
      resourceAttributes,
      spanAttributes: {
        'http.method': 'POST',
        'http.route': '/checkout'
      },
      events: [],
      links: []
    },
    {
      traceId,
      spanId: dbSpanId,
      parentSpanId: rootSpanId,
      spanName: 'db.query',
      serviceName,
      status: 'ERROR',
      spanKind: 'CLIENT',
      durationNanos: 420 * 1_000_000,
      startTime: traceStartMs + 55,
      resourceAttributes,
      spanAttributes: {
        'db.system': 'mysql',
        'db.statement': 'SELECT * FROM orders WHERE id = ?'
      },
      events: [
        {
          name: 'exception',
          timeUnixNano: (traceStartMs + 220) * 1_000_000,
          attributes: {
            'exception.type': 'TimeoutError',
            'exception.message': 'query exceeded 400ms'
          }
        }
      ],
      links: []
    },
    {
      traceId,
      spanId: cacheSpanId,
      parentSpanId: rootSpanId,
      spanName: 'redis.get',
      serviceName,
      status: 'OK',
      spanKind: 'CLIENT',
      durationNanos: 80 * 1_000_000,
      startTime: traceStartMs + 12,
      resourceAttributes,
      spanAttributes: {
        'db.system': 'redis',
        'cache.hit': 'false'
      },
      events: [],
      links: []
    }
  ];

  return {
    traceId,
    rootSpanId,
    serviceName,
    serviceNamespace,
    environment,
    startMs,
    endMs,
    latestObservedAt: endMs,
    traceSummary: {
      traceId,
      rootSpanId,
      rootSpanName: 'POST /checkout',
      serviceName,
      serviceNamespace,
      durationNanos: rootDurationMs * 1_000_000,
      status: 'ERROR',
      startTime: traceStartMs,
      errorSpanCount: 1
    },
    detail: {
      traceId,
      rootSpanId,
      serviceName,
      serviceNamespace,
      rootSpanName: 'POST /checkout',
      durationNanos: rootDurationMs * 1_000_000,
      status: 'ERROR',
      startTime: traceStartMs,
      errorSpanCount: 1,
      resourceAttributes: {
        ...resourceAttributes,
        'service.name': serviceName
      },
      spans
    },
    spans,
    relatedLogs: [
      {
        timeUnixNano: (traceStartMs + 240) * 1_000_000,
        severityText: 'ERROR',
        severityNumber: 17,
        body: 'checkout query exceeded timeout budget',
        traceId,
        spanId: dbSpanId,
        resource: {
          'service.name': serviceName,
          ...resourceAttributes
        },
        attributes: {
          'log.logger': 'checkout.trace',
          'exception.type': 'TimeoutError'
        }
      }
    ]
  };
}

export function buildParityApiStubResponse({
  surfaceLabel = 'reference',
  routePair,
  requestUrl,
  requestMethod = 'GET',
  seedContext = {}
}) {
  const normalizedMethod = String(requestMethod || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(normalizedMethod)) {
    return null;
  }

  const url = requestUrl instanceof URL ? requestUrl : new URL(String(requestUrl), 'http://127.0.0.1');
  const pathname = url.pathname;

  if (routePair?.locale && pathname === '/api/config/system') {
    return buildParityJsonStub(
      {
        code: 0,
        data: {
          locale: routePair.locale,
          theme: 'dark-ops',
          timeZoneId: 'Asia/Shanghai'
        }
      },
      normalizedMethod
    );
  }

  if (pathname === '/api/alert/sse/subscribe' || pathname === '/api/manager/sse/subscribe') {
    return {
      status: 204,
      body: ''
    };
  }

  const entityFixtureEnabled =
    (surfaceLabel === 'next' && routePair?.nextApiStubKey === 'entity-fixture')
    || (surfaceLabel === 'reference' && routePair?.referenceApiStubKey === 'entity-fixture');

  if (entityFixtureEnabled) {
    const payload = buildAngularReferenceStubPayload(url);
    if (payload) {
      return buildParityJsonStub(payload, normalizedMethod);
    }
  }

  const otlpCenterEnabled =
    (surfaceLabel === 'next' && routePair?.nextApiStubKey === 'otlp-center')
    || (surfaceLabel === 'reference' && routePair?.referenceApiStubKey === 'otlp-center');

  if (otlpCenterEnabled && pathname.startsWith('/api/ingestion/otlp/')) {
    const payload = buildAngularReferenceStubPayload(url);
    if (payload) {
      return buildParityJsonStub(payload, normalizedMethod);
    }
  }

  const traceRichDemoEnabled =
    (surfaceLabel === 'next' && routePair?.nextApiStubKey === 'trace-rich-demo')
    || (surfaceLabel === 'reference' && routePair?.referenceApiStubKey === 'trace-rich-demo');

  if (!traceRichDemoEnabled) {
    return null;
  }

  const fixture = resolveTraceRichDemoFixture(seedContext, url);

  if (pathname === '/api/traces/stats/overview') {
    return buildParityJsonStub(
      {
        code: 0,
        data: {
          totalTraceCount: 1,
          errorTraceCount: 1,
          latestObservedAt: fixture.latestObservedAt,
          hasActiveTrace: true
        }
      },
      normalizedMethod
    );
  }

  if (pathname === '/api/traces/list') {
    return buildParityJsonStub(
      {
        code: 0,
        data: {
          content: [fixture.traceSummary],
          totalElements: 1,
          pageIndex: parseParityNumber(url.searchParams.get('pageIndex'), 0),
          pageSize: parseParityNumber(url.searchParams.get('pageSize'), 8)
        }
      },
      normalizedMethod
    );
  }

  if (pathname === `/api/traces/${encodeURIComponent(fixture.traceId)}` || pathname === `/api/traces/${fixture.traceId}`) {
    return buildParityJsonStub(
      {
        code: 0,
        data: fixture.detail
      },
      normalizedMethod
    );
  }

  if (pathname === `/api/traces/${encodeURIComponent(fixture.traceId)}/spans` || pathname === `/api/traces/${fixture.traceId}/spans`) {
    return buildParityJsonStub(
      {
        code: 0,
        data: fixture.spans
      },
      normalizedMethod
    );
  }

  if (pathname === '/api/logs/list') {
    return buildParityJsonStub(
      {
        code: 0,
        data: {
          content: fixture.relatedLogs,
          totalElements: fixture.relatedLogs.length,
          pageIndex: parseParityNumber(url.searchParams.get('pageIndex'), 0),
          pageSize: parseParityNumber(url.searchParams.get('pageSize'), fixture.relatedLogs.length || 5)
        }
      },
      normalizedMethod
    );
  }

  return null;
}

export function resolveScreenshotDiffCommand(spawnSyncImpl = spawnSync) {
  const candidates = [
    {
      command: 'magick',
      argsPrefix: ['compare', '-metric', 'AE']
    },
    {
      command: 'compare',
      argsPrefix: ['-metric', 'AE']
    }
  ];

  for (const candidate of candidates) {
    const result = spawnSyncImpl(candidate.command, ['-version'], {
      encoding: 'utf8'
    });

    if (result?.status === 0) {
      return candidate;
    }
  }

  return null;
}

export function withParityTimeout(task, { timeoutMs = 5000, label = 'parity task' } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(task).then(
      value => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export function maybeWriteScreenshotDiff({
  referenceScreenshotPath,
  nextScreenshotPath,
  diffScreenshotPath,
  spawnSyncImpl = spawnSync
}) {
  const diffCommand = resolveScreenshotDiffCommand(spawnSyncImpl);
  if (!diffCommand) {
    return null;
  }

  const result = spawnSyncImpl(
    diffCommand.command,
    [...diffCommand.argsPrefix, referenceScreenshotPath, nextScreenshotPath, diffScreenshotPath],
    {
      encoding: 'utf8'
    }
  );

  if (result?.error) {
    return null;
  }

  return existsSync(diffScreenshotPath) ? diffScreenshotPath : null;
}

export function selectorExistsInHtml(html, selector) {
  if (!selector) {
    return false;
  }

  if (selector.startsWith('[') && selector.endsWith(']')) {
    const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (!attrMatch) {
      return false;
    }
    const [, attribute, value] = attrMatch;
    return typeof value === 'string' ? html.includes(`${attribute}="${value}"`) : html.includes(attribute);
  }

  if (/^[a-z][a-z0-9-]*$/i.test(selector)) {
    return new RegExp(`<${selector}(\\s|>)`, 'i').test(html);
  }

  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    return new RegExp(`class=["'][^"']*\\b${className}\\b`, 'i').test(html);
  }

  return normalizeContractText(html).includes(normalizeContractText(selector));
}

export function collectContractSnapshot(html, contract) {
  const normalizedHtml = normalizeContractText(html);

  return {
    selectors: contract.primarySelectors.filter(selector => selectorExistsInHtml(html, selector)),
    texts: (contract.textSnippets || []).filter(text => normalizedHtml.includes(normalizeContractText(text))),
    actions: (contract.actionLabels || []).filter(action => normalizedHtml.includes(normalizeContractText(action)))
  };
}

export function detectParityFinalUrlProblem({ expectedRoute, finalUrl, surfaceLabel }) {
  if (!finalUrl) {
    return `${surfaceLabel} did not produce a final URL`;
  }

  const resolvedUrl = finalUrl instanceof URL ? finalUrl : new URL(finalUrl);
  if (resolvedUrl.pathname === '/exception/404' && expectedRoute !== '/exception/404') {
    return `${surfaceLabel} resolved to /exception/404 instead of ${expectedRoute}`;
  }

  return null;
}

export function compareParityContracts(referenceSnapshot, candidateSnapshot) {
  const missingSelectors = referenceSnapshot.selectors.filter(selector => !candidateSnapshot.selectors.includes(selector));
  const missingTexts = referenceSnapshot.texts.filter(text => !candidateSnapshot.texts.includes(text));
  const missingActions = referenceSnapshot.actions.filter(action => !candidateSnapshot.actions.includes(action));

  return {
    pass: missingSelectors.length === 0 && missingTexts.length === 0 && missingActions.length === 0,
    missingSelectors,
    missingTexts,
    missingActions
  };
}

export function buildParityResultPayload({
  familyKey,
  routePair,
  resolvedPair,
  nextSnapshot,
  referenceSnapshot,
  nextContract,
  referenceContract,
  comparison,
  nextScreenshotPath = null,
  referenceScreenshotPath = null,
  diffScreenshotPath = null
}) {
  return {
    family: familyKey,
    routePair: routePair.key,
    routeParitySpec: routePair.routeParitySpec ?? null,
    next: {
      route: resolvedPair.nextRoute,
      finalUrl: nextSnapshot.finalUrl,
      normalizedTextPreview: normalizeContractText(nextSnapshot.html).slice(0, 240),
      contract: nextContract,
      screenshotPath: nextScreenshotPath
    },
    reference: {
      route: resolvedPair.referenceRoute,
      finalUrl: referenceSnapshot.finalUrl,
      normalizedTextPreview: normalizeContractText(referenceSnapshot.html).slice(0, 240),
      contract: referenceContract,
      screenshotPath: referenceScreenshotPath
    },
    diffScreenshotPath,
    comparison,
    minimumVerificationCommand: routePair.minimumVerificationCommand
  };
}

function normalizeRepresentativeCoverageEntry(entry = {}) {
  return {
    familyKey: entry.familyKey ?? entry.family ?? null,
    routePairKey: entry.routePairKey ?? entry.routePair ?? null,
    routeParitySpec: entry.routeParitySpec ?? null,
    artifactSummaryPath: entry.artifactSummaryPath ?? null
  };
}

export function buildRepresentativeRouteParityCoverage(entries = []) {
  const representativeBaselines = [];
  const nonRepresentativeRoutePairs = [];

  for (const entry of entries) {
    const normalizedEntry = normalizeRepresentativeCoverageEntry(entry);
    if (!normalizedEntry.familyKey || !normalizedEntry.routePairKey) {
      continue;
    }

    if (normalizedEntry.routeParitySpec?.key) {
      representativeBaselines.push({
        familyKey: normalizedEntry.familyKey,
        routePairKey: normalizedEntry.routePairKey,
        routeParitySpecKey: normalizedEntry.routeParitySpec.key,
        archetype: normalizedEntry.routeParitySpec.archetype,
        artifactSummaryPath: normalizedEntry.artifactSummaryPath
      });
      continue;
    }

    nonRepresentativeRoutePairs.push({
      familyKey: normalizedEntry.familyKey,
      routePairKey: normalizedEntry.routePairKey,
      artifactSummaryPath: normalizedEntry.artifactSummaryPath
    });
  }

  return {
    totalTargetCount: representativeBaselines.length + nonRepresentativeRoutePairs.length,
    exercisedRepresentativeCount: representativeBaselines.length,
    exercisedRepresentativeKeys: representativeBaselines.map(entry => entry.routeParitySpecKey),
    exercisedRepresentativeArchetypes: [...new Set(representativeBaselines.map(entry => entry.archetype))],
    representativeBaselines,
    nonRepresentativeRoutePairs
  };
}

export function buildParityArtifactIndexPayload({ milestone = null, familyKey = null, routeKey = null, results = [] } = {}) {
  const routeVerificationChecklist = results
    .map(result => {
      const normalizedEntry = normalizeRepresentativeCoverageEntry(result);
      if (!normalizedEntry.familyKey || !normalizedEntry.routePairKey || !result.minimumVerificationCommand) {
        return null;
      }

      return {
        familyKey: normalizedEntry.familyKey,
        routePairKey: normalizedEntry.routePairKey,
        minimumVerificationCommand: result.minimumVerificationCommand
      };
    })
    .filter(Boolean);
  const familyVerificationChecklist = [];

  for (const result of results) {
    const normalizedEntry = normalizeRepresentativeCoverageEntry(result);
    if (!normalizedEntry.familyKey || !result.familyVerificationCommand) {
      continue;
    }

    const existingEntry = familyVerificationChecklist.find(
      entry =>
        entry.familyKey === normalizedEntry.familyKey &&
        entry.familyVerificationCommand === result.familyVerificationCommand
    );
    if (existingEntry) {
      continue;
    }

    familyVerificationChecklist.push({
      familyKey: normalizedEntry.familyKey,
      familyParityOwner: result.familyParityOwner ?? null,
      familyVerificationCommand: result.familyVerificationCommand
    });
  }

  return {
    milestone,
    family: familyKey ?? null,
    route: routeKey ?? null,
    representativeRouteParityCoverage: buildRepresentativeRouteParityCoverage(results),
    familyVerificationCommands: [...new Set(familyVerificationChecklist.map(entry => entry.familyVerificationCommand))],
    familyVerificationChecklist,
    verificationCommands: [...new Set(routeVerificationChecklist.map(entry => entry.minimumVerificationCommand))],
    routeVerificationChecklist,
    routeArtifacts: results
      .map(result => {
        const normalizedEntry = normalizeRepresentativeCoverageEntry(result);
        if (!normalizedEntry.familyKey || !normalizedEntry.routePairKey) {
          return null;
        }

        return {
          familyKey: normalizedEntry.familyKey,
          routePairKey: normalizedEntry.routePairKey,
          routeParitySpecKey: normalizedEntry.routeParitySpec?.key ?? null,
          artifactSummaryPath: normalizedEntry.artifactSummaryPath,
          nextScreenshotPath: result.next?.screenshotPath ?? null,
          referenceScreenshotPath: result.reference?.screenshotPath ?? null,
          diffScreenshotPath: result.diffScreenshotPath ?? null,
          minimumVerificationCommand: result.minimumVerificationCommand ?? null,
          familyVerificationCommand: result.familyVerificationCommand ?? null
        };
      })
      .filter(Boolean)
  };
}
