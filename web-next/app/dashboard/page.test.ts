import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../overview/page', () => ({
  default: () =>
    React.createElement(
      'main',
      { 'data-workspace-shell': 'true' },
      React.createElement('aside', null, '总览 rail'),
      React.createElement('section', { 'data-overview-status-grid': 'true' }, '工作区状态'),
      React.createElement('section', { 'data-overview-guidance': 'true' }, '下一步：先接入一条可用信号链路'),
      React.createElement('button', null, '刷新')
    )
}));

describe('dashboard alias route', () => {
  it('renders the overview workspace directly instead of a redirect-only shell', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/dashboard/page.tsx'), 'utf8');
    const { default: DashboardAliasPage } = await import('./page');
    const html = renderToStaticMarkup(React.createElement(DashboardAliasPage));

    expect(html).toContain('data-workspace-shell="true"');
    expect(html).toContain('data-overview-status-grid="true"');
    expect(html).toContain('data-overview-guidance="true"');
    expect(html).toContain('下一步：先接入一条可用信号链路');
    expect(html).toContain('刷新');
    expect(source).toContain("from '../overview/page'");
    expect(source).not.toContain('redirect(');
    expect(source).not.toContain('buildDashboardCompatRouteUrl');
  });
});
