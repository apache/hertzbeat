import { describe, expect, it, vi } from 'vitest';
import {
  assertLoginSuccess,
  bootstrapPostLoginSession,
  buildLoginRedirectHref,
  buildLoginRequestBody,
  buildLoginReturnTo,
  persistLoginTokens,
  resolveLoginError,
  resolvePostLoginRedirectTarget,
  sanitizeLoginRedirectTarget
} from './controller';

describe('passport login controller', () => {
  it('builds the existing login request body', () => {
    expect(buildLoginRequestBody('admin', 'hertzbeat')).toEqual({
      type: 0,
      identifier: 'admin',
      credential: 'hertzbeat'
    });
  });

  it('returns the backend message or translated fallback for login errors', () => {
    expect(resolveLoginError(401, { msg: 'bad credentials' }, 'Login failed: {{status}}')).toBe('bad credentials');
    expect(resolveLoginError(401, {}, 'Login failed: {{status}}')).toBe('Login failed: 401');
  });

  it('asserts successful login responses', () => {
    expect(
      assertLoginSuccess(200, { code: 0, data: { token: 'access', refreshToken: 'refresh' } }, 'Login failed: {{status}}')
    ).toEqual({ token: 'access', refreshToken: 'refresh' });
  });

  it('rejects failed or incomplete login responses', () => {
    expect(() => assertLoginSuccess(401, { code: 1 }, 'Login failed: {{status}}')).toThrow('Login failed: 401');
    expect(() => assertLoginSuccess(200, { code: 0, data: { token: 'access' } }, 'Login failed: {{status}}')).toThrow('Login failed: 200');
  });

  it('persists access and refresh tokens', () => {
    const storage = { setItem: vi.fn() };

    persistLoginTokens(storage, { token: 'access', refreshToken: 'refresh' });

    expect(storage.setItem).toHaveBeenNthCalledWith(1, 'Authorization', 'access');
    expect(storage.setItem).toHaveBeenNthCalledWith(2, 'refresh-token', 'refresh');
  });

  it('sanitizes login redirect targets to internal non-auth routes', () => {
    expect(sanitizeLoginRedirectTarget('/monitors?app=website')).toBe('/monitors?app=website');
    expect(sanitizeLoginRedirectTarget('/trace/manage?traceId=1#span-2')).toBe('/trace/manage?traceId=1#span-2');
    expect(
      sanitizeLoginRedirectTarget(
        '/log/manage?view=list&returnLabel=%E6%97%A5%E5%BF%97%E5%B7%A5%E4%BD%9C%E5%8F%B0&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123%26returnLabel%3D%E9%93%BE%E8%B7%AF%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      )
    ).toBe('/log/manage?view=list&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123');
    expect(sanitizeLoginRedirectTarget('https://example.com')).toBeNull();
    expect(sanitizeLoginRedirectTarget('//example.com')).toBeNull();
    expect(sanitizeLoginRedirectTarget('/passport/login')).toBeNull();
    expect(sanitizeLoginRedirectTarget('/login')).toBeNull();
  });

  it('builds and resolves login redirect targets from the current route', () => {
    expect(
      buildLoginReturnTo({
        pathname: '/monitors',
        search: '?app=website&pageIndex=2',
        hash: '#row-7'
      })
    ).toBe('/monitors?app=website&pageIndex=2#row-7');
    expect(
      buildLoginReturnTo({
        pathname: '/log/manage',
        search:
          '?view=list&returnLabel=%E6%97%A5%E5%BF%97%E5%B7%A5%E4%BD%9C%E5%8F%B0&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123%26returnLabel%3D%E9%93%BE%E8%B7%AF%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      })
    ).toBe('/log/manage?view=list&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123');

    expect(buildLoginRedirectHref('/monitors?app=website&pageIndex=2#row-7')).toBe(
      '/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite%26pageIndex%3D2%23row-7'
    );
    expect(buildLoginRedirectHref('/monitors?app=website', '/login')).toBe(
      '/login?redirect=%2Fmonitors%3Fapp%3Dwebsite'
    );
    expect(buildLoginRedirectHref('/monitors?app=website', 'https://example.com')).toBe(
      '/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite'
    );
    expect(buildLoginRedirectHref('/passport/login')).toBe('/passport/login');
    expect(buildLoginRedirectHref('/passport/login', '/login')).toBe('/login');
    expect(resolvePostLoginRedirectTarget('/monitors?app=website')).toBe('/monitors?app=website');
    expect(resolvePostLoginRedirectTarget('/passport/login')).toBe('/overview');
    expect(resolvePostLoginRedirectTarget('https://example.com')).toBe('/overview');
  });

  it('warms the post-login session bootstrap without failing on bootstrap misses', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ locale: 'en-US' });

    await expect(bootstrapPostLoginSession(apiGet as any)).resolves.toBeUndefined();
    expect(apiGet).toHaveBeenCalledWith('/config/system');

    const failingApiGet = vi.fn().mockRejectedValueOnce(new Error('bootstrap failed'));
    await expect(bootstrapPostLoginSession(failingApiGet as any)).resolves.toBeUndefined();
    expect(failingApiGet).toHaveBeenCalledWith('/config/system');
  });
});
