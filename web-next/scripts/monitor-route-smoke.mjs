import process from 'node:process';
import { startLocalReleaseServer, sleep } from './release-shell.mjs';
import {
  assertRouteLoads,
  loginWithPassword,
  requestMessage,
  requireMessageData
} from './release-shell-smoke.mjs';
import {
  buildMonitorHistorySmokePath,
  buildWebsiteMonitorSmokeName,
  buildWebsiteMonitorSmokePayload,
  countHistorySamples,
  extractMonitorFromPage,
  hasHistorySamples,
  hasRealtimeSummarySamples
} from './monitor-route-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.MONITOR_ROUTE_SMOKE_PORT || '4305', 10);
const explicitBaseUrl = process.env.MONITOR_ROUTE_SMOKE_BASE_URL;
const identifier = process.env.MONITOR_ROUTE_SMOKE_IDENTIFIER || 'admin';
const credential = process.env.MONITOR_ROUTE_SMOKE_CREDENTIAL || 'hertzbeat';
const deleteAfter = process.env.MONITOR_ROUTE_SMOKE_DELETE_AFTER !== 'false';

let serverHandle = null;

async function findCreatedMonitor(baseUrl, token, name) {
  const message = await requestMessage(
    baseUrl,
    `/api/monitors?pageIndex=0&pageSize=20&app=website&search=${encodeURIComponent(name)}`,
    { token }
  );
  return extractMonitorFromPage(requireMessageData(message, 'Load seeded monitor list'), name);
}

async function waitForCreatedMonitor(baseUrl, token, name) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const monitor = await findCreatedMonitor(baseUrl, token, name);
    if (monitor?.id && monitor?.instance) {
      return monitor;
    }
    await sleep(1000);
  }
  throw new Error(`Created monitor ${name} did not appear in the website list.`);
}

async function waitForMonitorEvidence(baseUrl, token, monitor) {
  let latestSummary = null;
  let latestHistory = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    latestSummary = requireMessageData(
      await requestMessage(baseUrl, `/api/monitor/${monitor.id}/metrics/summary`, { token }),
      'Load monitor realtime summary'
    );
    latestHistory = requireMessageData(
      await requestMessage(baseUrl, buildMonitorHistorySmokePath(monitor.instance), { token }),
      'Load monitor history summary'
    );

    if (hasRealtimeSummarySamples(latestSummary) && hasHistorySamples(latestHistory)) {
      return {
        summary: latestSummary,
        history: latestHistory
      };
    }

    await sleep(12000);
  }

  throw new Error(
    `Monitor ${monitor.id} never produced non-empty realtime + history evidence. ` +
      `realtime=${hasRealtimeSummarySamples(latestSummary)} historySamples=${countHistorySamples(latestHistory)}`
  );
}

try {
  if (explicitBaseUrl) {
    serverHandle = {
      baseUrl: explicitBaseUrl,
      stop: () => {}
    };
  } else {
    serverHandle = await startLocalReleaseServer({ port: serverPort });
  }

  const listRoute = await assertRouteLoads(serverHandle.baseUrl, '/monitors?app=website');
  const newRoute = await assertRouteLoads(serverHandle.baseUrl, '/monitors/new?app=website');
  const tokens = await loginWithPassword(serverHandle.baseUrl, identifier, credential);

  const smokeName = buildWebsiteMonitorSmokeName(Date.now());
  const payload = buildWebsiteMonitorSmokePayload(smokeName);
  requireMessageData(
    await requestMessage(serverHandle.baseUrl, '/api/monitor/detect', {
      method: 'POST',
      token: tokens.token,
      body: payload
    }),
    'Detect website smoke monitor'
  );
  requireMessageData(
    await requestMessage(serverHandle.baseUrl, '/api/monitor', {
      method: 'POST',
      token: tokens.token,
      body: payload
    }),
    'Create website smoke monitor'
  );

  const createdMonitor = await waitForCreatedMonitor(serverHandle.baseUrl, tokens.token, smokeName);
  const detailRoute = await assertRouteLoads(serverHandle.baseUrl, `/monitors/${createdMonitor.id}`);
  const editRoute = await assertRouteLoads(serverHandle.baseUrl, `/monitors/${createdMonitor.id}/edit`);
  const evidence = await waitForMonitorEvidence(serverHandle.baseUrl, tokens.token, createdMonitor);

  if (deleteAfter) {
    await requestMessage(serverHandle.baseUrl, `/api/monitor/${createdMonitor.id}`, {
      method: 'DELETE',
      token: tokens.token
    });
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: serverHandle.baseUrl,
        listRoute,
        newRoute,
        detailRoute,
        editRoute,
        createdMonitor: {
          id: createdMonitor.id,
          name: createdMonitor.name,
          instance: createdMonitor.instance
        },
        detectResult: 'ok',
        createResult: 'ok',
        realtimeEvidence: {
          nonEmpty: hasRealtimeSummarySamples(evidence.summary),
          sampleOrigin: evidence.summary?.valueRows?.[0]?.values?.[0]?.origin ?? null
        },
        historyEvidence: {
          nonEmpty: hasHistorySamples(evidence.history),
          sampleCount: countHistorySamples(evidence.history)
        },
        deletedAfter: deleteAfter
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    `monitor-route smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `release-shell base: ${serverHandle?.baseUrl || explicitBaseUrl || `http://127.0.0.1:${serverPort}`}`
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
