import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const alertCenterPage = vi.fn(() => (
  React.createElement(
    'main',
    {
      'data-alert-center-surface': 'otlp-cold-center-console',
      'data-alert-center-style-baseline': 'hertzbeat-cold-matte'
    },
    React.createElement('h1', null, '告警中心'),
    React.createElement('p', null, '集中查看并处理当前告警'),
    React.createElement('button', { type: 'button' }, '刷新')
  )
));

vi.mock('../alert/page', () => ({
  default: alertCenterPage
}));

describe('alerts alias route', () => {
  it('renders the shared alert center surface directly for live parity captures', async () => {
    const { default: AlertsAliasPage } = await import('./page');
    const html = renderToStaticMarkup(React.createElement(AlertsAliasPage));

    expect(html).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(html).toContain('data-alert-center-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('告警中心');
    expect(html).toContain('集中查看并处理当前告警');
    expect(html).toContain('刷新');
    expect(alertCenterPage).toHaveBeenCalled();
  });
});
