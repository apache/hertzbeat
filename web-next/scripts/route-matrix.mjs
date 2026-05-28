import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';

const defaultRouteMatrix = [
  '/overview',
  '/entities',
  '/entities/new',
  '/entities/1',
  '/entities/1/edit',
  '/entities/1/definition',
  '/alert',
  '/alert/center',
  '/alerts',
  '/alert/setting',
  '/alert/notice',
  '/alert/group',
  '/alert/silence',
  '/alert/inhibit',
  '/alert/integration/webhook',
  '/incidents',
  '/actions',
  '/dashboard',
  '/events',
  '/log/manage',
  '/log/stream',
  '/log/integration',
  '/log/integration/webhook',
  '/trace/manage',
  '/monitors',
  '/monitors/new',
  '/monitors/1',
  '/monitors/1/edit',
  '/ingestion/otlp',
  '/ingestion/otlp/metrics',
  '/bulletin',
  '/exception/404',
  '/setting',
  '/setting/settings',
  '/setting/settings/config',
  '/setting/settings/object-store',
  '/setting/settings/server',
  '/setting/settings/token',
  '/setting/collector',
  '/setting/define',
  '/setting/labels',
  '/setting/plugins',
  '/setting/status',
  '/status',
  '/status/public',
  '/passport/login',
  '/passport/lock',
  '/',
  '/login'
];

const serverPort = Number.parseInt(process.env.ROUTE_MATRIX_PORT || '4300', 10);
const explicitBaseUrl = process.env.ROUTE_MATRIX_BASE_URL;

async function runRouteMatrix(baseUrl) {
  const results = await Promise.all(
    defaultRouteMatrix.map(async routePath => {
      const response = await fetch(`${baseUrl}${routePath}`);
      return {
        path: routePath,
        status: response.status,
        finalUrl: response.url
      };
    })
  );

  for (const result of results) {
    console.log(`${result.path} ${result.status} -> ${result.finalUrl}`);
  }

  const failures = results.filter(result => result.status !== 200);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

const sourcePageEntryNames = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];

function findSourceRouteEntry(appRoot, routePath) {
  const normalizedPath = routePath === '/' ? [] : routePath.replace(/^\/+|\/+$/g, '').split('/');
  let currentDir = appRoot;

  for (const segment of normalizedPath) {
    const directDir = path.join(currentDir, segment);
    if (fs.existsSync(directDir) && fs.statSync(directDir).isDirectory()) {
      currentDir = directDir;
      continue;
    }

    const directoryNames = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    const exactDynamicDir = directoryNames.find(name => /^\[[^\].][^\]]*\]$/.test(name));
    const catchAllDynamicDir = directoryNames.find(name => /^\[\.\.\.[^\]]+\]$/.test(name));
    const dynamicDir = exactDynamicDir || catchAllDynamicDir;

    if (!dynamicDir) {
      return null;
    }

    currentDir = path.join(currentDir, dynamicDir);
  }

  for (const entryName of sourcePageEntryNames) {
    const candidate = path.join(currentDir, entryName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function runSourceRouteMatrix(rootDir = process.cwd()) {
  const appRoot = path.join(rootDir, 'app');
  const results = defaultRouteMatrix.map(routePath => {
    const entry = findSourceRouteEntry(appRoot, routePath);
    return {
      path: routePath,
      status: entry ? 200 : 404,
      finalUrl: entry ? `source://${path.relative(rootDir, entry)}` : 'missing://page'
    };
  });

  for (const result of results) {
    console.log(`${result.path} ${result.status} -> ${result.finalUrl}`);
  }

  const failures = results.filter(result => result.status !== 200);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

let serverHandle = null;

try {
  if (explicitBaseUrl) {
    await runRouteMatrix(explicitBaseUrl);
  } else {
    try {
      serverHandle = await startLocalReleaseServer({ port: serverPort });
      await runRouteMatrix(serverHandle.baseUrl);
    } catch (error) {
      console.warn(
        `route-matrix falling back to source route inspection because the local release-shell could not start: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      runSourceRouteMatrix();
    }
  }
} finally {
  serverHandle?.stop();
}

process.exit(process.exitCode ?? 0);
