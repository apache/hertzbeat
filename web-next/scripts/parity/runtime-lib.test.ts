import { describe, expect, it } from 'vitest';
import { DEFAULT_PARITY_RUNTIME_TARGETS, isAcceptedProbeResult } from './runtime-lib.mjs';

describe('parity runtime targets', () => {
  it('treats /overview as the required readiness route for both frontends', () => {
    expect(DEFAULT_PARITY_RUNTIME_TARGETS.next.readyPath).toBe('/overview');
    expect(DEFAULT_PARITY_RUNTIME_TARGETS.angular.readyPath).toBe('/overview');
    expect(DEFAULT_PARITY_RUNTIME_TARGETS.backend.readyPath).toBe('/api/config/system');
    expect(DEFAULT_PARITY_RUNTIME_TARGETS.backend.acceptableStatuses).toEqual([200, 401]);
    expect(DEFAULT_PARITY_RUNTIME_TARGETS.backend.probeTimeoutMs).toBe(12000);
  });

  it('rejects a login redirect when checking whether overview is actually serving', () => {
    expect(
      isAcceptedProbeResult({
        baseUrl: 'http://127.0.0.1:4200',
        readyPath: '/overview',
        acceptableStatuses: [200],
        status: 200,
        finalUrl: 'http://127.0.0.1:4200/passport/login?redirect=%2Foverview'
      })
    ).toBe(false);

    expect(
      isAcceptedProbeResult({
        baseUrl: 'http://127.0.0.1:4200',
        readyPath: '/overview',
        acceptableStatuses: [200],
        status: 200,
        finalUrl: 'http://127.0.0.1:4200/overview'
      })
    ).toBe(true);
  });
});
