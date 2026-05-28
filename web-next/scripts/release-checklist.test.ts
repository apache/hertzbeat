import { describe, expect, it } from 'vitest';

import {
  REQUIRED_WEB_NEXT_INGRESS_PREFIXES,
  evaluateReleaseChecklist,
  verifyReleaseChecklist
} from './release-checklist.mjs';

function releaseFiles(overrides = {}) {
  const gatewayRoutes = REQUIRED_WEB_NEXT_INGRESS_PREFIXES
    .map(prefix => `location ^~ ${prefix} {\n  proxy_pass http://web-next:4200;\n}`)
    .join('\n');

  return {
    packageJson: {
      scripts: {
        'verify:full':
          'npm run build && npm run release:budget && npm run release:compose && npm run release:checklist && npm run verify',
        'release:budget': 'node ./scripts/release-budget.mjs',
        'release:compose': 'node ./scripts/release-compose.mjs'
      }
    },
    workflow: 'run: npm run verify:full\nrun: npm run parity:smoke:baseline',
    dockerfile:
      'FROM node:22-alpine\nUSER nextjs\nHEALTHCHECK CMD test\nLABEL org.opencontainers.image.version="${HERTZBEAT_RELEASE_VERSION}"',
    nextConfig: "output: 'standalone'",
    compose:
      '${HERTZBEAT_RELEASE_VERSION:-1.8.0}\n${HERTZBEAT_SERVER_IMAGE:-apache/hertzbeat}\n${HERTZBEAT_WEB_NEXT_IMAGE:-apache/hertzbeat-web-next}',
    gateway: `${gatewayRoutes}\nlocation ^~ /api/ {\n proxy_pass http://hertzbeat:1157;\n}\nlocation / {\n proxy_pass http://hertzbeat:1157;\n}`,
    releaseBudget: 'DEFAULT_RELEASE_BUDGET_BYTES\nevaluateReleaseBudget',
    releaseCompose: 'verifyReleaseComposeConfig\nHERTZBEAT_ROLLBACK_VERSION',
    ...overrides
  };
}

describe('release checklist gate', () => {
  it('passes only when every release-readiness item is present', () => {
    const results = verifyReleaseChecklist(releaseFiles());

    expect(results.every(result => result.passed)).toBe(true);
    expect(results.map(result => result.key)).toEqual([
      'ci-blocking-gates',
      'standalone-release-image',
      'compose-version-convergence',
      'promotion-rollback-config',
      'bundle-budget',
      'release-ingress-route-ownership'
    ]);
  });

  it('fails with the missing checklist key when release ingress drops a web-next route family', () => {
    const files = releaseFiles({
      gateway:
        'location ^~ /_next/ { proxy_pass http://web-next:4200; }\n'
        + 'location ^~ /api/ { proxy_pass http://hertzbeat:1157; }\n'
        + 'location / { proxy_pass http://hertzbeat:1157; }'
    });

    expect(evaluateReleaseChecklist(files).find(result => result.key === 'release-ingress-route-ownership')?.passed).toBe(
      false,
    );
    expect(() => verifyReleaseChecklist(files)).toThrow('release-ingress-route-ownership');
  });
});
