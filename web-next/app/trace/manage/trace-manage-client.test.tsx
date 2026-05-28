// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import TraceManagePage from './trace-manage-page';
import type { TraceManageRouteState } from '@/lib/trace-manage/query-state';

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
      errorOnly: false
    },
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

    expect(container.querySelector('[data-trace-manage-route="otlp-cold-trace-workbench"]')).not.toBeNull();
    expect(container.textContent).toContain('No traces');
    expect(container.textContent).not.toContain('Application error');
  });
});
