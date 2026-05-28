import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webNextRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webNextRoot, '..');

export const REQUIRED_WEB_NEXT_INGRESS_PREFIXES = [
  '/_next/',
  '/overview',
  '/entities',
  '/alert',
  '/topology',
  '/setting'
];

export const RELEASE_CHECKLIST_ITEMS = [
  {
    key: 'ci-blocking-gates',
    label: 'Frontend CI keeps build, budget, compose, checklist, tests, and smoke blocking',
    verify: files =>
      files.packageJson.scripts?.['verify:full'] ===
        'npm run build && npm run release:budget && npm run release:compose && npm run release:checklist && npm run verify' &&
      files.workflow.includes('npm run verify:full') &&
      files.workflow.includes('npm run parity:smoke:baseline')
  },
  {
    key: 'standalone-release-image',
    label: 'web-next release image is standalone, non-root, healthchecked, and version labeled',
    verify: files =>
      files.nextConfig.includes("output: 'standalone'") &&
      files.dockerfile.includes('FROM node:22-alpine') &&
      files.dockerfile.includes('USER nextjs') &&
      files.dockerfile.includes('HEALTHCHECK') &&
      files.dockerfile.includes('org.opencontainers.image.version="${HERTZBEAT_RELEASE_VERSION}"')
  },
  {
    key: 'compose-version-convergence',
    label: 'Compose release stack shares one overrideable server/web-next release version',
    verify: files =>
      files.compose.includes('${HERTZBEAT_RELEASE_VERSION:-1.8.0}') &&
      files.compose.includes('${HERTZBEAT_SERVER_IMAGE:-apache/hertzbeat}') &&
      files.compose.includes('${HERTZBEAT_WEB_NEXT_IMAGE:-apache/hertzbeat-web-next}')
  },
  {
    key: 'promotion-rollback-config',
    label: 'Promotion and rollback tags are validated through docker compose config',
    verify: files =>
      files.packageJson.scripts?.['release:compose'] === 'node ./scripts/release-compose.mjs' &&
      files.releaseCompose.includes('verifyReleaseComposeConfig') &&
      files.releaseCompose.includes('HERTZBEAT_ROLLBACK_VERSION')
  },
  {
    key: 'bundle-budget',
    label: 'Production Next build has a JavaScript bundle budget gate',
    verify: files =>
      files.packageJson.scripts?.['release:budget'] === 'node ./scripts/release-budget.mjs' &&
      files.releaseBudget.includes('DEFAULT_RELEASE_BUDGET_BYTES') &&
      files.releaseBudget.includes('evaluateReleaseBudget')
  },
  {
    key: 'release-ingress-route-ownership',
    label: 'Gateway routes operator route families to web-next and APIs/fallback to Spring',
    verify: files =>
      REQUIRED_WEB_NEXT_INGRESS_PREFIXES.every(prefix => files.gateway.includes(`location ^~ ${prefix}`)) &&
      files.gateway.includes('proxy_pass http://web-next:4200;') &&
      files.gateway.includes('location ^~ /api/') &&
      files.gateway.includes('location /') &&
      files.gateway.includes('proxy_pass http://hertzbeat:1157;')
  }
];

export function readReleaseChecklistFiles(rootDir = repoRoot) {
  const readRepoFile = relativePath => readFileSync(path.join(rootDir, relativePath), 'utf8');
  const packageText = readRepoFile('web-next/package.json');

  return {
    packageJson: JSON.parse(packageText),
    workflow: readRepoFile('.github/workflows/frontend-build-test.yml'),
    dockerfile: readRepoFile('web-next/Dockerfile'),
    nextConfig: readRepoFile('web-next/next.config.mjs'),
    compose: readRepoFile('script/docker-compose/hertzbeat-postgresql-victoria-metrics-next-observability/docker-compose.yaml'),
    gateway: readRepoFile('script/docker-compose/hertzbeat-postgresql-victoria-metrics-next-observability/nginx/default.conf'),
    releaseBudget: readRepoFile('web-next/scripts/release-budget.mjs'),
    releaseCompose: readRepoFile('web-next/scripts/release-compose.mjs')
  };
}

export function evaluateReleaseChecklist(files = readReleaseChecklistFiles()) {
  return RELEASE_CHECKLIST_ITEMS.map(item => ({
    key: item.key,
    label: item.label,
    passed: Boolean(item.verify(files))
  }));
}

export function verifyReleaseChecklist(files = readReleaseChecklistFiles()) {
  const results = evaluateReleaseChecklist(files);
  const failures = results.filter(result => !result.passed);
  if (failures.length > 0) {
    throw new Error(`Release checklist failed: ${failures.map(result => result.key).join(', ')}`);
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = verifyReleaseChecklist();
  console.log(`release checklist ok: ${results.map(result => result.key).join(', ')}`);
}
