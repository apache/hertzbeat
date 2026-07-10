import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('global app loading shell', () => {
  it('shows compact route pending feedback without looking like a blank workspace', async () => {
    const { default: Loading } = await import('./loading');
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain('data-app-route-loading="quiet-route-pending"');
    expect(html).toContain('data-app-route-loading-indicator="true"');
    expect(html).toContain('data-app-route-loading-shell="operator-compact"');
    expect(html).toContain('data-app-route-loading-skeleton="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Opening workbench"');
    expect(html).toContain('Opening workbench');
    expect(html).toContain('Loading route state, navigation context, and live backend evidence.');
    expect(html).not.toContain('rounded-[4px]');
    expect(html).not.toContain('min-h-[360px]');
    expect(html).not.toContain('/api/');
    expect(html).not.toContain('http://localhost');
  });
});
