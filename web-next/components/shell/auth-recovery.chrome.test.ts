import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('auth recovery posture', () => {
  it('keeps protected-route login recovery on the shared controller-owned login-path fallback', () => {
    const authGateSource = readFileSync(resolve(process.cwd(), 'components/shell/auth-gate.tsx'), 'utf8');
    const appFrameSource = readFileSync(resolve(process.cwd(), 'components/shell/app-frame.tsx'), 'utf8');
    const clientWorkbenchSource = readFileSync(resolve(process.cwd(), 'components/workbench/client-workbench.tsx'), 'utf8');

    expect(authGateSource).toContain('buildLoginRedirectHref');
    expect(authGateSource).toContain('process.env.NEXT_PUBLIC_LOGIN_PATH');
    expect(authGateSource).not.toContain("process.env.NEXT_PUBLIC_LOGIN_PATH || '/passport/login'");
    expect(appFrameSource).toContain('buildLoginRedirectHref');
    expect(appFrameSource).toContain('process.env.NEXT_PUBLIC_LOGIN_PATH');
    expect(appFrameSource).not.toContain("window.location.href = '/passport/login'");
    expect(clientWorkbenchSource).toContain('buildLoginRedirectHref');
    expect(clientWorkbenchSource).toContain('process.env.NEXT_PUBLIC_LOGIN_PATH');
    expect(clientWorkbenchSource).not.toContain("process.env.NEXT_PUBLIC_LOGIN_PATH || '/passport/login'");
  });

  it('does not render a standalone session restore card while auth state is resolving', () => {
    const authGateSource = readFileSync(resolve(process.cwd(), 'components/shell/auth-gate.tsx'), 'utf8');

    expect(authGateSource).not.toContain('common.session.restore');
    expect(authGateSource).not.toContain('Restoring your workspace');
    expect(authGateSource).not.toContain('max-w-lg');
  });

  it('lets topology preheat protected content when a local session marker exists while still verifying the BFF session', () => {
    const authGateSource = readFileSync(resolve(process.cwd(), 'components/shell/auth-gate.tsx'), 'utf8');
    const sessionClientSource = readFileSync(resolve(process.cwd(), 'lib/session-client.ts'), 'utf8');

    expect(authGateSource).toContain('shouldOptimisticallyRenderProtectedRoute(pathname)');
    expect(authGateSource).toContain('hasClientSessionMarker()');
    expect(authGateSource).toContain("pathname === '/topology' || pathname.startsWith('/topology/')");
    expect(authGateSource).toContain('useState(optimisticRender)');
    expect(authGateSource).toContain('readClientSessionState().then(session =>');
    expect(authGateSource).toContain('window.location.href = buildLoginRedirectHref');
    expect(sessionClientSource).toContain('export function hasClientSessionMarker()');
    expect(sessionClientSource).toContain("trimmed.startsWith('hb_ui_session=')");
  });
});
