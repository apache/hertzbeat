import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';
import { assertRouteLoads } from './release-shell-smoke.mjs';
import { runDashboardSmoke } from './dashboard-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.DASHBOARD_SMOKE_PORT || '4306', 10);
const explicitBaseUrl = process.env.DASHBOARD_SMOKE_BASE_URL;

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

  const result = await runDashboardSmoke({
    baseUrl: serverHandle.baseUrl,
    assertRouteLoads
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const localStartHint = explicitBaseUrl
    ? ''
    : '\nHint: if this environment cannot bind a local Next port, rerun with DASHBOARD_SMOKE_BASE_URL pointing at an already-running release shell.';
  console.error(
    `dashboard smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `release-shell base: ${serverHandle?.baseUrl || explicitBaseUrl || `http://127.0.0.1:${serverPort}`}` +
      localStartHint
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
