import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getParityRuntimeTargets, isAcceptedProbeResult } from './runtime-lib.mjs';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const webNextDir = path.resolve(scriptDir, '..', '..');
const angularReferenceServerPath = path.join(scriptDir, 'angular-reference-server.mjs');
const runtimeRoot = path.join(os.tmpdir(), 'hertzbeat-parity');

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function runtimeFile(name, extension) {
  mkdirSync(runtimeRoot, { recursive: true });
  return path.join(runtimeRoot, `${name}.${extension}`);
}

function readTrackedPid(pidPath) {
  if (!existsSync(pidPath)) {
    return null;
  }

  const raw = readFileSync(pidPath, 'utf8').trim();
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function killTrackedProcess(pidPath) {
  const pid = readTrackedPid(pidPath);
  if (pid === null) {
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore stale pid files
  }

  try {
    unlinkSync(pidPath);
  } catch {
    // ignore
  }
}

function killPortListeners(port) {
  const result = spawnSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8'
  });

  const listeners = result.stdout
    .split(/\s+/)
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => Number.parseInt(value, 10))
    .filter(pid => Number.isFinite(pid));

  for (const listenerPid of listeners) {
    try {
      process.kill(listenerPid, 'SIGTERM');
    } catch {
      // ignore stale listeners
    }
  }
}

export async function probeRuntime(baseUrl, readyPath = '/overview', acceptableStatuses = [200], probeTimeoutMs = 3000) {
  try {
    const response = await fetch(`${baseUrl}${readyPath}`, {
      headers: {
        accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(probeTimeoutMs)
    });
    return {
      reachable: isAcceptedProbeResult({
        baseUrl,
        readyPath,
        acceptableStatuses,
        status: response.status,
        finalUrl: response.url
      }),
      status: response.status,
      finalUrl: response.url
    };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      finalUrl: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function waitForRuntime(baseUrl, readyPath, acceptableStatuses, probeTimeoutMs = 3000) {
  let lastProbe = null;

  for (let attempt = 0; attempt < 180; attempt += 1) {
    lastProbe = await probeRuntime(baseUrl, readyPath, acceptableStatuses, probeTimeoutMs);
    if (lastProbe.reachable) {
      return lastProbe;
    }
    await sleep(1000);
  }

  throw new Error(
    `runtime ${baseUrl}${readyPath} did not become reachable: ${lastProbe?.error || lastProbe?.status || 'timeout'}`
  );
}

function spawnDetachedProcess({ name, port, cwd, command, args, env }) {
  const pidPath = runtimeFile(name, 'pid');
  const logPath = runtimeFile(name, 'log');

  killTrackedProcess(pidPath);
  if (typeof port === 'number') {
    killPortListeners(port);
  }

  const logFd = openSync(logPath, 'a');
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', logFd, logFd]
  });

  child.unref();
  writeFileSync(pidPath, String(child.pid));

  return {
    pidPath,
    logPath
  };
}

export async function ensureParityRuntime({
  name,
  baseUrl,
  port,
  readyPath,
  acceptableStatuses = [200],
  probeTimeoutMs = 3000,
  cwd,
  command,
  args,
  env = {}
}) {
  const before = await probeRuntime(baseUrl, readyPath, acceptableStatuses, probeTimeoutMs);
  if (before.reachable) {
    return {
      name,
      baseUrl,
      port,
      readyPath,
      restarted: false,
      probe: before,
      pidPath: runtimeFile(name, 'pid'),
      logPath: runtimeFile(name, 'log')
    };
  }

  const { pidPath, logPath } = spawnDetachedProcess({ name, port, cwd, command, args, env });
  const after = await waitForRuntime(baseUrl, readyPath, acceptableStatuses, probeTimeoutMs);

  return {
    name,
    baseUrl,
    port,
    readyPath,
    restarted: true,
    probe: after,
    pidPath,
    logPath
  };
}

export async function ensureParityRuntimes({
  nextBaseUrl = 'http://127.0.0.1:4200',
  angularBaseUrl = 'http://127.0.0.1:4301',
  backendBaseUrl = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157'
} = {}) {
  const targets = getParityRuntimeTargets({ nextBaseUrl, angularBaseUrl, backendBaseUrl });
  const backend = await probeRuntime(
    targets.backend.baseUrl,
    targets.backend.readyPath,
    targets.backend.acceptableStatuses,
    targets.backend.probeTimeoutMs
  );
  if (!backend.reachable) {
    throw new Error(
      `backend is not reachable at ${targets.backend.baseUrl}: ${backend.error || backend.status || 'unknown error'}`
    );
  }

  const next = await ensureParityRuntime({
    name: targets.next.name,
    baseUrl: targets.next.baseUrl,
    port: targets.next.port,
    readyPath: targets.next.readyPath,
    acceptableStatuses: targets.next.acceptableStatuses,
    probeTimeoutMs: targets.next.probeTimeoutMs,
    cwd: webNextDir,
    command: path.join(webNextDir, 'node_modules', '.bin', 'next'),
    args: ['dev', '-p', '4200'],
    env: {
      BACKEND_ORIGIN: targets.backend.baseUrl
    }
  });

  const angular = await ensureParityRuntime({
    name: targets.angular.name,
    baseUrl: targets.angular.baseUrl,
    port: targets.angular.port,
    readyPath: targets.angular.readyPath,
    acceptableStatuses: targets.angular.acceptableStatuses,
    probeTimeoutMs: targets.angular.probeTimeoutMs,
    cwd: webNextDir,
    command: process.execPath,
    args: [angularReferenceServerPath, '--port', '4301'],
    env: {
      BACKEND_ORIGIN: targets.backend.baseUrl
    }
  });

  return {
    backend: {
      name: targets.backend.name,
      baseUrl: targets.backend.baseUrl,
      readyPath: targets.backend.readyPath,
      restarted: false,
      probe: backend,
      pidPath: null,
      logPath: null
    },
    next,
    angular
  };
}

if (process.argv[1] === scriptFile) {
  try {
    const summary = await ensureParityRuntimes();
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(`parity runtime ensure failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
