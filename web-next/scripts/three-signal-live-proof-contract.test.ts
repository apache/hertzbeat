import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('three-signal live proof script contract', () => {
  it('keeps the live proof non-destructive, reproducible, and focused on saved-view dashboard replay', () => {
    const repoRoot = resolve(process.cwd(), '..');
    const source = readFileSync(resolve(repoRoot, 'script/dev/run-three-signal-live-proof.sh'), 'utf8');

    expect(source).toContain('jdbc:h2:mem:hb_live_smoke;MODE=MYSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE');
    expect(source).toContain('script/dev/start-workspace-backend.sh');
    expect(source).toContain('script/dev/start-mixed-frontend.sh');
    expect(source).toContain('BACKEND_READY_PATH="${BACKEND_READY_PATH:-/actuator/health}"');
    expect(source).toContain('READY_ATTEMPTS="${READY_ATTEMPTS:-300}"');
    expect(source).toContain('"readyPath": "${BACKEND_READY_PATH}"');
    expect(source).toContain('wait_for_http "${HERTZBEAT_BASE}${BACKEND_READY_PATH}"');
    expect(source).toContain('|| "${status}" == "401"');
    expect(source).toContain('TRACE_ID="${TRACE_ID}" HERTZBEAT_BASE="${HERTZBEAT_BASE}" bash script/dev/verify-otlp-three-signal-demo.sh');
    expect(source).toContain('DASHBOARD_SOURCE_EDIT_LIVE_BROWSER_BASE_URL="${FRONTEND_BASE}"');
    expect(source).toContain('npm exec -- playwright test scripts/dashboard-source-edit-live-browser-smoke.spec.ts -g "${PLAYWRIGHT_GREP}"');
    expect(source).toContain('promotes logs, traces, and metrics saved views into a persisted replay dashboard|saves a service overview dashboard from URL service and entity context|saves an operation drilldown dashboard from URL operation context');
    expect(source).toContain('trap cleanup EXIT');
    expect(source).toContain('kill "${BACKEND_PID}"');
    expect(source).toContain('kill "${FRONTEND_WRAPPER_PID}"');
    expect(source).toContain('/tmp/hb-next-dev.pid');
    expect(source).toContain('--dry-run');
    expect(source).toContain('"persistentH2": false');
    expect(source).not.toContain('wait_for_http "${HERTZBEAT_BASE}/api/account/session"');
    expect(source).not.toContain('flyway repair');
    expect(source).not.toContain('rm -rf ./data');
    expect(source).not.toContain('rm -rf data');
    expect(source).not.toContain('--project=chromium');
  });
});
