import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_PORT = '4200';
const DEFAULT_HOSTNAME = '0.0.0.0';

export function parseStartArgs(args, env = process.env) {
  const parsed = {
    port: env.PORT || DEFAULT_PORT,
    hostname: env.HOSTNAME || DEFAULT_HOSTNAME
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === '-p' || arg === '--port') && args[index + 1]) {
      parsed.port = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--port=')) {
      parsed.port = arg.slice('--port='.length);
      continue;
    }
    if ((arg === '-H' || arg === '--hostname' || arg === '--host') && args[index + 1]) {
      parsed.hostname = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--hostname=')) {
      parsed.hostname = arg.slice('--hostname='.length);
      continue;
    }
    if (arg.startsWith('--host=')) {
      parsed.hostname = arg.slice('--host='.length);
    }
  }

  return parsed;
}

export function resolveStandalonePaths(rootDir = process.cwd(), distDir = process.env.NEXT_DIST_DIR || '.next') {
  const standaloneRoot = path.join(rootDir, distDir, 'standalone');
  const candidates = [path.join(standaloneRoot, 'web-next'), standaloneRoot];
  const appDir = candidates.find((candidate) => existsSync(path.join(candidate, 'server.js')));

  if (!appDir) {
    throw new Error(`Standalone server.js was not found under ${standaloneRoot}. Run npm run build first.`);
  }

  return {
    rootDir,
    distDir,
    standaloneRoot,
    appDir,
    serverFile: path.join(appDir, 'server.js'),
    sourceStaticDir: path.join(rootDir, distDir, 'static'),
    targetStaticDir: path.join(appDir, distDir, 'static'),
    sourcePublicDir: path.join(rootDir, 'public'),
    targetPublicDir: path.join(appDir, 'public')
  };
}

async function copyIfPresent(source, target) {
  if (!existsSync(source)) {
    return false;
  }

  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
  return true;
}

export async function prepareStandaloneAssets(rootDir = process.cwd()) {
  const paths = resolveStandalonePaths(rootDir);
  const copiedStatic = await copyIfPresent(paths.sourceStaticDir, paths.targetStaticDir);
  const copiedPublic = await copyIfPresent(paths.sourcePublicDir, paths.targetPublicDir);

  if (!copiedStatic) {
    throw new Error(`Next static assets were not found at ${paths.sourceStaticDir}. Run npm run build first.`);
  }

  return {
    appDir: paths.appDir,
    copiedStatic,
    copiedPublic,
    targetStaticDir: paths.targetStaticDir,
    targetPublicDir: paths.targetPublicDir
  };
}

export function startStandaloneServer(args = process.argv.slice(2), rootDir = process.cwd(), env = process.env) {
  const paths = resolveStandalonePaths(rootDir);
  const { port, hostname } = parseStartArgs(args, env);
  const child = spawn(process.execPath, [paths.serverFile], {
    cwd: paths.appDir,
    env: {
      ...env,
      PORT: port,
      HOSTNAME: hostname
    },
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  return child;
}

async function main() {
  const [, , command = 'start', ...args] = process.argv;

  if (command === 'prepare') {
    await prepareStandaloneAssets();
    return;
  }

  if (command === 'start') {
    await prepareStandaloneAssets();
    startStandaloneServer(args);
    return;
  }

  throw new Error(`Unknown standalone-server command: ${command}`);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
