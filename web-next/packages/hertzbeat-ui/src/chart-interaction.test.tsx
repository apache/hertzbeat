// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HzTimeDistributionChart, HzTimeSeriesChart } from './index';

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

describe('chart interaction primitives', () => {
  it('selects time-series points and distribution buckets for time-window handoff', async () => {
    const onPointSelect = vi.fn();
    const onBucketSelect = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <div>
          <HzTimeSeriesChart
            title="Collector latency"
            selectedPointId="p95:14:05"
            onPointSelect={onPointSelect}
            onLegendToggle={vi.fn()}
            series={[
              {
                id: 'p95',
                label: 'p95',
                tone: 'warning',
                points: [
                  { label: '14:00', value: 92 },
                  { label: '14:05', value: 118 }
                ]
              }
            ]}
          />
          <HzTimeDistributionChart
            title="Signal volume"
            selectedBucketId="14:05"
            onBucketSelect={onBucketSelect}
            onLegendToggle={vi.fn()}
            buckets={[
              {
                id: '14:00',
                label: '14:00',
                segments: [{ id: 'metrics', label: 'metrics', value: 80, tone: 'success' }]
              },
              {
                id: '14:05',
                label: '14:05',
                segments: [{ id: 'alerts', label: 'alerts', value: 6, tone: 'warning' }]
              }
            ]}
          />
        </div>
      );
      await Promise.resolve();
    });

    const point = interactionContainer.querySelector('[aria-label="Select chart point p95 14:05 118"]') as SVGElement | null;
    const bucket = interactionContainer.querySelector('[aria-label="Select time bucket 14:05"]') as HTMLElement | null;

    expect(point).not.toBeNull();
    expect(bucket).not.toBeNull();

    await act(async () => {
      point?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      bucket?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onPointSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: '14:05', value: 118 }),
      expect.objectContaining({ id: 'p95' })
    );
    expect(onBucketSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '14:05' }));
    expect(interactionContainer.querySelector('[data-hz-chart-crosshair="p95:14:05"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-hz-bucket-selected="true"]')).not.toBeNull();
  });

  it('toggles time-series and distribution legends without relying on native chart chrome', async () => {
    const onSeriesToggle = vi.fn();
    const onSegmentToggle = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <div>
          <HzTimeSeriesChart
            title="Collector latency"
            hiddenSeriesIds={['p50']}
            onLegendToggle={onSeriesToggle}
            series={[
              {
                id: 'p50',
                label: 'p50',
                tone: 'info',
                points: [
                  { label: '14:00', value: 44 },
                  { label: '14:05', value: 48 }
                ]
              },
              {
                id: 'p95',
                label: 'p95',
                tone: 'warning',
                points: [
                  { label: '14:00', value: 92 },
                  { label: '14:05', value: 118 }
                ]
              }
            ]}
          />
          <HzTimeDistributionChart
            title="Signal volume"
            hiddenSegmentIds={['alerts']}
            onLegendToggle={onSegmentToggle}
            buckets={[
              {
                id: '14:05',
                label: '14:05',
                segments: [
                  { id: 'metrics', label: 'metrics', value: 80, tone: 'success' },
                  { id: 'alerts', label: 'alerts', value: 6, tone: 'warning' }
                ]
              }
            ]}
          />
        </div>
      );
      await Promise.resolve();
    });

    const seriesLegend = interactionContainer.querySelector('[aria-label="Toggle series p50"]') as HTMLElement | null;
    const segmentLegend = interactionContainer.querySelector('[aria-label="Toggle segment alerts"]') as HTMLElement | null;

    expect(seriesLegend).not.toBeNull();
    expect(segmentLegend).not.toBeNull();
    expect(seriesLegend?.getAttribute('data-hz-chart-legend-active')).toBe('false');
    expect(segmentLegend?.getAttribute('data-hz-chart-legend-active')).toBe('false');

    await act(async () => {
      seriesLegend?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      segmentLegend?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSeriesToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'p50' }));
    expect(onSegmentToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'alerts' }));
    expect(interactionContainer.querySelector('[data-hz-series-hidden="true"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-hz-segment-hidden="true"]')).not.toBeNull();
  });
});
