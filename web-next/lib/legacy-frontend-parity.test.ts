import { describe, expect, it } from 'vitest';
import { buildLegacyFrontendParityAudit, validateLegacyFrontendParityGate } from './legacy-frontend-parity';

describe('legacy frontend functional parity audit', () => {
  it('keeps the post-M9 frontend parity milestone closed only when stale holds and placeholders are gone', () => {
    const audit = buildLegacyFrontendParityAudit();

    expect(audit.milestone).toBe('M10');
    expect(audit.routeCoverage.catalogEntryCount).toBe(55);
    expect(audit.routeCoverage.primaryHoldRoutes).toEqual([]);
    expect(audit.routeCoverage.primaryPlaceholderRoutes).toEqual([]);
    expect(audit.releaseBlocked).toBe(false);
  });

  it('accepts action-level evidence instead of route-only coverage', () => {
    const audit = buildLegacyFrontendParityAudit();
    const result = validateLegacyFrontendParityGate(audit);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('tracks every legacy operator area before feature work continues', () => {
    const audit = buildLegacyFrontendParityAudit();
    const areas = audit.legacyAreas.map(area => area.key);

    expect(areas).toEqual([
      'global-shell',
      'overview-dashboard',
      'monitor-management',
      'monitor-detail',
      'alert-center',
      'alert-rule-authoring',
      'alert-notification',
      'public-status',
      'settings-platform',
      'entity-workbench',
      'collector-template-plugin-labels',
      'passport-auth'
    ]);
    expect(audit.legacyAreas.every(area => area.status === 'covered')).toBe(true);
  });
});
