import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('observability owner layer', () => {
  it('exports the HertzBeat owner kit from the observability layer', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/observability/index.ts'), 'utf8');

    expect(source).toContain("export * from './workspace-shell'");
    expect(source).toContain("export * from './workspace-tab-strip'");
    expect(source).toContain("export * from './facts-strip'");
    expect(source).toContain("export * from './stage-section'");
    expect(source).toContain("export * from './summary-metric-grid'");
    expect(source).toContain("export * from './support-panel'");
    expect(source).toContain("export * from './rail-nav'");
    expect(source).toContain("export * from './context-chip-bar'");
    expect(source).toContain("export * from './drawer-section'");
  });

  it('renders the owner components with current data hooks and prop names', async () => {
    const { WorkspaceShell } = await import('./workspace-shell');
    const { FactsStrip } = await import('./facts-strip');
    const { StageSection, StageMetaHeader } = await import('./stage-section');
    const { SummaryMetricGrid } = await import('./summary-metric-grid');
    const { SupportPanel, SupportActionBar } = await import('./support-panel');
    const { RailNav } = await import('./rail-nav');
    const { ContextChipBar } = await import('./context-chip-bar');
    const { DrawerSection, DrawerFacts, DrawerActionLinks, DrawerCodePreview } = await import('./drawer-section');

    const html = renderToStaticMarkup(
      <WorkspaceShell
        kicker="Trace"
        title="Trace Manage"
        subtitle="Angular truth owner shell"
        tabs={[{ key: 'trace', label: 'Trace', href: '/trace/manage', active: true }]}
        actions={<button>Inspect</button>}
        main={
          <>
            <FactsStrip items={[{ label: 'Spans', value: '18' }, { label: 'Errors', value: '2', tone: 'critical' }]} dense />
            <StageSection title="Waterfall" description="Primary investigation stage" compact chrome="plain">
              <StageMetaHeader
                title="Selected trace"
                description="Pinned summary"
                metaItems={[{ label: 'Trace ID', value: 'trace-001' }]}
                actions={<button>Copy</button>}
              />
              <SummaryMetricGrid items={[{ label: 'Duration', value: '240 ms' }, { label: 'Service', value: 'gateway' }]} compact />
              <DrawerSection title="Span detail" expanded>
                <DrawerFacts items={[{ title: 'Span', copy: 'GET /api/orders' }]} />
                <DrawerActionLinks
                  items={[{ label: 'Open logs', href: '/log/manage' }]}
                />
                <DrawerCodePreview>curl https://example.test</DrawerCodePreview>
              </DrawerSection>
            </StageSection>
          </>
        }
        rail={
          <>
            <SupportPanel title="Next steps" subtitle="Keep the operator workflow attached" actionLabel="Open logs" expanded>
              <SupportActionBar items={[{ label: 'Logs', onSelect: () => undefined }]} />
            </SupportPanel>
            <RailNav items={[{ label: 'Overview', href: '/overview', active: true }]} />
            <ContextChipBar items={[{ label: 'Entity', value: 'gateway' }]} dense />
          </>
        }
        showRail
      />
    );

    expect(html).toContain('data-observability-workspace-shell="true"');
    expect(html).toContain('data-observability-facts-strip="true"');
    expect(html).toContain('data-observability-stage-section="true"');
    expect(html).toContain('data-observability-stage-meta-header="true"');
    expect(html).toContain('data-observability-summary-metric-grid="true"');
    expect(html).toContain('data-observability-support-panel="true"');
    expect(html).toContain('data-observability-support-action-bar="true"');
    expect(html).toContain('data-observability-rail-nav="true"');
    expect(html).toContain('data-observability-context-chip-bar="true"');
    expect(html).toContain('data-observability-drawer-section="true"');
    expect(html).toContain('data-observability-drawer-facts="true"');
    expect(html).toContain('data-observability-drawer-action-links="true"');
    expect(html).toContain('data-observability-drawer-code-preview="true"');
    expect(html).toContain('Trace Manage');
    expect(html).toContain('Open logs');
    expect(html).toContain('/overview');
  });

  it('keeps workbench workspace shells as a compatibility bridge into observability owners', () => {
    const workspaceShellSource = readFileSync(resolve(process.cwd(), 'components/workbench/workspace-shell.tsx'), 'utf8');
    const workspaceTabStripSource = readFileSync(resolve(process.cwd(), 'components/workbench/workspace-tab-strip.tsx'), 'utf8');

    expect(workspaceShellSource).toContain("../observability/workspace-shell");
    expect(workspaceTabStripSource).toContain("../observability/workspace-tab-strip");
    expect(workspaceShellSource).not.toContain('data-workspace-shell="true"');
    expect(workspaceTabStripSource).not.toContain('WorkspaceTabControl');
  });
});
