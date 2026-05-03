import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MonitorSignalBars, MonitorStatGrid } from './monitor-panel-primitives';

describe('monitor panel primitives', () => {
  it('renders a reusable monitor stat grid', () => {
    const html = renderToStaticMarkup(
      <MonitorStatGrid
        items={[
          { label: 'Latest value', value: '25' },
          { label: 'Delta', value: '+10' },
          { label: 'Range', value: '10 - 29' }
        ]}
      />
    );

    expect(html).toContain('Latest value');
    expect(html).toContain('25');
    expect(html).toContain('Delta');
    expect(html).toContain('+10');
    expect(html).toContain('Range');
    expect(html).toContain('10 - 29');
  });

  it('renders reusable signal bars', () => {
    const html = renderToStaticMarkup(
      <MonitorSignalBars
        items={[
          { label: 'usage', value: '72 %', widthPercent: 72 },
          { label: 'idle', value: '28 %', widthPercent: 28 }
        ]}
      />
    );

    expect(html).toContain('usage');
    expect(html).toContain('72 %');
    expect(html).toContain('idle');
    expect(html).toContain('28 %');
    expect(html).toContain('width:72%');
    expect(html).toContain('width:28%');
  });
});
