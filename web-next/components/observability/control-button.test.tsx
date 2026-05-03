import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityControlButton } from './control-button';

describe('observability control button', () => {
  it('renders shared control button states', () => {
    const html = renderToStaticMarkup(
      <ObservabilityControlButton selected disabled={false} onClick={() => {}}>
        Refresh
      </ObservabilityControlButton>
    );

    expect(html).toContain('Refresh');
    expect(html).toContain('border-[var(--ops-primary)]');
    expect(html).toContain('bg-[var(--ops-surface-raised)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
  });

  it('keeps the unselected operator tone on shared ops tokens', () => {
    const html = renderToStaticMarkup(
      <ObservabilityControlButton tone="operator" onClick={() => {}}>
        Toggle rail
      </ObservabilityControlButton>
    );

    expect(html).toContain('Toggle rail');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('hover:border-[var(--ops-primary)]');
  });

  it('supports plain toolbar actions without boxed control chrome', () => {
    const html = renderToStaticMarkup(
      <ObservabilityControlButton
        tone="operator"
        variant="plain"
        className="h-6 px-0 py-0"
        data-monitor-realtime-expand-action-density="plain-link"
        onClick={() => {}}
      >
        Fullscreen
      </ObservabilityControlButton>
    );

    expect(html).toContain('Fullscreen');
    expect(html).toContain('data-observability-control-button-variant="plain"');
    expect(html).toContain('data-monitor-realtime-expand-action-density="plain-link"');
    expect(html).toContain('border-0');
    expect(html).toContain('bg-transparent');
    expect(html).toContain('px-0');
    expect(html).toContain('py-0');
    expect(html).not.toContain('border-[var(--ops-border-color)]');
    expect(html).not.toContain('hover:border-[var(--ops-primary)]');
  });
});
