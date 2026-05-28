import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityTabStrip } from './tab-strip';

describe('observability tab strip', () => {
  it('renders shared tabs and selected state', () => {
    const html = renderToStaticMarkup(
      <ObservabilityTabStrip
        items={[
          { key: 'realtime', label: 'Realtime' },
          { key: 'history', label: 'History' }
        ]}
        selectedKey="history"
        onSelect={() => {}}
      />
    );

    expect(html).toContain('Realtime');
    expect(html).toContain('History');
    expect(html).toContain('data-tab="realtime"');
    expect(html).toContain('data-selected-tab="history"');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('text-white/92');
    expect(html).not.toContain('border-white/10');
  });

  it('renders operator extras on the same tab-bar row', () => {
    const html = renderToStaticMarkup(
      <ObservabilityTabStrip
        items={[
          { key: 'realtime', label: 'Realtime' },
          { key: 'history', label: 'History' }
        ]}
        selectedKey="realtime"
        onSelect={() => {}}
        tone="operator"
        extra={<div data-test-extra="true">Refresh controls</div>}
      />
    );

    expect(html).toContain('data-observability-tabstrip-extra="true"');
    expect(html).toContain('aria-label="Tab navigation"');
    expect(html).toContain('data-observability-tabstrip-extra-slot="true"');
    expect(html.indexOf('role="tablist"')).toBeLessThan(html.indexOf('data-observability-tabstrip-extra-slot="true"'));
    expect(html).toContain('Refresh controls');
  });

  it('lets callers override the shared tablist aria label', () => {
    const html = renderToStaticMarkup(
      <ObservabilityTabStrip
        items={[
          { key: 'realtime', label: 'Realtime' },
          { key: 'history', label: 'History' }
        ]}
        selectedKey="realtime"
        onSelect={() => {}}
        tone="operator"
        ariaLabel="Monitor evidence tabs"
      />
    );

    expect(html).toContain('aria-label="Monitor evidence tabs"');
    expect(html).not.toContain('aria-label="Tab navigation"');
  });

  it('can render Angular-style card tabs without the line-tab underline affordance', () => {
    const html = renderToStaticMarkup(
      <ObservabilityTabStrip
        items={[
          { key: 'realtime', label: 'Realtime' },
          { key: 'history', label: 'History' },
          { key: 'favorite', label: 'Favorite' }
        ]}
        selectedKey="history"
        onSelect={() => {}}
        tone="operator"
        variant="card"
        extra={<div data-test-extra="true">Refresh controls</div>}
      />
    );

    expect(html).toContain('data-observability-tabstrip-variant="card"');
    expect(html).toContain('data-observability-tabstrip-card="angular-nz-card"');
    expect(html).toContain('data-observability-tab-card="true"');
    expect(html).toContain('data-observability-tab-card-selected="true"');
    expect(html).toContain('data-selected-tab="history"');
    expect(html).toContain('rounded-b-none');
    expect(html).not.toContain('data-observability-tab-indicator="underline"');
    expect(html).not.toContain('pb-2.5 pr-4');
  });
});
