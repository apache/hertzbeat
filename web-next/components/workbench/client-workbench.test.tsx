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
const i18nState = vi.hoisted(() => ({
  locale: 'en-US'
}));
const readClientSessionState = vi.hoisted(() => vi.fn(async () => ({ authenticated: true })));
const resolveWorkbenchError = vi.hoisted(() => vi.fn(() => ({ redirectToLogin: false, message: 'load failed' })));
const consumeWorkbenchLoad = vi.hoisted(() => vi.fn((_cacheKey: string, load: () => Promise<unknown>) => load()));
const forgetWorkbenchLoad = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: mockTranslate,
    locale: i18nState.locale
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
  resolveWorkbenchError
}));

vi.mock('@/lib/passport-login/controller', () => ({
  buildLoginRedirectHref: vi.fn(() => '/passport/login'),
  buildLoginReturnTo: vi.fn(() => '/current')
}));

vi.mock('@/lib/session-client', () => ({
  readClientSessionState
}));

vi.mock('@/lib/workbench-load-cache', () => ({
  consumeWorkbenchLoad,
  forgetWorkbenchLoad
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
    vi.clearAllTimers();
    vi.useRealTimers();
    i18nState.locale = 'en-US';
    consumeWorkbenchLoad.mockClear();
    forgetWorkbenchLoad.mockClear();
    readClientSessionState.mockClear();
    resolveWorkbenchError.mockReset().mockReturnValue({ redirectToLogin: false, message: 'load failed' });
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
    expect(source).toContain('loadTimeoutMs?: number');
    expect(source).toContain('const localizedCacheKey = cacheKey ? `${cacheKey}::locale:${locale}` : undefined;');
    expect(source).toContain('loadRef.current.load !== load || loadRef.current.cacheKey !== localizedCacheKey');
    expect(source).toContain('consumeWorkbenchLoad(localizedCacheKey, load, { settledTtlMs: cacheSettledTtlMs })');
    expect(source).toContain('[cacheKey, cacheSettledTtlMs, load, loadTimeoutMs, loadingDelayMs, locale, reloadKey, t]');
  });

  it('reloads with the same load function when the cache key changes', async () => {
    let loadCount = 0;
    const load = vi.fn(async () => {
      loadCount += 1;
      return { value: loadCount };
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load} cacheKey="labels:/label:0">
          {data => <div>value {data.value}</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('value 1');

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load} cacheKey="labels:/label:1">
          {data => <div>value {data.value}</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('value 2');
  });

  it('scopes settled load cache entries by active locale so localized view models do not stay stale', async () => {
    let loadCount = 0;
    const load = vi.fn(async () => {
      loadCount += 1;
      return { value: `${i18nState.locale}:${loadCount}` };
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load} cacheKey="incidents:search:fixture">
          {data => <div>value {data.value}</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(consumeWorkbenchLoad).toHaveBeenLastCalledWith(
      'incidents:search:fixture::locale:en-US',
      load,
      { settledTtlMs: undefined }
    );
    expect(container.textContent).toContain('value en-US:1');

    i18nState.locale = 'zh-CN';

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load} cacheKey="incidents:search:fixture">
          {data => <div>value {data.value}</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(consumeWorkbenchLoad).toHaveBeenLastCalledWith(
      'incidents:search:fixture::locale:zh-CN',
      load,
      { settledTtlMs: undefined }
    );
    expect(container.textContent).toContain('value zh-CN:2');
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

  it('converges hanging route loads into a retryable timeout state and evicts the pending cache entry', async () => {
    vi.useFakeTimers();
    resolveWorkbenchError.mockImplementationOnce((error: unknown) => ({
      redirectToLogin: false,
      message: error instanceof Error ? error.message : 'load timed out'
    }));
    const load = vi.fn(() => new Promise<{ ready: boolean }>(() => {}));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench
          load={load}
          cacheKey="entity-detail:/entities/42/detail"
          loadTimeoutMs={10}
          loadingDelayMs={0}
          renderError={(message, retry) => (
            <section data-timeout-error-state="true">
              <span>{message}</span>
              <button type="button" onClick={retry}>Retry</button>
            </section>
          )}
        >
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(forgetWorkbenchLoad).toHaveBeenCalledWith('entity-detail:/entities/42/detail::locale:en-US');
    expect(resolveWorkbenchError).toHaveBeenCalledWith(expect.any(Error), false, expect.any(Function));
    expect(container.querySelector('[data-timeout-error-state="true"]')).not.toBeNull();
    expect(container.textContent).toContain('common.workbench.load-timeout');
    expect(container.textContent).not.toContain('ready');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('rechecks the BFF session after a successful load so stale shells can converge', async () => {
    const load = vi.fn(async () => ({ ready: true }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load}>
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(readClientSessionState).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('ready');
  });

  it('keeps the successful load session recheck wired to the shared login redirect helper', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/workbench/client-workbench.tsx'), 'utf8');
    const successPath = source.slice(source.indexOf('.then(result => {'), source.indexOf('.catch(err => {'));

    expect(successPath).toContain('setData(result);');
    expect(successPath).toContain('void readClientSessionState().then(session => {');
    expect(successPath).toContain('if (cancelled || session.authenticated) return;');
    expect(successPath).toContain('const returnTo = buildLoginReturnTo(window.location);');
    expect(successPath).toContain('window.location.href = buildLoginRedirectHref(returnTo, process.env.NEXT_PUBLIC_LOGIN_PATH);');
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

  it('does not leave the workbench blank when an unauthorized load still has a stale local session marker', async () => {
    resolveWorkbenchError.mockReturnValueOnce({ redirectToLogin: true, message: null });
    readClientSessionState.mockResolvedValueOnce({ authenticated: true });
    const load = vi.fn().mockRejectedValueOnce(new Error('API request failed: 401'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ClientWorkbench load={load}>
          {() => <div>ready</div>}
        </ClientWorkbench>
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(readClientSessionState).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-observability-status-state="true"]')).not.toBeNull();
    expect(container.textContent).toContain('common.load-failed');
    expect(container.textContent).toContain('common.api.request-failed-status');
    expect(container.textContent).not.toContain('ready');
    expect(container.querySelector('[data-client-workbench-loading="deferred"]')).toBeNull();
  });
});
