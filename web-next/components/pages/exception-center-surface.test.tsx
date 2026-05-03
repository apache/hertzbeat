import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ExceptionCenterSurface } from './exception-center-surface';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'menu.dashboard.back': '返回概览',
    'menu.log.manage': '日志工作台',
    'menu.trace.manage': '链路工作台'
  };

  return messages[key] ?? key;
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t
  })
}));

describe('ExceptionCenterSurface', () => {
  it('renders a HertzBeat-native Chinese exception explorer without English shell copy', () => {
    const html = renderToStaticMarkup(<ExceptionCenterSurface type="500" />);

    expect(html).toContain('data-exception-center-surface="hertzbeat-exceptions"');
    expect(html).toContain('data-exception-type="500"');
    expect(html).toContain('data-exception-filter-sidebar="hertzbeat-exception-filters"');
    expect(html).toContain('data-exception-query-bar="hertzbeat-error-query"');
    expect(html).toContain('data-exception-table="hertzbeat-exception-list"');
    expect(html).toContain('异常中心');
    expect(html).toContain('筛选');
    expect(html).toContain('部署环境');
    expect(html).toContain('服务');
    expect(html).toContain('最近 7 天');
    expect(html).toContain('运行查询');
    expect(html).toContain('异常类型');
    expect(html).toContain('错误信息');
    expect(html).toContain('次数');
    expect(html).toContain('最后出现');
    expect(html).toContain('应用');
    expect(html).toContain('ECONNRESET');
    expect(html).toContain('payment service returned 402');
    expect(html).toContain('browser-frontend');
    expect(html).not.toContain('Exceptions');
    expect(html).not.toContain('Filters');
    expect(html).not.toContain('Deployment Environment');
    expect(html).not.toContain('Service Name');
    expect(html).not.toContain('Last 7 days');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Exception Type');
    expect(html).not.toContain('Error Message');
    expect(html).not.toContain('Last Seen');
    expect(html).not.toContain('Application');
    expect(html).not.toContain('Search and Filter based on resource attributes');
  });

  it('keeps exception handoffs without reverting to the old Workbench page shell', () => {
    const html = renderToStaticMarkup(<ExceptionCenterSurface type="500" />);

    expect(html).toContain('href="/overview"');
    expect(html).toContain('href="/log/manage"');
    expect(html).toContain('href="/trace/manage"');
    expect(html).toContain('返回概览');
    expect(html).toContain('日志工作台');
    expect(html).toContain('链路工作台');
  });

  it('does not keep old workbench/card owners inside the HertzBeat exception explorer', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/exception-center-surface.tsx'), 'utf8');

    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).toContain('data-exception-center-surface="hertzbeat-exceptions"');
    expect(source).not.toContain('signoz');
  });
});
