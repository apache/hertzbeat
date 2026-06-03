import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityPageHeader } from './page-header';

describe('observability page header', () => {
  it('uses the shared cold-workbench header tokens for operator pages', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        breadcrumbs={<span>Overview / Trace</span>}
        kicker="Trace Center"
        title="Trace manage"
        subtitle="Inspect spans and timeline evidence."
        actions={<button>Refresh</button>}
      />
    );

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).toContain('text-[22px] font-semibold');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('text-white/94');
    expect(html).not.toContain('#f3eee6');
  });

  it('can render compact fact pills for operator pages', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        kicker="Alert center"
        title="Review and handle active alerts"
        subtitle="Filter alerts by time, status, and entity."
        facts={[
          { label: 'All alert groups', value: '0' },
          { label: 'Firing', value: '0' },
          { label: 'Acknowledged', value: '0' },
          { label: 'Recovered', value: '0' }
        ]}
        factsVariant="pills"
      />
    );

    expect(html).toContain('data-observability-stat-grid="pills"');
    expect(html).toContain('rounded-[8px]');
    expect(html).toContain('All alert groups');
    expect(html).toContain('Firing');
    expect(html).not.toContain('divide-x');
    expect(html).not.toContain('border-y');
  });

  it('can render a plain text kicker while keeping the bordered operator header', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        kickerVariant="plain"
        kicker="Entity-first investigation"
        title="Import entity definitions"
        subtitle="Import multiple definitions at once."
      />
    );

    expect(html).toContain('data-observability-kicker="plain"');
    expect(html).toContain('Entity-first investigation');
    expect(html).toContain('border-b border-[var(--ops-border-color)]');
    expect(html).not.toContain('data-badge');
  });
});
