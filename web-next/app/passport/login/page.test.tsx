import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PassportLoginRouteState } from '@/lib/passport-login/controller';

vi.mock('@/components/pages/login-form', () => ({
  LoginForm: ({ initialRouteState }: { initialRouteState?: PassportLoginRouteState }) => (
    <div data-login-form="true" data-redirect-target={initialRouteState?.redirectTarget}>
      passport login form
    </div>
  )
}));

describe('passport login page', () => {
  it('renders the shared login form surface', async () => {
    const { default: PassportLoginPage } = await import('./page');
    const html = renderToStaticMarkup(await PassportLoginPage());

    expect(html).toContain('data-login-form="true"');
    expect(html).toContain('passport login form');
    expect(html).toContain('data-redirect-target="/"');
  });

  it('passes the normalized redirect route state to the login form', async () => {
    const { default: PassportLoginPage } = await import('./page');
    const { LoginForm } = await import('@/components/pages/login-form');
    const initialRouteState = { redirectTarget: '/monitors?app=website' };
    const mockedFormHtml = renderToStaticMarkup(<LoginForm initialRouteState={initialRouteState} />);
    const html = renderToStaticMarkup(
      await PassportLoginPage({
        searchParams: Promise.resolve({ redirect: '/monitors?app=website' })
      })
    );

    expect(mockedFormHtml).toContain('data-redirect-target="/monitors?app=website"');
    expect(html).toContain('data-redirect-target="/monitors?app=website"');
  });
});
