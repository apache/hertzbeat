import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
export const NEXT_OBSERVABILITY_COMPOSE =
  'script/docker-compose/hertzbeat-postgresql-victoria-metrics-next-observability/docker-compose.yaml';

export function readRootReleaseVersion(rootPom = readFileSync(path.join(repoRoot, 'pom.xml'), 'utf8')) {
  const version = rootPom.match(/<hzb\.version>\s*([^<]+?)\s*<\/hzb\.version>/)?.[1]?.trim();
  if (!version) {
    throw new Error('Unable to resolve <hzb.version> from root pom.xml');
  }
  return version;
}

export function rollbackProbeVersion(releaseVersion) {
  return process.env.HERTZBEAT_ROLLBACK_VERSION || `${releaseVersion}-rollback-check`;
}

export function composeConfigEnv(releaseVersion, extraEnv = process.env) {
  return {
    ...extraEnv,
    HERTZBEAT_RELEASE_VERSION: releaseVersion,
    HERTZBEAT_SERVER_IMAGE: extraEnv.HERTZBEAT_SERVER_IMAGE || 'apache/hertzbeat',
    HERTZBEAT_WEB_NEXT_IMAGE: extraEnv.HERTZBEAT_WEB_NEXT_IMAGE || 'apache/hertzbeat-web-next'
  };
}

export function assertResolvedReleaseImages(configText, releaseVersion) {
  const expectedServerImage = `image: apache/hertzbeat:${releaseVersion}`;
  const expectedWebNextImage = `image: apache/hertzbeat-web-next:${releaseVersion}`;
  const expectedBuildArg = `HERTZBEAT_RELEASE_VERSION: ${releaseVersion}`;

  for (const expected of [expectedServerImage, expectedWebNextImage, expectedBuildArg]) {
    if (!configText.includes(expected)) {
      throw new Error(`docker compose config did not resolve ${expected}`);
    }
  }
}

export function runDockerComposeConfig(releaseVersion) {
  const composePath = path.join(repoRoot, NEXT_OBSERVABILITY_COMPOSE);
  const command = ['compose', '-f', composePath, 'config'];
  const result = spawnSync('docker', command, {
    cwd: repoRoot,
    env: composeConfigEnv(releaseVersion),
    encoding: 'utf8'
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `docker compose config failed for release ${releaseVersion}: ${
        result.error?.message || result.stderr || `exit ${result.status}`
      }`,
    );
  }

  return result.stdout;
}

export function verifyReleaseComposeConfig({
  releaseVersion = process.env.HERTZBEAT_RELEASE_VERSION || readRootReleaseVersion(),
  rollbackVersion = rollbackProbeVersion(releaseVersion),
  configRunner = runDockerComposeConfig
} = {}) {
  const promotionConfig = configRunner(releaseVersion);
  assertResolvedReleaseImages(promotionConfig, releaseVersion);

  const rollbackConfig = configRunner(rollbackVersion);
  assertResolvedReleaseImages(rollbackConfig, rollbackVersion);

  return {
    releaseVersion,
    rollbackVersion
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = verifyReleaseComposeConfig();
  console.log(`docker compose promotion/rollback config ok: ${result.releaseVersion} -> ${result.rollbackVersion}`);
}
