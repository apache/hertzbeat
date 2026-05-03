import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildParityRunPlan, buildParityVerificationPlan } from './harness-plan.mjs';
import { resolveParityTargets } from './harness-targets.mjs';
import {
  appendParityPhaseTrace,
  buildParityApiStubResponse,
  buildParityBootstrapWarmupPlan,
  buildParityScreenshotSuppressionCss,
  buildParityArtifactIndexPayload,
  buildParityResultPayload,
  buildParityArtifactPaths,
  buildRepresentativeRouteParityCoverage,
  collectContractSnapshot,
  compareParityContracts,
  detectParityFinalUrlProblem,
  maybeWriteScreenshotDiff,
  normalizeContractText,
  resolveParityArtifactIndexPath,
  resolveParityRouteLocale,
  resolveSurfaceBrowserReadySelectors,
  resolveSurfaceBrowserReadySelector,
  resolveSurfaceScreenshotOptions,
  resolveSurfacePostLoadActions,
  resolveParityReadySelectorProbeTimeoutMs,
  resolveParityArtifactDir,
  stripParityDisplayLabelParams,
  withParityTimeout
} from './harness-lib.mjs';
import { applySeedContextToRoutePair, resolveSeedContext, routePairNeedsSeedContext } from './seed-state-lib.mjs';
import { ensureParityRuntimes } from './runtime.mjs';
import { loginWithPassword } from '../release-shell-smoke.mjs';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const webNextDir = path.resolve(scriptDir, '..', '..');
const manifestPath = path.join(webNextDir, 'lib', 'parity', 'route-manifest.json');

function parseCliArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const nextValue = argv[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      options[key] = nextValue;
      index += 1;
    } else {
      options[key] = 'true';
    }
  }

  return options;
}

function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function routePairCanSkipExternalSeed(routePair) {
  return routePair?.seedState === 'trace-rich-demo'
    && routePair?.nextApiStubKey === 'trace-rich-demo'
    && routePair?.referenceApiStubKey === 'trace-rich-demo';
}

function parseMilestone(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new Error(`Invalid parity milestone: ${value}`);
  }

  return parsed;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  }

  return {
    finalUrl: response.url,
    html: await response.text()
  };
}

async function resolvePlaywrightModule() {
  try {
    return await import('playwright');
  } catch {
    try {
      return await import('@playwright/test');
    } catch {
      return null;
    }
  }
}

