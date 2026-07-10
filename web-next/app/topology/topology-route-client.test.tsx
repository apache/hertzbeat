// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopologyRouteClient from './topology-route-client';
import { preloadTopologyGraph, resolveTopologyApiTimeoutMs } from '../../lib/topology-surface/controller';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockTopologyPage({ routeContext }: { routeContext?: { scaleProof?: string; entityId?: string } }) {
      return (
        <div
          data-topology-dynamic-page="mock"
          data-topology-dynamic-page-entity-id={routeContext?.entityId ?? ''}
          data-topology-dynamic-page-scale-proof={routeContext?.scaleProof ?? ''}
        />
      );
    }
}));

vi.mock('@hertzbeat/ui/topology-g6-runtime', () => ({
  preloadHzTopologyG6Runtime: vi.fn()
}));

vi.mock('../../lib/topology-surface/controller', () => ({
  preloadTopologyGraph: vi.fn(),
  resolveTopologyApiTimeoutMs: vi.fn(() => 60000)
}));

describe('TopologyRouteClient', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.mocked(preloadTopologyGraph).mockReset();
    vi.mocked(resolveTopologyApiTimeoutMs).mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
    document.body.innerHTML = '';
  });

  it('preloads ordinary topology routes before the heavy G6 page renders', async () => {
    const shell = document.createElement('div');
    shell.id = 'topology-route-deferred-shell';
    document.body.appendChild(shell);
    root = createRoot(container!);

    await act(async () => {
      root?.render(
        <TopologyRouteClient
          shellElementId="topology-route-deferred-shell"
          routeContext={{
            entityId: '501',
            environment: 'prod',
            sourceKind: 'otlp-trace-call',
            viewMode: 'service-call',
            timeRange: 'last-1h'
          }}
        />
      );
    });

    expect(preloadTopologyGraph).toHaveBeenCalledTimes(1);
    expect(preloadTopologyGraph).toHaveBeenCalledWith(
      {
        entityId: '501',
        environment: 'prod',
        sourceKind: 'otlp-trace-call',
        viewMode: 'service-call',
        timeRange: 'last-1h'
      },
      { timeoutMs: 60000 }
    );
    expect(resolveTopologyApiTimeoutMs).toHaveBeenCalledWith(
      expect.objectContaining({ sourceKind: 'otlp-trace-call', viewMode: 'service-call' })
    );
    expect(shell.hasAttribute('hidden')).toBe(true);
    expect(container?.innerHTML).toContain('data-topology-route-client-prefetch="topology-api-before-heavy-page"');
    expect(container?.innerHTML).not.toContain('data-topology-route-client-scale-proof-prefetch="skipped"');
    expect(container?.innerHTML).toContain('data-topology-dynamic-page-entity-id="501"');
  });

  it('skips route prefetch for local scale-proof runs so large seeded graphs are loaded once by the page', async () => {
    root = createRoot(container!);

    await act(async () => {
      root?.render(
        <TopologyRouteClient
          routeContext={{
            environment: 'prod',
            sourceKind: 'otlp-trace-call',
            viewMode: 'service-call',
            timeRange: 'last-7d',
            scaleProof: 'mixed-star-mesh'
          }}
        />
      );
    });

    expect(preloadTopologyGraph).not.toHaveBeenCalled();
    expect(resolveTopologyApiTimeoutMs).not.toHaveBeenCalled();
    expect(container?.innerHTML).toContain('data-topology-route-client-prefetch="topology-api-before-heavy-page"');
    expect(container?.innerHTML).toContain('data-topology-route-client-scale-proof-prefetch="skipped"');
    expect(container?.innerHTML).toContain('data-topology-dynamic-page-scale-proof="mixed-star-mesh"');
  });
});
