import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  OverviewStatusGrid,
  OverviewGuidancePanel,
  OverviewChecklist,
  OverviewImpactedList,
  OverviewSummaryGrid
} from './overview-console';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

describe('overview console primitives', () => {
  it('renders shared Angular-style summary and guidance contracts', () => {
    const summaryHtml = renderToStaticMarkup(
      <OverviewSummaryGrid
        items={[
          {
            key: 'critical',
            label: 'High-priority alerts',
            value: '2',
            hint: 'Check whether these signals already give enough detail to act.',
            delta: 'Critical pressure is still active',
            tone: 'danger'
          }
        ]}
      />
    );

    const guidanceHtml = renderToStaticMarkup(
      <OverviewGuidancePanel
        headline="Next: work the most important issue first"
        description="Start with the current issue and review related entities and signals."
        primaryAction={<button>Details</button>}
        secondaryAction={<button>Alerts</button>}
        reasons={[{ label: 'Entities in scope', value: '12' }]}
        nextLinks={[{ label: 'Logs', description: 'Keep the current time range and continue in logs.', href: '/log/manage' }]}
      />
    );

    const compactGuidanceHtml = renderToStaticMarkup(
      <OverviewGuidancePanel
        headline="Next: connect one working signal path"
        description="Complete one usable signal path first so this page can start showing issues and next steps."
        primaryAction={<button>Finish onboarding</button>}
        reasons={[
          { label: 'Logs', value: 'Pending' },
          { label: 'Traces', value: 'Pending' },
          { label: 'Metrics', value: 'Pending' }
        ]}
        nextLinks={[]}
        compactReasons
        density="compact"
        reasonDensity="compact"
      />
    );

    const customGuidanceHtml = renderToStaticMarkup(
      <OverviewGuidancePanel
        headline="Next: preserve caller-owned labels"
        description="Custom labels are still passed through by callers that own this workflow language."
        reasons={[{ label: 'Source', value: 'Caller' }]}
        nextLinks={[{ label: 'Review', href: '/overview' }]}
        startLabel="Custom start"
        reasonsLabel="Custom reasons"
        nextLabel="Custom next"
      />
    );

    expect(summaryHtml).toContain('data-overview-summary-grid="true"');
    expect(summaryHtml).toContain('data-overview-summary-item="true"');
    expect(summaryHtml).toContain('data-overview-summary-item-chrome="flat"');
    expect(summaryHtml).toContain('High-priority alerts');
    expect(summaryHtml).toContain('Critical pressure is still active');
    expect(summaryHtml).not.toContain('rounded-[10px] border border-[var(--ops-border-color)]');
    expect(guidanceHtml).toContain('data-overview-guidance="true"');
    expect(guidanceHtml).toContain('>Next<');
    expect(guidanceHtml).toContain('Next: work the most important issue first');
    expect(guidanceHtml).toContain('>Reasons<');
    expect(guidanceHtml).toContain('Entities in scope');
    expect(guidanceHtml).toContain('>After that<');
    expect(guidanceHtml).toContain('href="/log/manage"');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-reasons-layout="pill-row"');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-reasons-density="compact"');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-density="compact"');
    expect(compactGuidanceHtml).toContain('grid gap-2 pt-2');
    expect(compactGuidanceHtml).toContain('grid gap-1.5');
    expect(compactGuidanceHtml).toContain('text-[14px] leading-[1.2]');
    expect(compactGuidanceHtml).toContain('text-[11px] leading-[1.4]');
    expect(compactGuidanceHtml).toContain('flex flex-wrap gap-1.5');
    expect(compactGuidanceHtml).toContain('flex-wrap');
    expect(compactGuidanceHtml).toContain('sm:flex-nowrap');
    expect(compactGuidanceHtml).not.toContain('overflow-x-auto');
    expect(compactGuidanceHtml).toContain('sm:flex-1');
    expect(compactGuidanceHtml).toContain('min-w-[64px]');
    expect(compactGuidanceHtml).toContain('px-1.5');
    expect(compactGuidanceHtml).toContain('gap-1');
    expect(compactGuidanceHtml).not.toContain('min-w-[72px]');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-reason-chip-style="dense-fact"');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-reason-label-style="inline-fact"');
    expect(compactGuidanceHtml).toContain('data-overview-guidance-reason-value-style="dense-fact"');
    expect(compactGuidanceHtml).toContain('min-h-[28px]');
    expect(compactGuidanceHtml).toContain('rounded-[9px]');
    expect(compactGuidanceHtml).not.toContain('rounded-full');
    expect(compactGuidanceHtml).not.toContain('tracking-[0.04em]');
    expect(compactGuidanceHtml).toContain('text-[10px] leading-[1.25]');
    expect(compactGuidanceHtml).toContain('Logs');
    expect(compactGuidanceHtml).toContain('Pending');
    expect(customGuidanceHtml).toContain('Custom start');
    expect(customGuidanceHtml).toContain('Custom reasons');
    expect(customGuidanceHtml).toContain('Custom next');
    expect(customGuidanceHtml).not.toContain('>Reasons<');
    expect(customGuidanceHtml).not.toContain('>After that<');
  });

  it('switches summary cards and impacted rows to button-backed actions when overview needs drawer-first posture', () => {
    const summaryHtml = renderToStaticMarkup(
      <OverviewSummaryGrid
        items={[
          {
            key: 'critical',
            label: 'High-priority alerts',
            value: '2',
            hint: 'Check whether these signals already give enough detail to act.',
            delta: 'Critical pressure is still active',
            tone: 'danger'
          }
        ]}
        onSelect={() => undefined}
      />
    );

    const impactedHtml = renderToStaticMarkup(
      <OverviewImpactedList
        kicker="Affected items"
        title="Open the nearby context first."
        items={[
          {
            name: 'checkout',
            type: 'service',
            severity: 'critical',
            severityLabel: 'Critical',
            severityTone: 'danger',
            owner: 'Platform',
            statusLabel: 'Impacted',
            lastIssue: 'Latency high'
          }
        ]}
        onOpenItem={() => undefined}
      />
    );

    expect(summaryHtml).toContain('<button');
    expect(summaryHtml).toContain('type="button"');
    expect(summaryHtml).toContain('High-priority alerts');
    expect(impactedHtml).toContain('<button');
    expect(impactedHtml).toContain('type="button"');
    expect(impactedHtml).toContain('checkout');
    expect(impactedHtml).toContain('data-overview-impacted-severity-tone="danger"');
    expect(impactedHtml).not.toContain('href="/entities?app=checkout"');
  });

  it('renders the healthy status strip in a denser single-row desktop posture when requested', () => {
    const statusHtml = renderToStaticMarkup(
      <OverviewStatusGrid
        title="Workspace status"
        description="Confirm the signal path is ready."
        items={[
          { key: 'workspace', label: 'Workspace', value: 'Ready', ready: true },
          { key: 'ingestion', label: 'Telemetry Ingestion', value: 'Pending', ready: false },
          { key: 'entities', label: 'Object Context', value: 'Pending', ready: false },
          { key: 'alerts', label: 'Alert Rules', value: 'Pending', ready: false }
        ]}
        density="compact"
      />
    );

    expect(statusHtml).toContain('data-overview-status-density="compact"');
    expect(statusHtml).toContain('sm:grid-cols-4');
    expect(statusHtml).not.toContain('border-t-0 pt-0');
  });

  it('renders the healthy next-steps rail in a denser compact checklist posture when requested', () => {
    const checklistHtml = renderToStaticMarkup(
      <OverviewChecklist
        title="Next Steps"
        items={[
          { key: 'logs', label: 'Review logs', ready: true },
          { key: 'traces', label: 'Review traces', ready: false },
          { key: 'metrics', label: 'Review metrics', ready: false },
          { key: 'alerts', label: 'Create an alert', ready: false }
        ]}
        density="compact"
      />
    );

    expect(checklistHtml).toContain('data-overview-checklist-density="compact"');
    expect(checklistHtml).toContain('text-[10px] tracking-[0.14em]');
    expect(checklistHtml).toContain('mt-1.5');
    expect(checklistHtml).toContain('gap-1 sm:gap-x-3');
    expect(checklistHtml).toContain('gap-0 py-1');
    expect(checklistHtml).toContain('text-[10px] leading-[1.25]');
    expect(checklistHtml).toContain('text-[9px] leading-[1.2]');
    expect(checklistHtml).toContain('>Ready<');
    expect(checklistHtml).toContain('>Pending<');
    expect(checklistHtml).not.toContain('gap-1.5');
    expect(checklistHtml).not.toContain('py-1.5');
  });

  it('does not derive compact reason keys from translated label/value content', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/overview/overview-console.tsx'), 'utf8');

    expect(source).not.toContain("key={`${reason.label}-${reason.value}`}");
  });
});
