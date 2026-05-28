import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t
  })
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: ({ variant }: { variant?: string }) => `btn-${variant ?? 'subtle'}`
}));

vi.mock('@/lib/ops-surface/view-model', () => ({
  buildOpsFacts: () => [
    { label: 'Workspace', value: 'Topology' }
  ],
  buildOpsStatusRows: () => [
    { title: 'Entry shell ready', copy: 'The shared shell is already wired.' },
    { title: 'Adapters next', copy: 'Data adapters can land next.' }
  ]
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <main>{main}</main>
      <aside>{side}</aside>
    </div>
  )
}));

vi.mock('../workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, className, children }: any) => (
    <section data-panel-shell="true" className={className}>
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  ),
  RailSection: ({ title, className, children }: any) => (
    <section data-rail-shell="true" className={className}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => (
    <div data-status-state="true">
      {title}
      {copy}
    </div>
  )
}));

describe('OpsSurfacePage', () => {
  it('renders the shared topology and explorer entry shell with cold-workbench route posture tokens', async () => {
    const { OpsSurfacePage } = await import('./ops-surface-page');

    const html = renderToStaticMarkup(
      <OpsSurfacePage
        title="Topology"
        subtitle="Topology keeps graph posture, blast radius, and ownership in one operator shell."
        tags={['graph shell', 'blast radius', 'owner visibility']}
        focus="Graph posture and blast radius handoff"
        summary="The topology entry page preserves graph-first navigation and owner-aware next steps while deeper graph data is still landing."
        lanes={[
          { title: 'Viewport shell', copy: 'Graph canvas posture stays visible before the live topology engine lands.' },
          { title: 'Blast radius', copy: 'Impact and dependency scope keep the same operator reading order.' }
        ]}
        checklist={[
          { title: 'Entry shell ready', copy: 'The topology route already uses the shared operator shell.' },
          { title: 'Graph adapters next', copy: 'Graph data and entity edges can plug into the current composition boundary.' }
        ]}
        actions={[
          { label: 'Open overview', href: '/overview', variant: 'subtle' },
          { label: 'Entity center', href: '/entities', variant: 'default' }
        ]}
      />
    );

    expect(html).toContain('data-workbench-page="true"');
    expect(html).toContain('data-panel-shell="true"');
    expect(html).toContain('data-rail-shell="true"');
    expect(html).toContain('data-status-state="true"');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).toContain('Graph posture and blast radius handoff');
    expect(html).not.toContain('text-white');
    expect(html).not.toContain('hsl(var(--border)');
    expect(html).not.toContain('rounded-[20px]');
  });

  it('pins the placeholder/operator shell to shared workbench primitives instead of direct observability aliases', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/ops-surface-page.tsx'), 'utf8');

    expect(source).toContain("from '../workbench/primitives'");
    expect(source).toContain('SurfaceSection');
    expect(source).toContain('RailSection');
    expect(source).toContain('StatusState');
    expect(source).not.toContain('ObservabilityPanelShell as SurfaceSection');
    expect(source).not.toContain('ObservabilityRailShell as RailSection');
    expect(source).not.toContain('ObservabilityStatusState as StatusState');
  });

  it('renders localized default overview and entity handoffs', async () => {
    const { OpsSurfacePage } = await import('./ops-surface-page');

    const html = renderToStaticMarkup(
      <OpsSurfacePage
        title="Safe automation"
        subtitle="Manual control-plane entry."
        tags={['manual approval']}
        focus="Approval-safe action entry"
        summary="Actions stay bounded to the operator entry shell."
        lanes={[{ title: 'Action catalog', copy: 'Catalog posture stays visible.' }]}
        checklist={[{ title: 'Entry shell ready', copy: 'The route uses shared shell primitives.' }]}
      />
    );

    expect(html).toContain('Open overview');
    expect(html).toContain('Entity center');
    expect(html).not.toContain('menu.entity.browse');
    expect(html).not.toContain('menu.dashboard.back-en');
  });
});
