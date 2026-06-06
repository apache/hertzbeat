// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import TraceManagePage from './trace-manage-page';
import type { TraceManageRouteState } from '@/lib/trace-manage/query-state';
import { resetWorkbenchLoadCache } from '@/lib/workbench-load-cache';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMessageGet = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/session-client', () => ({
  readClientSessionState: vi.fn(async () => ({ authenticated: true })),
  clearClientSessionMarker: vi.fn()
}));

function monitorTraceRouteState(): TraceManageRouteState {
  return {
    initialQuery: {
      traceId: '',
      spanId: '',
      serviceName: '',
      errorOnly: false,
      spanScope: 'root'
    },
    currentView: 'list',
    routeContext: {
      returnTo: '/monitors/640360126405888?app=mysql&pageIndex=0&pageSize=8&returnTo=%2Fmonitors',
      monitorId: '640360126405888',
      monitorName: 'Dreamy_Elk_68Ae_copy_copy_copy_copy',
      monitorApp: 'mysql',
      monitorInstance: '127.0.0.1:3306',
      source: 'monitor'
    },
    shouldCleanUrl: false
  };
}

describe('TraceManagePage client loading', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    resetWorkbenchLoadCache();
    apiMessageGet.mockReset();
    replace.mockReset();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
  });

  it('does not crash when monitor handoff trace APIs return empty or missing payloads', async () => {
    apiMessageGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={monitorTraceRouteState()} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]')).not.toBeNull();
    expect(container.textContent).toContain('No traces');
    expect(container.textContent).not.toContain('Application error');
  });

  it('renders the topology-like trace shell when the trace API load degrades', async () => {
    apiMessageGet.mockRejectedValueOnce(new Error('Trace API request failed'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={monitorTraceRouteState()} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-signal-workbench-shell-layout="topology-workbench"]')).not.toBeNull();
    expect(container.querySelector('[data-trace-manage-api-degraded="true"]')).not.toBeNull();
    expect(container.querySelector('[data-trace-manage-api-degraded-owner="hertzbeat-ui-state-notice"]')).not.toBeNull();
    expect(container.textContent).toContain('Trace API unavailable');
    expect(container.textContent).toContain('Trace API request failed');
    expect(container.textContent).not.toContain('Application error');
  });

  it('opens trace detail with inspectable selected span and resource attributes', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      })
      .mockResolvedValueOnce({
        traceId: 'trace-attrs',
        rootSpanId: 'span-root',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        rootSpanName: 'POST /checkout',
        durationNanos: 420_000_000,
        status: 'OK',
        startTime: 1713200000000,
        resourceAttributes: {
          'service.name': 'checkout'
        },
        spans: []
      })
      .mockResolvedValueOnce([
        {
          traceId: 'trace-attrs',
          spanId: 'span-root',
          spanName: 'POST /checkout',
          serviceName: 'checkout',
          status: 'OK',
          spanKind: 'SERVER',
          durationNanos: 420_000_000,
          startTime: 1713200000000,
          resourceAttributes: {
            'service.namespace': 'payments',
            'deployment.environment.name': 'prod'
          },
          spanAttributes: {
            'http.route': '/checkout/:id',
            'http.method': 'POST'
          },
          events: [],
          links: []
        }
      ]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={monitorTraceRouteState()} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const openDetailAction = container.querySelector('[data-trace-manage-open-detail-action="side-waterfall-modal"]') as HTMLButtonElement | null;
    expect(openDetailAction).not.toBeNull();

    await act(async () => {
      openDetailAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const drawerRoot = document.body.querySelector('[data-trace-manage-detail-drawer="waterfall-side-modal"]') as HTMLElement | null;
    const spanAttributes = document.body.querySelector('[data-trace-manage-drawer-span-attributes="span-attributes"]') as HTMLElement | null;
    const resourceAttributes = document.body.querySelector('[data-trace-manage-drawer-resource-attributes="resource-attributes"]') as HTMLElement | null;

    expect(drawerRoot).not.toBeNull();
    expect(spanAttributes?.getAttribute('data-trace-manage-drawer-span-attributes-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(resourceAttributes?.getAttribute('data-trace-manage-drawer-resource-attributes-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(spanAttributes?.textContent).toContain('Span attributes');
    expect(spanAttributes?.textContent).toContain('http.method');
    expect(spanAttributes?.textContent).toContain('POST');
    expect(spanAttributes?.textContent).toContain('http.route');
    expect(spanAttributes?.textContent).toContain('/checkout/:id');
    expect(resourceAttributes?.textContent).toContain('Resource attributes');
    expect(resourceAttributes?.textContent).toContain('deployment.environment.name');
    expect(resourceAttributes?.textContent).toContain('prod');
    expect(resourceAttributes?.textContent).toContain('service.namespace');
    expect(resourceAttributes?.textContent).toContain('payments');
  });

  it('narrows trace table rows by service from the row cell', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';
    routeState.initialQuery.operationName = 'POST /checkout';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const serviceAction = container.querySelector('[data-trace-manage-table-service-filter-action="checkout"]') as HTMLButtonElement | null;
    expect(serviceAction).not.toBeNull();
    expect(serviceAction?.getAttribute('data-trace-manage-service-cell-owner')).toBe('hertzbeat-ui-button');
    expect(serviceAction?.getAttribute('aria-label')).toContain('checkout');

    await act(async () => {
      serviceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
  });

  it('narrows trace table rows by operation from the root span cell', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.serviceName = 'checkout';
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const operationAction = container.querySelector('[data-trace-manage-table-operation-filter-action="POST /checkout"]') as HTMLButtonElement | null;
    expect(operationAction).not.toBeNull();
    expect(operationAction?.getAttribute('data-trace-manage-table-operation-filter-owner')).toBe('hertzbeat-ui-button');
    expect(operationAction?.getAttribute('aria-label')).toContain('POST /checkout');

    await act(async () => {
      operationAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
  });

  it('narrows trace table rows by minimum duration from the duration cell', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.serviceName = 'checkout';
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';
    routeState.initialQuery.operationName = 'POST /checkout';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const durationAction = container.querySelector('[data-trace-manage-table-duration-filter-action="420"]') as HTMLButtonElement | null;
    expect(durationAction).not.toBeNull();
    expect(durationAction?.getAttribute('data-trace-manage-table-duration-filter-owner')).toBe('hertzbeat-ui-button');
    expect(durationAction?.getAttribute('aria-label')).toContain('420ms');

    await act(async () => {
      durationAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
    expect(href).toContain('minDurationMs=420');
  });

  it('narrows trace table rows to error status from the status cell', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 1,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-error',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'ERROR',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.serviceName = 'checkout';
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';
    routeState.initialQuery.operationName = 'POST /checkout';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const statusAction = container.querySelector('[data-trace-manage-table-status-filter-action="ERROR"]') as HTMLButtonElement | null;
    expect(statusAction).not.toBeNull();
    expect(statusAction?.getAttribute('data-trace-manage-table-status-filter-owner')).toBe('hertzbeat-ui-button');
    expect(statusAction?.getAttribute('aria-label')).toContain('ERROR');

    await act(async () => {
      statusAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
    expect(href).toContain('errorOnly=true');
  });

  it('narrows trace table rows to a selected trace id from the trace-id cell', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.serviceName = 'checkout';
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';
    routeState.initialQuery.operationName = 'POST /checkout';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const traceIdAction = container.querySelector('[data-trace-manage-table-trace-id-filter-action="trace-attrs"]') as HTMLButtonElement | null;
    expect(traceIdAction).not.toBeNull();
    expect(traceIdAction?.getAttribute('data-trace-manage-table-trace-id-filter-owner')).toBe('hertzbeat-ui-button');
    expect(traceIdAction?.getAttribute('aria-label')).toContain('trace-attrs');

    await act(async () => {
      traceIdAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('traceId=trace-attrs');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
  });

  it('replaces trace resource filters from the detail drawer attributes', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      })
      .mockResolvedValueOnce({
        traceId: 'trace-attrs',
        rootSpanId: 'span-root',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        rootSpanName: 'POST /checkout',
        durationNanos: 420_000_000,
        status: 'OK',
        startTime: 1713200000000,
        resourceAttributes: {},
        spans: []
      })
      .mockResolvedValueOnce([
        {
          traceId: 'trace-attrs',
          spanId: 'span-root',
          spanName: 'POST /checkout',
          serviceName: 'checkout',
          status: 'OK',
          spanKind: 'SERVER',
          durationNanos: 420_000_000,
          startTime: 1713200000000,
          resourceAttributes: {
            'service.namespace': 'payments'
          },
          spanAttributes: {},
          events: [],
          links: []
        }
      ]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.resourceFilter = 'old.attr=stale';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const openDetailAction = container.querySelector('[data-trace-manage-open-detail-action="side-waterfall-modal"]') as HTMLButtonElement | null;
    await act(async () => {
      openDetailAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const replaceAction = document.body.querySelector(
      '[data-trace-manage-drawer-resource-replace-action="true"][data-trace-manage-drawer-resource-filter-name="service.namespace"]'
    ) as HTMLButtonElement | null;
    expect(replaceAction).not.toBeNull();
    expect(replaceAction?.getAttribute('data-trace-manage-drawer-resource-replace-action-owner')).toBe('hertzbeat-ui-button');
    expect(replaceAction?.getAttribute('aria-label')).toContain('service.namespace');

    await act(async () => {
      replaceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('resourceFilter=service.namespace%3Dpayments');
    expect(href).not.toContain('old.attr');
  });

  it('narrows traces to the selected drawer span operation', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        totalTraceCount: 1,
        errorTraceCount: 0,
        latestObservedAt: 1713200000000,
        hasActiveTrace: true
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-attrs',
            rootSpanId: 'span-root',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420_000_000,
            status: 'OK',
            startTime: 1713200000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      })
      .mockResolvedValueOnce({
        traceId: 'trace-attrs',
        rootSpanId: 'span-root',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        rootSpanName: 'POST /checkout',
        durationNanos: 420_000_000,
        status: 'OK',
        startTime: 1713200000000,
        resourceAttributes: {},
        spans: []
      })
      .mockResolvedValueOnce([
        {
          traceId: 'trace-attrs',
          spanId: 'span-root',
          spanName: 'POST /checkout',
          serviceName: 'checkout',
          status: 'OK',
          spanKind: 'SERVER',
          durationNanos: 420_000_000,
          startTime: 1713200000000,
          resourceAttributes: {
            'service.namespace': 'payments'
          },
          spanAttributes: {
            'http.route': '/checkout/:id'
          },
          events: [],
          links: []
        }
      ]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const routeState = monitorTraceRouteState();
    routeState.initialQuery.serviceName = 'checkout';
    routeState.initialQuery.resourceFilter = 'service.version=1.2.3';

    await act(async () => {
      root?.render(<TraceManagePage initialRouteState={routeState} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const openDetailAction = container.querySelector('[data-trace-manage-open-detail-action="side-waterfall-modal"]') as HTMLButtonElement | null;
    await act(async () => {
      openDetailAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const operationFilterAction = document.body.querySelector(
      '[data-trace-manage-drawer-operation-filter-action="true"][data-trace-manage-drawer-operation-filter-value="POST /checkout"]'
    ) as HTMLButtonElement | null;
    expect(operationFilterAction).not.toBeNull();
    expect(operationFilterAction?.getAttribute('data-trace-manage-drawer-operation-filter-action-owner')).toBe('hertzbeat-ui-button');
    expect(operationFilterAction?.getAttribute('aria-label')).toContain('POST /checkout');
    replace.mockClear();

    await act(async () => {
      operationFilterAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const href = String(replace.mock.calls.at(-1)?.[0]);
    expect(href).toContain('/trace/manage?');
    expect(href).toContain('serviceName=checkout');
    expect(href).toContain('resourceFilter=service.version%3D1.2.3');
    expect(href).toContain('operationName=POST+%2Fcheckout');
  });
});
