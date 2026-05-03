import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ClientWorkbench } from './client-workbench';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

vi.mock('@/components/observability', () => ({
  ObservabilityStatusState: ({ title, copy }: { title: string; copy: string }) => (
    <section data-observability-status-state="true">
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
  )
}));

vi.mock('@/lib/api-client', () => ({
  getAuthorizationToken: vi.fn(() => null)
}));

vi.mock('@/lib/client-workbench-state', () => ({
  resolveWorkbenchError: vi.fn(() => ({ redirectToLogin: false, message: 'load failed' }))
}));

vi.mock('@/lib/passport-login/controller', () => ({
  buildLoginRedirectHref: vi.fn(() => '/passport/login'),
  buildLoginReturnTo: vi.fn(() => '/current')
}));

vi.mock('@/lib/workbench-load-cache', () => ({
  consumeWorkbenchLoad: vi.fn((_cacheKey: string, load: () => Promise<unknown>) => load())
}));

describe('ClientWorkbench', () => {
  it('renders a global visible pending state so slow workbenches do not look blank', () => {
    const html = renderToStaticMarkup(
      <ClientWorkbench load={() => Promise.resolve({ ready: true })} loadingTitle="链路工作台" loadingCopy="正在加载链路数据">
        {() => <div>ready</div>}
      </ClientWorkbench>
    );

    expect(html).toContain('data-client-workbench-loading="global-spinner"');
    expect(html).toContain('data-client-workbench-loading-spinner="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('链路工作台');
    expect(html).toContain('正在加载链路数据');
    expect(html).not.toContain('ready');
  });
});
