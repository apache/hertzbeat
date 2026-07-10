import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveStandalonePaths } from './standalone-server.mjs';

export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function waitForServer(baseUrl, readyPath = '/overview') {
  let lastError = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${readyPath}`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`received ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(
    `release-shell server did not become ready at ${baseUrl}${readyPath}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export function resolveLocalReleaseLaunch({
  port,
  distDir = process.env.NEXT_DIST_DIR || '.next',
  rootDir = process.cwd()
}) {
  const buildIdPath = path.join(rootDir, distDir, 'BUILD_ID');
  if (existsSync(buildIdPath)) {
    const { appDir, serverFile } = resolveStandalonePaths(rootDir, distDir);
    return {
      args: [serverFile],
      cwd: appDir,
      env: { PORT: String(port), HOSTNAME: '127.0.0.1' }
    };
  }

  return {
    args: [path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    cwd: rootDir,
    env: { PORT: String(port) }
  };
}

export async function startLocalReleaseServer({
  port,
  readyPath = '/overview',
  distDir = process.env.NEXT_DIST_DIR || '.next'
}) {
  const launch = resolveLocalReleaseLaunch({ port, distDir });
  const child = spawn(process.execPath, launch.args, {
    cwd: launch.cwd,
    env: { ...process.env, ...launch.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk);
  });
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk);
  });

  const stop = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  process.on('exit', stop);
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stop();
    process.exit(143);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  const exitBeforeReady = new Promise((_, reject) => {
    child.once('error', error => {
      if (!ready) {
        reject(error);
      }
    });
    child.once('exit', (code, signal) => {
      if (!ready) {
        reject(
          new Error(
            `release-shell server exited before ready (code=${code ?? 'null'}, signal=${signal ?? 'null'}, baseUrl=${baseUrl})`
          )
        );
      }
    });
  });

  await Promise.race([
    waitForServer(baseUrl, readyPath).then(() => {
      ready = true;
    }),
    exitBeforeReady
  ]);

  return {
    baseUrl,
    stop
  };
}
