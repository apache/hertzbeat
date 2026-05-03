import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('actions page', () => {
  it('renders the OTLP cold-matte entry shell without the previous placeholder stack', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/actions/page.tsx'), 'utf8');
    const { default: ActionsPage } = await import('./page');
    const html = renderToStaticMarkup(<ActionsPage />);

    expect(html).toContain('data-actions-route="otlp-cold-ops-entry"');
    expect(html).toContain('data-actions-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-actions-shell-panel="cold-ops-shell-panel"');
    expect(html).toContain('data-actions-launch-checklist="cold-ops-static-rail"');
    expect(html).toContain('data-actions-adapter-boundary="adapter-pending"');
    expect(html).toContain('data-actions-empty-state="cold-ops-domain-adapter"');
    expect(html).toContain('自动化处置');
    expect(html).toContain('按 OTLP 工作台的冷色基线统一入口、上下文和审批语义。');
    expect(html).toContain('冷色入口已接入');
    expect(html).toContain('执行边界');
    expect(html).toContain('roadmap 示例快照');
    expect(html).toContain('不代表实时运行状态');
    expect(html).toContain('告警上下文建议是当前证据生成的人工交接');
    expect(html).toContain('等待接入执行适配器');
    expect(html).toContain('打开概览');
    expect(html).toContain('查看对象');
    expect(html).toContain('自动化目录');
    expect(html).toContain('风险动作');
    expect(html).toContain('审批流');
    expect(html).toContain('统一入口上下文');
    expect(html).toContain('接入执行适配器');
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
    expect(html).not.toContain('Restart checkout deployment');
    expect(html).not.toContain('Catalog posture');
    expect(html).not.toContain('data-summary-metric-grid');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
  });

  it('renders alert-context suggested remediation actions as human-confirmed suggestions only', async () => {
    const { default: ActionsPage } = await import('./page');
    const html = renderToStaticMarkup(
      <ActionsPage
        searchParams={{
          source: 'alert',
          signal: 'traces',
          severity: 'critical',
          entityId: 'service:commerce/checkout',
          entityName: 'checkout-api',
          serviceName: 'checkout-api',
          serviceNamespace: 'commerce',
          environment: 'prod',
          timeRange: 'last-1h',
          traceId: 'trace-123',
          spanId: 'span-456',
          collector: 'edge-collector-a',
          template: 'java-service',
          returnTo: '/alert?status=firing&returnLabel=告警'
        }}
      />
    );

    expect(html).toContain('data-actions-suggested-remediation="alert-context-human-confirmation"');
    expect(html).toContain('data-actions-adapter-boundary="adapter-pending"');
    expect(html).toContain('建议动作');
    expect(html).toContain('只生成建议，不自动执行。');
    expect(html).toContain('data-actions-suggested-action="suggest-restart-checkout"');
    expect(html).toContain('建议重启 checkout-api');
    expect(html).toContain('data-actions-suggested-action-confirm="manual-required"');
    expect(html).toContain('人工确认后执行');
    expect(html).toContain('data-actions-suggested-action-evidence="suggest-restart-checkout"');
    expect(html).toContain('/alert?status=firing');
    expect(html).toContain('traceId=trace-123');
    expect(html).not.toContain('data-actions-auto-execute');
    expect(html).not.toContain('/actions/run');
  });
});
