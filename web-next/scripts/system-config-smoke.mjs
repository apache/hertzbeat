import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';
import {
  assertRouteLoads,
  loginWithPassword,
  requestMessage,
  requireMessageData
} from './release-shell-smoke.mjs';
import {
  runSystemConfigSmoke,
  SYSTEM_CONFIG_SMOKE_ROUTE
} from './system-config-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.SYSTEM_CONFIG_SMOKE_PORT || '4301', 10);
const explicitBaseUrl = process.env.SYSTEM_CONFIG_SMOKE_BASE_URL;
const routePath = process.env.SYSTEM_CONFIG_SMOKE_ROUTE || SYSTEM_CONFIG_SMOKE_ROUTE;
const identifier = process.env.SYSTEM_CONFIG_SMOKE_IDENTIFIER || 'admin';
const credential = process.env.SYSTEM_CONFIG_SMOKE_CREDENTIAL || 'hertzbeat';

async function assertLocaleBundleLoads(baseUrl, locale) {
  const response = await fetch(`${baseUrl}/hb-i18n/${locale}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /hb-i18n/${locale} failed with HTTP ${response.status}`);
  }
}

let serverHandle = null;

try {
  if (explicitBaseUrl) {
    serverHandle = {
      baseUrl: explicitBaseUrl,
      stop: () => {}
    };
  } else {
    serverHandle = await startLocalReleaseServer({ port: serverPort });
  }

  const result = await runSystemConfigSmoke({
    baseUrl: serverHandle.baseUrl,
    routePath,
    identifier,
    credential,
    assertRouteLoads,
    loginWithPassword,
    requestMessage,
    requireMessageData,
    assertLocaleBundleLoads
  });
  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
} catch (error) {
  const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157';
  const localStartHint = explicitBaseUrl
    ? ''
    : '\nHint: if this environment cannot bind a local Next port, rerun with SYSTEM_CONFIG_SMOKE_BASE_URL pointing at an already-running release shell.';
  console.error(
    `system-config smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `release-shell base: ${serverHandle?.baseUrl || explicitBaseUrl || `http://127.0.0.1:${serverPort}`}\n` +
      `configured BACKEND_ORIGIN: ${backendOrigin}` +
      localStartHint
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
