import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const webNextRoot = resolve(__dirname, '..');
const repoRoot = resolve(webNextRoot, '..');

function readWorkflow(): string {
  return readFileSync(resolve(repoRoot, '.github/workflows/frontend-build-test.yml'), 'utf8');
}

function readDockerfile(): string {
  return readFileSync(resolve(webNextRoot, 'Dockerfile'), 'utf8');
}

function readNextObservabilityCompose(): string {
  return readFileSync(
    resolve(repoRoot, 'script/docker-compose/hertzbeat-postgresql-victoria-metrics-next-observability/docker-compose.yaml'),
    'utf8',
  );
}

function readNextConfig(): string {
  return readFileSync(resolve(webNextRoot, 'next.config.mjs'), 'utf8');
}

function readReleaseBudgetScript(): string {
  return readFileSync(resolve(webNextRoot, 'scripts/release-budget.mjs'), 'utf8');
}

function readReleaseComposeScript(): string {
  return readFileSync(resolve(webNextRoot, 'scripts/release-compose.mjs'), 'utf8');
}

function readReleaseChecklistScript(): string {
  return readFileSync(resolve(webNextRoot, 'scripts/release-checklist.mjs'), 'utf8');
}

function readThreeSignalAlphaCutoffScript(): string {
  return readFileSync(resolve(webNextRoot, 'scripts/three-signal-alpha-cutoff-report.mjs'), 'utf8');
}

function readNextObservabilityGateway(): string {
  return readFileSync(
    resolve(repoRoot, 'script/docker-compose/hertzbeat-postgresql-victoria-metrics-next-observability/nginx/default.conf'),
    'utf8',
  );
}

function readRootPom(): string {
  return readFileSync(resolve(repoRoot, 'pom.xml'), 'utf8');
}

function readPackageJson(): { scripts?: Record<string, string> } {
  return JSON.parse(readFileSync(resolve(webNextRoot, 'package.json'), 'utf8'));
}

