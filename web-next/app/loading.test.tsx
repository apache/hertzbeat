import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('global app loading shell', () => {
  it('renders a visible operator-facing route loading state instead of a blank screen', async () => {
    const { default: Loading } = await import('./loading');
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain('data-app-route-loading="global-workbench-loading"');
    expect(html).toContain('data-app-route-loading-spinner="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('正在加载工作台');
    expect(html).toContain('正在准备页面数据');
    expect(html).not.toContain('/api/');
    expect(html).not.toContain('http://localhost');
  });
});
