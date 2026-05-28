import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('global app loading shell', () => {
  it('keeps route pending feedback quiet instead of showing a full Loading workspace panel', async () => {
    const { default: Loading } = await import('./loading');
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain('data-app-route-loading="quiet-route-pending"');
    expect(html).toContain('data-app-route-loading-indicator="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Loading workspace');
    expect(html).not.toContain('Preparing page data');
    expect(html).not.toContain('rounded-[4px]');
    expect(html).not.toContain('min-h-[360px]');
    expect(html).not.toContain('/api/');
    expect(html).not.toContain('http://localhost');
  });
});
