import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('@hertzbeat/design-tokens', () => {
  const packageRoot = resolve(__dirname, '..');

  it('exports token and theme css entrypoints', () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
      exports: Record<string, string>;
    };

    expect(manifest.exports['./tokens.css']).toBe('./src/tokens.css');
    expect(manifest.exports['./themes.css']).toBe('./src/themes.css');
  });

  it('defines the shared observability token families', () => {
    const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');
    const themes = readFileSync(resolve(__dirname, 'themes.css'), 'utf8');

    expect(tokens).toContain('--hz-color-surface');
    expect(tokens).toContain('--hz-color-critical');
    expect(tokens).toContain('--hz-chart-blue');
    expect(tokens).toContain('--hz-density-control-height');
    expect(tokens).toContain('--hz-font-mono');
    expect(themes).toContain('--hz-ui-text: var(--hz-color-text)');
    expect(themes).toContain('--hz-ui-text-muted: var(--hz-color-text-muted)');
    expect(themes).toContain('--hz-ui-text-subtle: var(--hz-color-text-subtle)');
  });
});
