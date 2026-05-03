import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';
import { assertRouteLoads } from './release-shell-smoke.mjs';
import { runTraceManageSmoke } from './trace-manage-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.TRACE_MANAGE_SMOKE_PORT || '4305', 10);
const explicitBaseUrl = process.env.TRACE_MANAGE_SMOKE_BASE_URL;

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

  const result = await runTraceManageSmoke({
    baseUrl: serverHandle.baseUrl,
    assertRouteLoads
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const localStartHint = explicitBaseUrl
    ? ''
    : '\nHint: if this environment cannot bind a local Next port, rerun with TRACE_MANAGE_SMOKE_BASE_URL pointing at an already-running release shell.';
  console.error(
    `trace-manage smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `release-shell base: ${serverHandle?.baseUrl || explicitBaseUrl || `http://127.0.0.1:${serverPort}`}` +
      localStartHint
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
