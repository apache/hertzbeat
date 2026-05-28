// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HzTraceWaterfall } from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let interactionRoot: Root | null = null;
let interactionContainer: HTMLDivElement | null = null;

afterEach(() => {
  if (interactionRoot) {
    act(() => {
      interactionRoot?.unmount();
    });
  }
  interactionRoot = null;
  interactionContainer?.remove();
  interactionContainer = null;
});

describe('HzTraceWaterfall interaction', () => {
  it('selects spans from the shared-scale waterfall rows', async () => {
    const onSpanSelect = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <HzTraceWaterfall
          title="Trace waterfall"
          onSpanSelect={onSpanSelect}
          selectedSpanId="collector"
          criticalPathSpanIds={['api', 'collector']}
          spans={[
            { id: 'api', service: 'hertzbeat-api', operation: 'POST /api/monitors/detect', startMs: 0, durationMs: 126, selfMs: 18, tone: 'info' },
            { id: 'collector', service: 'collector-a', operation: 'mysql.collect', startMs: 42, durationMs: 68, selfMs: 52, parentId: 'api', depth: 1, tone: 'warning' }
          ]}
        />
      );
      await Promise.resolve();
    });

    const apiRow = interactionContainer.querySelector('[aria-label="Select trace span api"]') as HTMLElement | null;
    expect(apiRow).not.toBeNull();

    await act(async () => {
      apiRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSpanSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'api',
        startMs: 0,
        durationMs: 126
      })
    );
    expect(interactionContainer.querySelector('[data-hz-waterfall-scale="global"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-hz-span-link="api->collector"]')).not.toBeNull();
  });
});
