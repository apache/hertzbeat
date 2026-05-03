import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('incidents page', () => {
  it('renders the OTLP cold-matte entry shell without the previous placeholder stack', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/incidents/page.tsx'), 'utf8');
    const { default: IncidentsPage } = await import('./page');
    const html = renderToStaticMarkup(<IncidentsPage />);

    expect(html).toContain('data-incidents-route="otlp-cold-ops-entry"');
    expect(html).toContain('data-incidents-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-incidents-shell-panel="cold-ops-shell-panel"');
    expect(html).toContain('data-incidents-launch-checklist="cold-ops-static-rail"');
    expect(html).toContain('data-incidents-empty-state="cold-ops-domain-adapter"');
    expect(html).toContain('故障事件');
    expect(html).toContain('按 OTLP 工作台的冷色基线统一响应时间线、责任人和证据入口。');
    expect(html).toContain('冷色入口已接入');
    expect(html).toContain('等待接入事件适配器');
    expect(html).toContain('打开概览');
    expect(html).toContain('查看对象');
    expect(html).toContain('事件入口');
    expect(html).toContain('响应时间线');
    expect(html).toContain('责任人优先');
    expect(html).toContain('统一入口上下文');
    expect(html).toContain('接入事件适配器');
    expect(html).toContain('保留证据跳转');
    expect(html).not.toContain('angular-dark-ops-placeholder');
    expect(html).not.toContain('DARK OPS');
    expect(html).not.toContain('V1 SHELL IS LIVE');
    expect(html).not.toContain('Domain adapter comes next');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('#4f6cff');
    expect(source).not.toContain('#101c31');
    expect(html).not.toContain('incidents.subtitle');
    expect(html).not.toContain('Checkout latency spike across prod-ap');
    expect(html).not.toContain('data-summary-metric-grid');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
  });
});
