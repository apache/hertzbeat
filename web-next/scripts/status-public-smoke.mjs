import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';
import { assertRouteLoads } from './release-shell-smoke.mjs';
import {
  buildStatusPublicDemoArgs,
  resolveStatusPublicSmokeApiBase,
  STATUS_PUBLIC_SMOKE_ALIAS_ROUTE,
  STATUS_PUBLIC_SMOKE_ROUTE
} from './status-public-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.STATUS_PUBLIC_SMOKE_PORT || '4303', 10);
const explicitRouteBaseUrl = process.env.STATUS_PUBLIC_SMOKE_BASE_URL;
const explicitApiBaseUrl = process.env.STATUS_PUBLIC_SMOKE_API_BASE_URL;
const identifier = process.env.STATUS_PUBLIC_SMOKE_IDENTIFIER || 'admin';
const credential = process.env.STATUS_PUBLIC_SMOKE_CREDENTIAL || 'hertzbeat';
const pythonBin = process.env.STATUS_PUBLIC_SMOKE_PYTHON || 'python3';

function runStatusPublicDemo(apiBaseUrl) {
  const scriptPath = path.join(process.cwd(), '..', 'script', 'dev', 'status-public-demo.py');
  const args = buildStatusPublicDemoArgs(scriptPath, apiBaseUrl, identifier, credential);

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', error => {
      reject(error);
    });
    child.on('exit', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `status-public-demo.py exited with code ${code}`));
        return;
      }

      try {
        resolve(stdout.trim() ? JSON.parse(stdout) : {});
      } catch (error) {
        reject(
          new Error(
            `status-public-demo.py returned invalid JSON: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  });
}

let serverHandle = null;

try {
  if (explicitRouteBaseUrl) {
    serverHandle = {
      baseUrl: explicitRouteBaseUrl,
      stop: () => {}
    };
  } else {
    serverHandle = await startLocalReleaseServer({ port: serverPort });
  }

  const routeBaseUrl = serverHandle.baseUrl;
  const apiBaseUrl = resolveStatusPublicSmokeApiBase(routeBaseUrl, explicitApiBaseUrl, process.env.BACKEND_ORIGIN);
  if (!apiBaseUrl) {
    throw new Error('Status-public smoke could not resolve an API base URL.');
  }

  const statusRouteBefore = await assertRouteLoads(routeBaseUrl, STATUS_PUBLIC_SMOKE_ROUTE);
  const statusPublicAliasBefore = await assertRouteLoads(routeBaseUrl, STATUS_PUBLIC_SMOKE_ALIAS_ROUTE, {
    expectedPath: STATUS_PUBLIC_SMOKE_ROUTE
  });
  const seededStatus = await runStatusPublicDemo(apiBaseUrl);
  const statusRouteAfter = await assertRouteLoads(routeBaseUrl, STATUS_PUBLIC_SMOKE_ROUTE);
  const statusPublicAliasAfter = await assertRouteLoads(routeBaseUrl, STATUS_PUBLIC_SMOKE_ALIAS_ROUTE, {
    expectedPath: STATUS_PUBLIC_SMOKE_ROUTE
  });

  console.log(
    JSON.stringify(
      {
        routeBaseUrl,
        apiBaseUrl,
        statusRouteBefore,
        statusPublicAliasBefore,
        seededStatus,
        statusRouteAfter,
        statusPublicAliasAfter
      },
      null,
      2
    )
  );
} catch (error) {
  const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157';
  const localStartHint = explicitRouteBaseUrl
    ? ''
    : '\nHint: if this environment cannot bind a local Next port, rerun with STATUS_PUBLIC_SMOKE_BASE_URL pointing at an already-running Next status shell.';
  console.error(
    `status-public smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `route-shell base: ${serverHandle?.baseUrl || explicitRouteBaseUrl || `http://127.0.0.1:${serverPort}`}\n` +
      `api base: ${explicitApiBaseUrl || backendOrigin}` +
      '\nHint: if the status route shell and backend API are split, set both STATUS_PUBLIC_SMOKE_BASE_URL and STATUS_PUBLIC_SMOKE_API_BASE_URL.' +
      localStartHint
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
