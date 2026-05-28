import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_NEXT_ROOT = resolve(__dirname, '..');

function readWebNext(path: string) {
  return readFileSync(resolve(WEB_NEXT_ROOT, path), 'utf8');
}

function existsWebNext(path: string) {
  return existsSync(resolve(WEB_NEXT_ROOT, path));
}

describe('session security and token boundary contract', () => {
  it('keeps ui session tokens behind same-origin BFF cookies instead of browser localStorage', () => {
    const apiClientSource = readWebNext('lib/api-client.ts');
    const loginFormSource = readWebNext('components/pages/login-form.tsx');
    const authGateSource = readWebNext('components/shell/auth-gate.tsx');
    const appFrameSource = readWebNext('components/shell/app-frame.tsx');
    const monitorManageSource = readWebNext('app/monitors/monitor-manage-page.tsx');

    expect(apiClientSource).toContain("credentials: 'same-origin'");
    expect(apiClientSource).not.toContain("localStorage.getItem('Authorization')");
    expect(apiClientSource).not.toContain("localStorage.getItem('refresh-token')");
    expect(apiClientSource).not.toContain("Authorization: `Bearer ${token}`");

    expect(loginFormSource).toContain('assertSessionLoginSuccess');
    expect(loginFormSource).not.toContain('persistLoginTokens(window.localStorage');

    expect(authGateSource).toContain("readClientSessionState()");
    expect(authGateSource).not.toContain("localStorage.getItem('Authorization')");

    expect(appFrameSource).toContain("clearClientSession()");
    expect(appFrameSource).not.toContain("localStorage.removeItem('Authorization')");
    expect(appFrameSource).not.toContain("localStorage.removeItem('refresh-token')");

    expect(monitorManageSource).not.toContain("Authorization: `Bearer ${token}`");
    expect(monitorManageSource).not.toContain('getAuthorizationToken');

    [
      'app/api/[...path]/route.ts',
      'app/api/account/auth/form/route.ts',
      'app/api/account/auth/refresh/route.ts',
      'app/api/account/session/route.ts',
      'lib/session-bff.ts',
      'lib/session-client.ts'
    ].forEach(path => {
      expect(existsWebNext(path), `${path} should exist`).toBe(true);
    });

    const sessionBffSource = readWebNext('lib/session-bff.ts');
    const loginRouteSource = readWebNext('app/api/account/auth/form/route.ts');
    const proxyRouteSource = readWebNext('app/api/[...path]/route.ts');
    const nextConfigSource = readWebNext('next.config.mjs');

    expect(sessionBffSource).toContain('httpOnly: true');
    expect(sessionBffSource).toContain("sameSite: 'lax'");
    expect(sessionBffSource).toContain('HB_UI_ACCESS_COOKIE');
    expect(sessionBffSource).toContain('HB_UI_REFRESH_COOKIE');
    expect(sessionBffSource).toContain('HB_UI_SESSION_MARKER_COOKIE');
    expect(loginRouteSource).toContain('applySessionCookies');
    expect(loginRouteSource).toContain('sanitizeSessionPayload');
    expect(proxyRouteSource).toContain('proxyBackendApiRequest');
    expect(nextConfigSource).not.toContain("source: '/api/:path*'");
    expect(nextConfigSource).not.toContain('destination: `${backendOrigin}/api/:path*`');
  });
});
