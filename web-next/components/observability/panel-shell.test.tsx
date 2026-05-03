import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>
}));

describe('observability panel shell', () => {
  it('renders title, description, actions, and content in a shared shell', async () => {
    const { ObservabilityPanelShell } = await import('./panel-shell');
    const html = renderToStaticMarkup(
      <ObservabilityPanelShell title="Metrics console" description="Shared shell" actions={<button>Refresh</button>}>
        <div>panel-body</div>
      </ObservabilityPanelShell>
    );

    expect(html).toContain('Metrics console');
    expect(html).toContain('Shared shell');
    expect(html).toContain('Refresh');
    expect(html).toContain('panel-body');
  });

  it('uses the cold-workbench ops tokens for deck panels', async () => {
    const { ObservabilityPanelShell } = await import('./panel-shell');
    const html = renderToStaticMarkup(
      <ObservabilityPanelShell tone="deck" title="Metrics console" description="Shared shell">
        <div>panel-body</div>
      </ObservabilityPanelShell>
    );

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('text-white/92');
    expect(html).not.toContain('text-white/42');
  });
});
