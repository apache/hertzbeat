import { describe, expect, it } from 'vitest';

import {
  buildProductDesignValidationMatrix,
  evaluateFreshBrowserScreenshotAudit,
  formatProductDesignValidationMatrix
} from './product-design-validation-matrix.mjs';

describe('product-design-validation-matrix', () => {
  it('keeps every app route tied to a route test and high-frequency workflows tied to browser evidence', () => {
    const matrix = buildProductDesignValidationMatrix(process.cwd(), { freshBrowserAudit: false });

    expect(matrix.valid).toBe(true);
    expect(matrix.contractValid).toBe(true);
    expect(matrix.goalComplete).toBe(false);
    expect(matrix.freshBrowserScreenshotAudit).toMatchObject({
      asserted: false,
      valid: false,
      evidenceKind: 'fresh-current-run-screenshots',
      verifiedRouteCount: 0,
      status: 'not-complete'
    });
    expect(matrix.freshBrowserScreenshotAudit.routeCount).toBe(matrix.routeCount);
    expect(matrix.freshBrowserScreenshotAudit.note).toContain('current-run Browser screenshots');
    expect(matrix.missingRouteTests).toEqual([]);
    expect(matrix.missingBrowserEvidence).toEqual([]);
    expect(matrix.uncategorizedRoutes).toEqual([]);
    expect(matrix.missingActionEvidence).toEqual([]);
    expect(matrix.routeCount).toBeGreaterThan(40);
    expect(matrix.categorizedRouteCount).toBe(matrix.routeCount);
    expect(matrix.actionEvidence.flatMap(family => family.actions)).toHaveLength(50);
    expect(matrix.actionEvidence.flatMap(family => family.actions).every(action => action.hasEvidence)).toBe(true);
    expect(matrix.actionEvidence.flatMap(family => family.actions).every(action => action.hasContentEvidence)).toBe(true);

    expect(matrix.routes.map(route => route.routePath)).toEqual(
      expect.arrayContaining([
        '/',
        '/entities',
        '/entities/new',
        '/monitors',
        '/monitors/new',
        '/alert/setting',
        '/setting/settings/server',
        '/dashboard',
        '/log/manage',
        '/trace/manage',
        '/status/public',
        '/passport/login'
      ])
    );

    expect(matrix.workflowEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'entity', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'monitor', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'alert', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'settings', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'observability', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'operator', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'auth', hasBrowserEvidence: true }),
        expect.objectContaining({ key: 'public-status', hasBrowserEvidence: true })
      ])
    );
    expect(matrix.workflowEvidence.every(family => family.browserEvidenceKind === 'file-contract')).toBe(true);
    expect(matrix.actionEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'entity',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'list-payload-recovery', hasEvidence: true }),
            expect.objectContaining({ key: 'create-save-validation', hasEvidence: true }),
            expect.objectContaining({ key: 'post-create-detail-return-route', hasEvidence: true }),
            expect.objectContaining({ key: 'post-create-readback-guide', hasEvidence: true }),
            expect.objectContaining({ key: 'edit-save-readback', hasEvidence: true }),
            expect.objectContaining({ key: 'create', hasEvidence: true }),
            expect.objectContaining({ key: 'edit', hasEvidence: true }),
            expect.objectContaining({ key: 'detail-delete-confirmation', hasEvidence: true }),
            expect.objectContaining({ key: 'import', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'monitor',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'create', hasEvidence: true }),
            expect.objectContaining({ key: 'detect-return-context', hasEvidence: true }),
            expect.objectContaining({ key: 'edit', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'alert',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'threshold-authoring', hasEvidence: true }),
            expect.objectContaining({ key: 'threshold-preview-save-guard', hasEvidence: true }),
            expect.objectContaining({ key: 'notice-authoring', hasEvidence: true }),
            expect.objectContaining({ key: 'notice-receiver-token-normalization', hasEvidence: true }),
            expect.objectContaining({ key: 'alerts-alias-context', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'settings',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'server-save', hasEvidence: true }),
            expect.objectContaining({ key: 'server-email-save-apply-feedback', hasEvidence: true }),
            expect.objectContaining({ key: 'token-actions', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'observability',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'log-stream-return-context', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'operator',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'shell-primary-navigation-map', hasEvidence: true }),
            expect.objectContaining({ key: 'root-overview-redirect', hasEvidence: true }),
            expect.objectContaining({ key: 'events-log-redirect', hasEvidence: true }),
            expect.objectContaining({ key: 'exception-recovery', hasEvidence: true }),
            expect.objectContaining({ key: 'bulletin-center', hasEvidence: true })
          ])
        }),
        expect.objectContaining({
          key: 'public-status',
          actions: expect.arrayContaining([
            expect.objectContaining({ key: 'status-incident-row-guard', hasEvidence: true })
          ])
        })
      ])
    );
  });

  it('accepts only a complete settled screenshot manifest for every current route', () => {
    const routeCount = buildProductDesignValidationMatrix(process.cwd(), { freshBrowserAudit: false }).routeCount;
    const routes = Array.from({ length: routeCount }, (_, index) => ({
      requested: `/proof-${index + 1}`,
      snapshot: true,
      error: null,
      screenshot: `screenshots/${index + 1}.jpg`,
      bytes: 1024,
      loading: false,
      h404: false,
      h500: false,
      nextError: false,
      overflowX: false
    }));
    const evidence = {
      auditId: 'product-design-test-audit',
      verifiedAt: '2026-07-10T00:00:00.000Z',
      valid: true,
      expectedRouteCount: routeCount,
      verifiedRouteCount: routeCount,
      acceptedRouteCount: routeCount,
      invalid: [],
      routes
    };

    expect(evaluateFreshBrowserScreenshotAudit(routeCount, evidence)).toMatchObject({
      asserted: true,
      valid: true,
      verifiedRouteCount: routeCount,
      status: 'complete',
      auditId: 'product-design-test-audit'
    });
    expect(evaluateFreshBrowserScreenshotAudit(routeCount, {
      ...evidence,
      routes: routes.map((route, index) => (index === 0 ? { ...route, loading: true } : route))
    })).toMatchObject({
      asserted: true,
      valid: false,
      status: 'not-complete'
    });
  });

  it('counts public route evidence separately from overlapping filesystem route owners', () => {
    const evidence = {
      auditId: 'overlapping-route-owners',
      valid: true,
      expectedRouteCount: 1,
      verifiedRouteCount: 1,
      acceptedRouteCount: 1,
      invalid: [],
      routes: [{
        requested: '/entities/legacy?search=api',
        snapshot: true,
        error: null,
        screenshot: 'screenshots/entities-legacy.jpg',
        bytes: 2048,
        loading: false,
        h404: false,
        h500: false,
        nextError: false,
        overflowX: false
      }]
    };

    expect(evaluateFreshBrowserScreenshotAudit(['/entities/[entityId]', '/entities/legacy'], evidence)).toMatchObject({
      valid: true,
      routeCount: 1,
      sourceRouteCount: 2,
      sourceRouteCoverageCount: 2
    });
    expect(evaluateFreshBrowserScreenshotAudit(['/entities/[entityId]', '/setting/status'], evidence)).toMatchObject({
      valid: false,
      sourceRouteCoverageCount: 1
    });
  });

  it('prints a compact local audit summary for progress tracking', () => {
    const summary = formatProductDesignValidationMatrix(
      buildProductDesignValidationMatrix(process.cwd(), { freshBrowserAudit: false })
    );

    expect(summary).toContain('Product Design validation matrix:');
    expect(summary).toContain('Route tests:');
    expect(summary).toContain('Workflow route coverage:');
    expect(summary).toContain('Workflow browser evidence files:');
    expect(summary).toContain('Contract coverage: valid');
    expect(summary).toContain('Fresh Browser screenshot audit: 0/');
    expect(summary).toContain('current-run routes verified [not-complete]');
    expect(summary).toContain('Goal completion proof: incomplete');
    expect(summary).toContain('[file-contract]');
    expect(summary).toContain('Novice action evidence:');
    expect(summary).toContain('50/50');
    expect(summary).toContain('- entity:');
    expect(summary).toContain('- monitor:');
    expect(summary).not.toContain('Missing route tests:');
    expect(summary).not.toContain('Uncategorized routes:');
    expect(summary).not.toContain('Missing novice action evidence:');
  });
});
