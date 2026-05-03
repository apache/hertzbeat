import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityTimeline } from './timeline';

describe('observability timeline', () => {
  it('renders timeline items with title, detail, and timestamp', () => {
    const html = renderToStaticMarkup(
      <ObservabilityTimeline
        items={[
          { title: 'metrics event', detail: 'Received metric batch', timestamp: '2026-04-12 20:00', tone: 'success' },
          { title: 'logs event', detail: 'Received log batch', timestamp: '2026-04-12 20:01', tone: 'info' }
        ]}
      />
    );

    expect(html).toContain('metrics event');
    expect(html).toContain('Received metric batch');
    expect(html).toContain('2026-04-12 20:00');
    expect(html).toContain('logs event');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('border-white/8');
    expect(html).not.toContain('bg-black/10');
    expect(html).not.toContain('text-white/62');
  });
});