function extractBranches(workflow: string, sectionName: 'push' | 'pull_request'): string[] {
  const nextSection = sectionName === 'push' ? 'pull_request' : 'jobs';
  const sectionPattern = new RegExp(`\\n\\s+${sectionName}:([\\s\\S]*?)\\n\\s*${nextSection}:`);
  const section = workflow.match(sectionPattern)?.[1] ?? '';
  const branches = section.match(/branches:\s*\[([^\]]+)\]/)?.[1] ?? '';

  return branches
    .split(',')
    .map((branch) => branch.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function extractWorkflowNodeMajors(workflow: string): string[] {
  return [...workflow.matchAll(/node-version:\s*['"]?(\d+)['"]?/g)].map(match => match[1]);
}

function extractDockerNodeMajors(dockerfile: string): string[] {
  return [...dockerfile.matchAll(/FROM\s+node:(\d+)-alpine/g)].map(match => match[1]);
}

function extractXmlTag(xml: string, tagName: string): string {
  const tagPattern = new RegExp(`<${tagName}>\\s*([^<]+?)\\s*</${tagName}>`);
  const value = xml.match(tagPattern)?.[1]?.trim();
  if (!value) {
    throw new Error(`Missing <${tagName}> in root pom.xml`);
  }
  return value;
}

describe('release-readiness validation baseline', () => {
  it('keeps frontend CI active for release-readiness working branches', () => {
    const workflow = readWorkflow();

    expect(extractBranches(workflow, 'push')).toEqual(
      expect.arrayContaining(['master', 'dev', 'codex/**', 'feature/**', 'release/**']),
    );
    expect(extractBranches(workflow, 'pull_request')).toEqual(
      expect.arrayContaining(['master', 'dev', 'codex/**', 'feature/**', 'release/**']),
    );
  });

  it('keeps milestone-one parity smoke as a blocking validation command', () => {
    const workflow = readWorkflow();
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.['parity:smoke:baseline']).toContain('--milestone 1');
    expect(workflow).toContain('npm run parity:smoke:baseline');
  });

  it('runs a release bundle budget after the production build in full verification', () => {
    const packageJson = readPackageJson();
    const releaseBudgetScript = readReleaseBudgetScript();

    expect(packageJson.scripts?.['release:budget']).toBe('node ./scripts/release-budget.mjs');
    expect(packageJson.scripts?.['verify:full']).toContain('npm run build && npm run release:budget');
    expect(releaseBudgetScript).toContain('DEFAULT_RELEASE_BUDGET_BYTES');
    expect(releaseBudgetScript).toContain('evaluateReleaseBudget');
  });

  it('runs a compose promotion and rollback gate in full verification', () => {
    const packageJson = readPackageJson();
    const releaseComposeScript = readReleaseComposeScript();

    expect(packageJson.scripts?.['release:compose']).toBe('node ./scripts/release-compose.mjs');
    expect(packageJson.scripts?.['verify:full']).toContain('npm run release:budget && npm run release:compose');
    expect(releaseComposeScript).toContain('verifyReleaseComposeConfig');
    expect(releaseComposeScript).toContain('HERTZBEAT_ROLLBACK_VERSION');
    expect(releaseComposeScript).toContain('docker compose');
  });

  it('runs the release checklist gate and keeps release ingress aligned with web-next route families', () => {
    const packageJson = readPackageJson();
    const releaseChecklistScript = readReleaseChecklistScript();
    const gateway = readNextObservabilityGateway();

    expect(packageJson.scripts?.['release:checklist']).toBe('node ./scripts/release-checklist.mjs');
    expect(packageJson.scripts?.['verify:full']).toBe(
      'npm run build && npm run release:budget && npm run release:compose && npm run release:checklist && npm run verify',
    );
    expect(releaseChecklistScript).toContain('RELEASE_CHECKLIST_ITEMS');
    expect(releaseChecklistScript).toContain('verifyReleaseChecklist');
    expect(releaseChecklistScript).toContain('three-signal-alpha-cutoff-evidence');

    for (const routePrefix of ['/_next/', '/overview', '/entities', '/alert', '/topology', '/setting']) {
      expect(gateway).toContain(`location ^~ ${routePrefix}`);
    }
    expect(gateway).toContain('proxy_pass http://web-next:4200;');
    expect(gateway).toContain('location ^~ /api/');
    expect(gateway).toContain('proxy_pass http://hertzbeat:1157;');
  });

  it('keeps the three-signal alpha cutoff evidence report in frontend verification', () => {
    const packageJson = readPackageJson();
    const releaseChecklistScript = readReleaseChecklistScript();
    const threeSignalAlphaCutoffScript = readThreeSignalAlphaCutoffScript();

    expect(packageJson.scripts?.['three-signal:cutoff']).toBe('node ./scripts/three-signal-alpha-cutoff-report.mjs');
    expect(packageJson.scripts?.verify).toContain('npm run three-signal:cutoff');
    expect(releaseChecklistScript).toContain('threeSignalAlphaCutoff');
    expect(threeSignalAlphaCutoffScript).toContain('verifyThreeSignalAlphaCutoff');
  });

  it('keeps the web-next release image aligned with CI Node runtime', () => {
    const workflowNodeMajors = new Set(extractWorkflowNodeMajors(readWorkflow()));
    const dockerNodeMajors = new Set(extractDockerNodeMajors(readDockerfile()));

    expect(workflowNodeMajors).toContain('22');
    expect(dockerNodeMajors).toEqual(new Set(['22']));
  });

  it('packages web-next as a standalone non-root healthchecked release image', () => {
    const dockerfile = readDockerfile();
    const nextConfig = readNextConfig();

    expect(nextConfig).toMatch(/output:\s*['"]standalone['"]/);
    expect(dockerfile).toContain('COPY --from=builder /app/.next/standalone ./');
    expect(dockerfile).toContain('COPY --from=builder /app/.next/static ./.next/static');
    expect(dockerfile).toContain('COPY --from=builder /app/public ./public');
    expect(dockerfile).toContain('USER nextjs');
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('CMD ["node", "server.js"]');
    expect(dockerfile).not.toContain('npx');
  });

  it('uses one overrideable release version for the next observability compose stack', () => {
    const releaseVersion = extractXmlTag(readRootPom(), 'hzb.version');
    const compose = readNextObservabilityCompose();
    const releaseVersionExpression = `\${HERTZBEAT_RELEASE_VERSION:-${releaseVersion}}`;

    expect(compose).toContain(
      `image: "\${HERTZBEAT_SERVER_IMAGE:-apache/hertzbeat}:${releaseVersionExpression}"`,
    );
    expect(compose).toContain(
      `image: "\${HERTZBEAT_WEB_NEXT_IMAGE:-apache/hertzbeat-web-next}:${releaseVersionExpression}"`,
    );
    expect(compose).toContain(`HERTZBEAT_RELEASE_VERSION: ${releaseVersionExpression}`);
    expect(compose).not.toMatch(/image:\s+apache\/hertzbeat:\d/);
  });

  it('labels the web-next release image with the compose release version', () => {
    const dockerfile = readDockerfile();

    expect(dockerfile).toContain('ARG HERTZBEAT_RELEASE_VERSION=dev');
    expect(dockerfile).toContain('org.opencontainers.image.version="${HERTZBEAT_RELEASE_VERSION}"');
  });
});
