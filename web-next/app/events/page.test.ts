import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../log/manage/log-manage-page', () => ({
  default: ({ forcedView, showViewToggle }: any) =>
    React.createElement(
      'main',
      {
        'data-log-manage-route': 'otlp-cold-log-workbench',
        'data-log-manage-style-baseline': 'hertzbeat-cold-matte',
        'data-forced-view': forcedView,
        'data-show-view-toggle': String(showViewToggle)
      },
      React.createElement('section', { 'data-log-manage-query-bar': 'cold-query-row' }, '日志工作台'),
      React.createElement('div', { 'data-log-manage-log-list': 'cold-dense-log-list' }, '日志列表'),
      React.createElement('aside', { 'data-log-manage-detail-panel': 'cold-detail-panel' }, '日志详情')
    )
}));

describe('events alias route', () => {
  it('keeps the events alias on the HertzBeat log workbench without external-product copy', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/events/page.tsx'), 'utf8');
    const { default: EventsAliasPage } = await import('./page');
    const html = renderToStaticMarkup(React.createElement(EventsAliasPage));

    expect(html).toContain('data-log-manage-route="otlp-cold-log-workbench"');
    expect(html).toContain('data-log-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-log-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-log-manage-log-list="cold-dense-log-list"');
    expect(html).toContain('data-log-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('日志工作台');
    expect(html).toContain('data-forced-view="explorer"');
    expect(html).toContain('data-show-view-toggle="false"');
    expect(source).toContain("from '../log/manage/log-manage-page'");
    expect(source).toContain('forcedView="explorer"');
    expect(source).not.toContain('shellHeader');
    expect(source).not.toContain('SigNoZ');
    expect(source).not.toContain('Logs Explorer');
    expect(source).not.toContain('Legacy events traffic');
    expect(html).not.toContain('signoz-');
    expect(source).not.toContain('redirect(');
    expect(source).not.toContain('buildLogCompatRouteUrl');
  });
});
