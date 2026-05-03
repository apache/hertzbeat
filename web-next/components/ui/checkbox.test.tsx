import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders the shared cold checkbox owner instead of default checkbox chrome', () => {
    const html = renderToStaticMarkup(<Checkbox name="enabled" checked readOnly label="启用状态" />);

    expect(html).toContain('<label');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-click-target="label-shell"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-checkbox-label="true"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('sr-only');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('accent-[var(--ops-primary)]');
  });
});