async function warmParityBootstrap({
  baseUrl,
  routePath,
  routePair,
  surfaceLabel
}) {
  const warmupPlan = buildParityBootstrapWarmupPlan({
    baseUrl,
    routePath,
    routePair,
    surfaceLabel
  });

  if (!warmupPlan) {
    return;
  }

  for (const url of warmupPlan.urls) {
    const response = await fetch(url, {
      headers: {
        accept: url.includes('/hb-i18n/') ? 'application/json,text/plain,*/*' : 'text/html,application/xhtml+xml'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(warmupPlan.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`parity bootstrap warmup failed for ${url}: HTTP ${response.status}`);
    }

    await response.arrayBuffer();
  }
}

async function waitForAnySurfaceBrowserReadySelector(
  page,
  routePair,
  surfaceLabel,
  browserReadyTimeoutMs,
  { readySelectorProbes = [], annotatePhase = null } = {}
) {
  const selectors = resolveSurfaceBrowserReadySelectors(routePair, surfaceLabel);
  const deadline = Date.now() + browserReadyTimeoutMs;
  const probeTimeoutMs = resolveParityReadySelectorProbeTimeoutMs(browserReadyTimeoutMs);
  let lastError = null;
  let attempt = 0;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      attempt += 1;
      const startedAt = Date.now();
      try {
        const visible = await withParityTimeout(page.locator(selector).first().isVisible(), {
          timeoutMs: probeTimeoutMs,
          label: `${surfaceLabel} ready probe ${selector}`
        });
        readySelectorProbes.push({
          selector,
          visible,
          attempt,
          elapsedMs: Date.now() - startedAt
        });
        if (readySelectorProbes.length > 40) {
          readySelectorProbes.shift();
        }
        if (visible) {
          return selector;
        }
      } catch (error) {
        lastError = error;
        readySelectorProbes.push({
          selector,
          visible: false,
          attempt,
          elapsedMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        });
        if (readySelectorProbes.length > 40) {
          readySelectorProbes.shift();
        }
        annotatePhase?.(`${surfaceLabel}-ready:probe-error`, {
          selector,
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    await page.waitForTimeout(250);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    `Timed out after ${browserReadyTimeoutMs}ms waiting for any ready selector on ${surfaceLabel}: ${selectors.join(', ')}`
  );
}

async function applySurfacePostLoadActions(page, routePair, surfaceLabel, annotatePhase = null) {
  const actions = resolveSurfacePostLoadActions(routePair, surfaceLabel);

  for (const [index, action] of actions.entries()) {
    annotatePhase?.(`${surfaceLabel}-post-load-action:start`, {
      index,
      kind: action.kind,
      selector: action.selector
    });

    try {
      if (action.kind === 'click') {
        await page.locator(action.selector).first().click({
          noWaitAfter: action.noWaitAfter,
          timeout: 5000
        });
      }

      if (action.waitAfterMs > 0) {
        await page.waitForTimeout(action.waitAfterMs);
      }

      annotatePhase?.(`${surfaceLabel}-post-load-action:complete`, {
        index,
        kind: action.kind,
        selector: action.selector
      });
    } catch (error) {
      annotatePhase?.(`${surfaceLabel}-post-load-action:error`, {
        index,
        kind: action.kind,
        selector: action.selector,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

async function buildCaptureDebugPayload({
  page,
  surfaceLabel,
  routePath,
  routePair,
  events,
  error,
  readySelectorProbes = []
}) {
  const readySelectors = resolveSurfaceBrowserReadySelectors(routePair, surfaceLabel);
  const selectorStates = readySelectors.map(selector => {
    const latestProbe = [...readySelectorProbes].reverse().find(entry => entry.selector === selector);
    return latestProbe
      ? {
          selector,
          visible: latestProbe.visible,
          elapsedMs: latestProbe.elapsedMs,
          attempt: latestProbe.attempt,
          error: latestProbe.error
        }
      : {
          selector,
          visible: false,
          error: 'selector was not probed before capture failure'
        };
  });

  let bodyPreview = null;
  try {
    bodyPreview = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200);
  } catch (bodyError) {
    bodyPreview = `BODY_ERROR:${bodyError instanceof Error ? bodyError.message : String(bodyError)}`;
  }

  return {
    surfaceLabel,
    routePath,
    currentUrl: page.url(),
    error: error instanceof Error ? error.message : String(error),
    readySelectors,
    selectorStates,
    readySelectorProbes,
    bodyPreview,
    events
  };
}

async function captureBrowserSnapshot({
  playwrightModule,
  baseUrl,
  routePath,
  routePair,
  artifactPath,
  debugPath = null,
  phaseTracePath = null,
  browserReadyTimeoutMs,
  surfaceLabel = 'reference',
  identifier,
  credential,
  seedContext = {}
}) {
  const sanitizedRoutePath = stripParityDisplayLabelParams(routePath, baseUrl);
  const navigationUrl = new URL(sanitizedRoutePath, baseUrl).toString();
  const annotatePhase = (phase, extra = {}) => {
    if (!phaseTracePath) {
      return null;
    }
    return appendParityPhaseTrace(phaseTracePath, {
      phase,
      surfaceLabel,
      routePath: sanitizedRoutePath,
      ...extra
    });
  };

  annotatePhase(`${surfaceLabel}-capture:entered`);
  await warmParityBootstrap({
    baseUrl,
    routePath: sanitizedRoutePath,
    routePair,
    surfaceLabel
  });
  annotatePhase(`${surfaceLabel}-bootstrap:complete`);

  const routeLocale = resolveParityRouteLocale(routePair);
  const browser = await playwrightModule.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: routeLocale,
    extraHTTPHeaders: {
      'Accept-Language': routeLocale
    }
  });
  const events = [];
  const readySelectorProbes = [];

  await context.addInitScript(({ theme, locale }) => {
    window.localStorage.setItem('theme', theme);
    window.localStorage.setItem('hb.lang', locale);
    window.localStorage.setItem('layout.lang', locale);
    document.documentElement.lang = locale;
  }, { theme: 'dark-ops', locale: routeLocale });

  if (routePair.authState === 'session') {
    annotatePhase(`${surfaceLabel}-auth:start`);
    const tokens = await loginWithPassword(baseUrl, identifier, credential, 0);
    annotatePhase(`${surfaceLabel}-auth:complete`);
    await context.addInitScript(
      ({ token, refreshToken, theme, locale }) => {
        window.localStorage.setItem('Authorization', token);
        window.localStorage.setItem('refresh-token', refreshToken);
        window.localStorage.setItem('theme', theme);
        window.localStorage.setItem('hb.lang', locale);
        window.localStorage.setItem('layout.lang', locale);
        document.documentElement.lang = locale;
      },
      { token: tokens.token, refreshToken: tokens.refreshToken, theme: 'dark-ops', locale: routeLocale }
    );
  }

  const page = await context.newPage();
  const pushEvent = entry => {
    if (events.length < 120) {
      events.push(entry);
    }
  };
  page.on('request', request => {
    pushEvent({
      kind: 'request',
      method: request.method(),
      url: request.url()
    });
  });
  page.on('response', response => {
    pushEvent({
      kind: 'response',
      status: response.status(),
      url: response.url()
    });
  });
  await page.route('**/api/**', async route => {
    const stubResponse = buildParityApiStubResponse({
      surfaceLabel,
      routePair,
      requestUrl: route.request().url(),
      requestMethod: route.request().method(),
      seedContext
    });

    if (stubResponse) {
      pushEvent({
        kind: 'stub',
        status: stubResponse.status ?? 200,
        url: route.request().url()
      });
      await route.fulfill(stubResponse);
      return;
    }

    await route.continue();
  });
  try {
    annotatePhase(`${surfaceLabel}-goto:start`);
    const response = await page.goto(navigationUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    annotatePhase(`${surfaceLabel}-goto:complete`);
    annotatePhase(`${surfaceLabel}-ready:start`);
    await waitForAnySurfaceBrowserReadySelector(page, routePair, surfaceLabel, browserReadyTimeoutMs, {
      readySelectorProbes,
      annotatePhase
    });
    annotatePhase(`${surfaceLabel}-ready:complete`);
    await applySurfacePostLoadActions(page, routePair, surfaceLabel, annotatePhase);
    await page.waitForTimeout(750);
    const screenshotSuppressionCss = buildParityScreenshotSuppressionCss(surfaceLabel);
    if (screenshotSuppressionCss) {
      annotatePhase(`${surfaceLabel}-screenshot-suppression:start`);
      await withParityTimeout(page.addStyleTag({
        content: screenshotSuppressionCss
      }), {
        timeoutMs: 5000,
        label: `${surfaceLabel} screenshot suppression style injection`
      });
      annotatePhase(`${surfaceLabel}-screenshot-suppression:complete`);
      await page.waitForTimeout(100);
    }
    annotatePhase(`${surfaceLabel}-screenshot:start`);
    await withParityTimeout(page.screenshot(resolveSurfaceScreenshotOptions({
      artifactPath,
      surfaceLabel,
      routePair
    })), {
      timeoutMs: 15000,
      label: `${surfaceLabel} page.screenshot()`
    });
    annotatePhase(`${surfaceLabel}-screenshot:complete`);
    annotatePhase(`${surfaceLabel}-content:start`);
    const html = await withParityTimeout(page.content(), {
      timeoutMs: 10000,
      label: `${surfaceLabel} page.content()`
    });
    annotatePhase(`${surfaceLabel}-content:complete`);
    const finalUrl = page.url();

    if (!response || !response.ok()) {
      throw new Error(`browser navigation failed for ${navigationUrl}: ${response?.status() ?? 'no response'}`);
    }

    return {
      finalUrl,
      html
    };
  } catch (error) {
    annotatePhase(`${surfaceLabel}-capture:error`, {
      error: error instanceof Error ? error.message : String(error)
    });
    if (debugPath) {
      writeArtifacts(
        debugPath,
        await buildCaptureDebugPayload({
          page,
          surfaceLabel,
          routePath: sanitizedRoutePath,
          routePair,
          events,
          error,
          readySelectorProbes
        })
      );
    }
    throw error;
  } finally {
    await withParityTimeout(context.close(), {
      timeoutMs: 5000,
      label: `${surfaceLabel} context.close()`
    }).catch(() => {});
    annotatePhase(`${surfaceLabel}-context:closed`);
    await withParityTimeout(browser.close(), {
      timeoutMs: 5000,
      label: `${surfaceLabel} browser.close()`
    }).catch(() => {});
    annotatePhase(`${surfaceLabel}-browser:closed`);
  }
}

function writeArtifacts(summaryPath, payload) {
  mkdirSync(path.dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(payload, null, 2));
  return summaryPath;
}

const cli = parseCliArgs(process.argv.slice(2));
const familyKey = cli.family || process.env.PARITY_FAMILY;
const routeKey = cli.route || process.env.PARITY_ROUTE;
const milestone = parseMilestone(cli.milestone || process.env.PARITY_MILESTONE);
const nextBaseUrl = process.env.PARITY_NEXT_BASE_URL || 'http://127.0.0.1:4200';
const referenceBaseUrl = process.env.PARITY_REFERENCE_BASE_URL || 'http://127.0.0.1:4301';
const identifier = process.env.PARITY_IDENTIFIER || 'admin';
const credential = process.env.PARITY_CREDENTIAL || 'hertzbeat';
const ensureRuntime = process.env.PARITY_ENSURE_RUNTIME !== 'false';
const browserReadyTimeoutMs = Number(process.env.PARITY_BROWSER_READY_TIMEOUT_MS || 45000);
const writeScreenshotDiff = process.env.PARITY_WRITE_SCREENSHOT_DIFF !== 'false';
const printTargetsOnly = cli['print-targets'] === 'true' || process.env.PARITY_PRINT_TARGETS === 'true';

try {
  const manifest = loadManifest();
  const runPlan = buildParityRunPlan(manifest, {
    milestone,
    familyKey,
    routeKey,
    nextBaseUrl,
    referenceBaseUrl
  });
  const verificationPlan = buildParityVerificationPlan(manifest, {
    milestone,
    familyKey,
    routeKey,
    nextBaseUrl,
    referenceBaseUrl
  });
  const representativeRouteParityCoverage = buildRepresentativeRouteParityCoverage(runPlan);
  const artifactRoot = resolveParityArtifactDir();
  const artifactIndexPath = resolveParityArtifactIndexPath(artifactRoot, { milestone, familyKey, routeKey });

  if (printTargetsOnly) {
    console.log(
      JSON.stringify(
        {
          milestone,
          family: familyKey ?? null,
          route: routeKey ?? null,
          parityOwners: verificationPlan.parityOwners,
          verificationCommands: verificationPlan.verificationCommands,
          verificationSteps: verificationPlan.verificationSteps,
          familyVerificationCommands: verificationPlan.familyVerificationCommands,
          familyVerificationSteps: verificationPlan.familyVerificationSteps,
          artifactIndexPath,
          representativeRouteParityCoverage,
          results: runPlan
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  if (ensureRuntime) {
    await ensureParityRuntimes({ nextBaseUrl, angularBaseUrl: referenceBaseUrl });
  }

  const targets = resolveParityTargets(manifest, { milestone, familyKey, routeKey });
  const playwrightModule = await resolvePlaywrightModule();
  const results = [];
  const seedContextCache = new Map();

  for (const { family, routePair: pair } of targets) {
    let seedContext = seedContextCache.get(pair.seedState);
    if (seedContext === undefined && routePairNeedsSeedContext(pair)) {
      seedContext = await resolveSeedContext({
        seedState: pair.seedState,
        authState: pair.authState,
        baseUrl: nextBaseUrl,
        identifier,
        credential,
        skipExternalSeed: routePairCanSkipExternalSeed(pair)
      });
      seedContextCache.set(pair.seedState, seedContext);
    } else if (seedContext === undefined) {
      seedContext = {};
      seedContextCache.set(pair.seedState, seedContext);
    }

    const resolvedPair = applySeedContextToRoutePair(pair, seedContext);
    const artifacts = buildParityArtifactPaths(artifactRoot, family.key, pair.key);
    mkdirSync(artifacts.pairDir, { recursive: true });
    appendParityPhaseTrace(artifacts.routePhaseTracePath, {
      phase: 'route-run:start',
      familyKey: family.key,
      routePairKey: pair.key
    });

    let nextSnapshot;
    let referenceSnapshot;
    let diffScreenshotPath = null;

    if (playwrightModule) {
      appendParityPhaseTrace(artifacts.routePhaseTracePath, {
        phase: 'next-capture:start',
        familyKey: family.key,
        routePairKey: pair.key
      });
      nextSnapshot = await captureBrowserSnapshot({
        playwrightModule,
        baseUrl: nextBaseUrl,
        routePath: resolvedPair.nextRoute,
        routePair: { ...resolvedPair, nextRoute: resolvedPair.nextRoute },
        artifactPath: artifacts.nextScreenshotPath,
        debugPath: artifacts.nextCaptureDebugPath,
        phaseTracePath: artifacts.routePhaseTracePath,
        browserReadyTimeoutMs,
        surfaceLabel: 'next',
        identifier,
        credential,
        seedContext
      });
      appendParityPhaseTrace(artifacts.routePhaseTracePath, {
        phase: 'next-capture:complete',
        familyKey: family.key,
        routePairKey: pair.key
      });
      appendParityPhaseTrace(artifacts.routePhaseTracePath, {
        phase: 'reference-capture:start',
        familyKey: family.key,
        routePairKey: pair.key
      });
      referenceSnapshot = await captureBrowserSnapshot({
        playwrightModule,
        baseUrl: referenceBaseUrl,
        routePath: resolvedPair.referenceRoute,
        routePair: { ...resolvedPair, referenceRoute: resolvedPair.referenceRoute },
        artifactPath: artifacts.referenceScreenshotPath,
        debugPath: artifacts.referenceCaptureDebugPath,
        phaseTracePath: artifacts.routePhaseTracePath,
        browserReadyTimeoutMs,
        surfaceLabel: 'reference',
        identifier,
        credential,
        seedContext
      });
      appendParityPhaseTrace(artifacts.routePhaseTracePath, {
        phase: 'reference-capture:complete',
        familyKey: family.key,
        routePairKey: pair.key
      });

      if (writeScreenshotDiff) {
        diffScreenshotPath = maybeWriteScreenshotDiff({
          referenceScreenshotPath: artifacts.referenceScreenshotPath,
          nextScreenshotPath: artifacts.nextScreenshotPath,
          diffScreenshotPath: artifacts.diffScreenshotPath
        });
      }
    } else {
      if (resolvedPair.authState !== 'public') {
        throw new Error(
          `Parity route ${family.key}/${pair.key} requires a browser-backed session, but Playwright is not available.`
        );
      }
      nextSnapshot = await fetchHtml(new URL(stripParityDisplayLabelParams(resolvedPair.nextRoute, nextBaseUrl), nextBaseUrl).toString());
      referenceSnapshot = await fetchHtml(
        new URL(stripParityDisplayLabelParams(resolvedPair.referenceRoute, referenceBaseUrl), referenceBaseUrl).toString()
      );
    }

    const referenceContract = collectContractSnapshot(referenceSnapshot.html, resolvedPair);
    const nextContract = collectContractSnapshot(nextSnapshot.html, resolvedPair);
    const referenceFinalUrlProblem = detectParityFinalUrlProblem({
      expectedRoute: resolvedPair.referenceRoute,
      finalUrl: referenceSnapshot.finalUrl,
      surfaceLabel: 'reference'
    });
    const nextFinalUrlProblem = detectParityFinalUrlProblem({
      expectedRoute: resolvedPair.nextRoute,
      finalUrl: nextSnapshot.finalUrl,
      surfaceLabel: 'next'
    });
    const comparison = compareParityContracts(referenceContract, nextContract);
    comparison.referenceFinalUrlProblem = referenceFinalUrlProblem;
    comparison.nextFinalUrlProblem = nextFinalUrlProblem;
    comparison.pass = comparison.pass && !referenceFinalUrlProblem && !nextFinalUrlProblem;
    const resultPayload = buildParityResultPayload({
      familyKey: family.key,
      routePair: pair,
      resolvedPair,
      nextSnapshot,
      referenceSnapshot,
      nextContract,
      referenceContract,
      comparison,
      nextScreenshotPath: playwrightModule ? artifacts.nextScreenshotPath : null,
      referenceScreenshotPath: playwrightModule ? artifacts.referenceScreenshotPath : null,
      diffScreenshotPath
    });

    const artifactSummaryPath = writeArtifacts(artifacts.summaryPath, resultPayload);
    appendParityPhaseTrace(artifacts.routePhaseTracePath, {
      phase: 'route-run:summary-written',
      familyKey: family.key,
      routePairKey: pair.key,
      artifactSummaryPath
    });
    results.push({
      ...resultPayload,
      artifactSummaryPath
    });
  }

  writeArtifacts(
    artifactIndexPath,
    buildParityArtifactIndexPayload({
      milestone,
      familyKey,
      routeKey,
      results
    })
  );

  console.log(
    JSON.stringify(
      {
        milestone,
        family: familyKey ?? null,
        route: routeKey ?? null,
        artifactIndexPath,
        representativeRouteParityCoverage: buildRepresentativeRouteParityCoverage(results),
        results
      },
      null,
      2
    )
  );

  if (results.some(result => !result.comparison.pass)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`parity harness failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
