import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('global cold-workbench styles', () => {
  it('locks the Angular shell tokens and flat canvas baseline', () => {
    const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

    expect(css).toContain('--ops-background: #0b0c0e;');
    expect(css).toContain('--ops-surface-panel: #121317;');
    expect(css).toContain('--ops-surface-raised: #16181d;');
    expect(css).toContain('--ops-border-color: #1f232b;');
    expect(css).toContain('--ops-radius-panel: 10px;');
    expect(css).toContain('--ops-radius-compact: 6px;');
    expect(css).toContain('--ops-panel-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);');
    expect(css).toContain("font-family: var(--hb-font);");
    expect(css).not.toContain('radial-gradient(');
  });

  it('removes native textarea resize grips from cold editors', () => {
    const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

    expect(css).toMatch(/textarea\s*\{[^}]*resize:\s*none;/s);
    expect(css).not.toContain('resize: vertical');
    expect(css).not.toContain('resize: both');
  });
});
