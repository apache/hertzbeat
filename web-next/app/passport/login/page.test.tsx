import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/pages/login-form', () => ({
  LoginForm: () => <div data-login-form="true">passport login form</div>
}));

describe('passport login page', () => {
  it('renders the shared login form surface', async () => {
    const { default: PassportLoginPage } = await import('./page');
    const html = renderToStaticMarkup(<PassportLoginPage />);

    expect(html).toContain('data-login-form="true"');
    expect(html).toContain('passport login form');
  });
});
