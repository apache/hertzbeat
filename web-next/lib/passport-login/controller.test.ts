import { describe, expect, it, vi } from 'vitest';
import {
  assertLoginSuccess,
  assertSessionLoginSuccess,
  bootstrapPostLoginSession,
  buildLoginCompatRouteUrl,
  buildLoginRedirectHref,
  buildLoginRequestBody,
  buildLoginReturnTo,
  buildPostLoginSessionUser,
  readPassportLoginRouteState,
  resolveLoginError,
  resolvePostLoginRedirectTarget,
  resolvePostLoginStartupFailureTarget,
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

  it('accepts BFF-cookie login success without exposing tokens to the browser', () => {
    expect(
      assertSessionLoginSuccess(200, { code: 0, data: { authenticated: true } }, 'Login failed: {{status}}')
    ).toBeUndefined();

    expect(() => assertSessionLoginSuccess(401, { code: 1 }, 'Login failed: {{status}}')).toThrow('Login failed: 401');
    expect(() => assertSessionLoginSuccess(200, { code: 1, msg: 'denied' }, 'Login failed: {{status}}')).toThrow('denied');
  });

  it('builds the Angular-style post-login user snapshot from the raw submitted identifier', () => {
    expect(
      buildPostLoginSessionUser(' ops-admin ', {
        code: 0,
        data: {
          authenticated: true,
          tokenBoundary: 'bff-cookie',
          role: 'ADMIN'
        }
      })
    ).toEqual({
      name: ' ops-admin ',
      avatar: './assets/img/avatar.svg',
      email: 'administrator',
      role: 'ADMIN'
    });

    expect(buildPostLoginSessionUser('   ', { code: 0, data: { authenticated: true } })).toEqual({
      name: '   ',
      avatar: './assets/img/avatar.svg',
      email: 'administrator'
    });

    expect(buildPostLoginSessionUser('', { code: 0, data: { authenticated: true } })).toEqual({
      name: 'admin',
      avatar: './assets/img/avatar.svg',
      email: 'administrator'
    });
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
    expect(resolvePostLoginRedirectTarget('/passport/login')).toBe('/');
    expect(resolvePostLoginRedirectTarget('https://example.com')).toBe('/');
    expect(resolvePostLoginRedirectTarget('/passport/login', '/overview')).toBe('/overview');
    expect(resolvePostLoginStartupFailureTarget()).toBe('/exception/500');
  });

  it('builds the compatibility login alias URL while preserving guard context', () => {
    expect(buildLoginCompatRouteUrl()).toBe('/passport/login');
    expect(buildLoginCompatRouteUrl({ redirect: '/monitors?app=website', source: 'guard' })).toBe(
      '/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite&source=guard'
    );
    expect(buildLoginCompatRouteUrl({ redirect: '/trace/manage?traceId=1', returnLabel: 'Login' })).toBe(
      '/passport/login?redirect=%2Ftrace%2Fmanage%3FtraceId%3D1'
    );
  });

  it('normalizes multi-value URL search params into the first passport login redirect target', () => {
    expect(
      readPassportLoginRouteState({
        redirect: ['/monitors?app=website', '/trace/manage?traceId=1'],
        returnLabel: ['Login', 'Ignored']
      })
    ).toEqual({
      redirectTarget: '/monitors?app=website'
    });

    expect(
      readPassportLoginRouteState({
        redirect: ['https://evil.example', '/monitors?app=website']
      })
    ).toEqual({
      redirectTarget: '/'
    });
  });

  it('warms the post-login session bootstrap after login success', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, data: { locale: 'zh_CN' } })
      .mockResolvedValueOnce({ code: 0, data: [] });

    await expect(bootstrapPostLoginSession(apiGet as any)).resolves.toBeUndefined();
    expect(apiGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/apps/hierarchy?lang=zh-CN');

    const failingApiGet = vi
      .fn()
      .mockRejectedValueOnce(new Error('bootstrap failed'))
      .mockResolvedValueOnce({ code: 0, data: [] });
    await expect(bootstrapPostLoginSession(failingApiGet as any)).resolves.toBeUndefined();
    expect(failingApiGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(failingApiGet).toHaveBeenNthCalledWith(2, '/apps/hierarchy?lang=en-US');
  });

  it('preserves Angular startup failure routing when the hierarchy bootstrap fails', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, data: { locale: 'zh_CN' } })
      .mockRejectedValueOnce(new Error('hierarchy failed'));

    await expect(bootstrapPostLoginSession(apiGet as any)).rejects.toThrow('hierarchy failed');
    expect(apiGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/apps/hierarchy?lang=zh-CN');
  });
});
