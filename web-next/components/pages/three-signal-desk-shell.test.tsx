import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ThreeSignalDeskShell } from './three-signal-desk-shell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('three signal desk shell', () => {
  it('applies the shared operator-desk shell defaults on top of the workspace shell', () => {
    const html = renderToStaticMarkup(
      <ThreeSignalDeskShell
        kicker="Signals"
        title="Signals Desk"
        subtitle="One shared operator shell"
        tabs={[
          { key: 'logs', label: 'Logs', href: '/log/manage', active: true },
          { key: 'traces', label: 'Traces', href: '/trace/manage' }
        ]}
        actions={<button>Refresh</button>}
        main={<div>desk-main</div>}
        rail={<div>desk-rail</div>}
        showRail
        allowRailCollapse
        railCollapsed={false}
        collapseRailLabel="Collapse Rail"
        expandRailLabel="Expand Rail"
        mainClassName="px-6"
        railClassName="py-8"
      />
    );

    expect(html).toContain('data-workspace-shell="true"');
    expect(html).toContain('Signals Desk');
    expect(html).toContain('desk-main');
    expect(html).toContain('desk-rail');
    expect(html).toContain('Collapse Rail');
    expect(html).toContain('bg-[var(--ops-surface-panel)] p-3 px-6');
    expect(html).toContain('bg-[var(--ops-surface-elevated)] p-3 py-8');
  });
});
