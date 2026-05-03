import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSmokeSource(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8');
}

describe('returnLabel browser smoke guard fixtures', () => {
  it('names legacy dirty-input returnLabel routes explicitly', () => {
    const logSmokeSource = readSmokeSource('scripts/log-manage-browser-smoke.spec.ts');
    const monitorSmokeSource = readSmokeSource('scripts/monitor-route-browser-smoke.spec.ts');

    expect(logSmokeSource).toContain('legacyReturnLabelProtectedRoute');
    expect(logSmokeSource).not.toMatch(/const\s+protectedRoute\s*=\s*\n\s*['"`][\s\S]*?returnLabel=/);

    expect(monitorSmokeSource).toContain('buildLegacyReturnLabelMonitorDetailRoute');
    expect(monitorSmokeSource).not.toMatch(/const\s+detailRoute\s*=\s*\n\s*['"`][\s\S]*?returnLabel=/);
  });
});
