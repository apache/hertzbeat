// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientWorkbench } from './client-workbench';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockTranslate = (key: string) => key;

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: mockTranslate
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
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  const loadingTitle = 'Trace workspace';
  const loadingCopy = 'Loading trace data';

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
    vi.useRealTimers();
  });

  it('defers the global visible pending state so quick route hops do not flash Loading workspace', () => {
    const html = renderToStaticMarkup(
      <ClientWorkbench load={() => Promise.resolve({ ready: true })} loadingTitle={loadingTitle} loadingCopy={loadingCopy}>
        {() => <div>ready</div>}
      </ClientWorkbench>
    );

    expect(html).toContain('data-client-workbench-loading="deferred"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('data-client-workbench-loading="global-spinner"');
    expect(html).not.toContain('data-client-workbench-loading-spinner="true"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain(loadingTitle);
    expect(html).not.toContain(loadingCopy);
    expect(html).not.toContain('ready');
  });

  it('reveals the route loading copy only when the load remains pending beyond the defer window', async () => {
    let resolveLoad: ((value: { ready: boolean }) => void) | null = null;
    const load = vi.fn(() => new Promise<{ ready: boolean }>(resolve => {
      resolveLoad = resolve;
    }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load} loadingTitle={loadingTitle} loadingCopy={loadingCopy} loadingDelayMs={10}>
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(loadingTitle);
    expect(container.querySelector('[data-client-workbench-loading="deferred"]')).not.toBeNull();
    expect(container.querySelector('[data-client-workbench-loading="global-spinner"]')).toBeNull();

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 15));
    });

    expect(container.querySelector('[data-client-workbench-loading="global-spinner"]')).not.toBeNull();
    expect(container.textContent).toContain(loadingTitle);
    expect(container.textContent).toContain(loadingCopy);

    await act(async () => {
      resolveLoad?.({ ready: true });
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ready');
    expect(container.querySelector('[data-client-workbench-loading="global-spinner"]')).toBeNull();
  });

  it('keeps shared workbench loading copy hidden during the deferred first paint', () => {
    const html = renderToStaticMarkup(
      <ClientWorkbench load={() => Promise.resolve({ ready: true })}>
        {() => <div>ready</div>}
      </ClientWorkbench>
    );

    expect(html).toContain('data-client-workbench-loading="deferred"');
    expect(html).not.toContain('common.workbench.loading.title');
    expect(html).not.toContain('common.workbench.loading.copy');
    expect(html).not.toContain('common.loading');
    expect(html).not.toContain('ready');
  });

  it('forwards settled cache TTL options through the shared workbench cache', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/workbench/client-workbench.tsx'), 'utf8');

    expect(source).toContain('cacheSettledTtlMs?: number');
    expect(source).toContain('consumeWorkbenchLoad(cacheKey, load, { settledTtlMs: cacheSettledTtlMs })');
    expect(source).toContain('[cacheKey, cacheSettledTtlMs, load, loadingDelayMs, reloadKey, t]');
  });

  it('lets route islands render a custom recoverable error state and retry the loader', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('monitor missing'))
      .mockResolvedValueOnce({ ready: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench
          load={load}
          renderError={(message, retry) => (
            <section data-custom-error-state="true">
              <span>{message}</span>
              <button type="button" onClick={retry}>Retry</button>
            </section>
          )}
        >
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('load failed');
    expect(container.querySelector('[data-custom-error-state="true"]')).not.toBeNull();

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('ready');
    expect(container.querySelector('[data-custom-error-state="true"]')).toBeNull();
  });

  it('lets route islands render custom loading chrome after the defer window', async () => {
    let resolveLoad: ((value: { ready: boolean }) => void) | null = null;
    const load = vi.fn(() => new Promise<{ ready: boolean }>(resolve => {
      resolveLoad = resolve;
    }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench
          load={load}
          loadingDelayMs={10}
          renderLoading={visible => (
            <section data-custom-loading-state={visible ? 'visible' : 'deferred'}>
              {visible ? 'route loading' : null}
            </section>
          )}
        >
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-custom-loading-state="deferred"]')).not.toBeNull();
    expect(container.textContent).not.toContain('route loading');

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 15));
    });

    expect(container.querySelector('[data-custom-loading-state="visible"]')).not.toBeNull();
    expect(container.textContent).toContain('route loading');

    await act(async () => {
      resolveLoad?.({ ready: true });
      await Promise.resolve();
    });

    expect(container.textContent).toContain('ready');
    expect(container.querySelector('[data-custom-loading-state]')).toBeNull();
  });
});
