import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('explorer page', () => {
  it('renders the OTLP cold Workbench explorer baseline in Chinese', async () => {
    const { default: ExplorerPage } = await import('./page');
    const html = renderToStaticMarkup(<ExplorerPage />);

    expect(html).toContain('data-explorer-route="otlp-cold-workbench"');
    expect(html).toContain('data-explorer-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-explorer-query-bar="cold-query-row"');
    expect(html).toContain('data-explorer-chart-band="cold-chart-band"');
    expect(html).toContain('data-explorer-result-table="cold-dense-table"');
    expect(html).toContain('data-explorer-detail-panel="cold-detail-panel"');
    expect(html).toContain('查询工作台');
    expect(html).toContain('运行查询');
    expect(html).toContain('信号类型');
    expect(html).toContain('服务');
    expect(html).toContain('操作');
    expect(html).toContain('checkout');
    expect(html).toContain('保存视图');
    expect(html).toContain('创建告警');
    expect(html).toContain('加入仪表盘');

    expect(html).not.toContain('signoz-');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Funnels');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Search and Filter based on resource attributes.');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
  });

  it('keeps cross-signal handoffs without reverting to old cards', async () => {
    const { default: ExplorerPage } = await import('./page');
    const html = renderToStaticMarkup(<ExplorerPage />);

    expect(html).toContain('href="/log/manage"');
    expect(html).toContain('href="/trace/manage"');
    expect(html).toContain('href="/ingestion/otlp/metrics"');
    expect(html).toContain('href="/entities"');
  });

  it('does not keep the old placeholder surface owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/explorer/page.tsx'), 'utf8');

    expect(source).not.toContain('OpsSurfacePage');
    expect(source).not.toContain('buildExplorerSurfaceConfig');
    expect(source).not.toContain('data-explorer-floating-actions');
    expect(source).toContain('data-explorer-route="otlp-cold-workbench"');
  });
});
