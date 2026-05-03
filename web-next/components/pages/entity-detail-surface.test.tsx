import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

const detail = {
  entity: {
    entity: {
      id: 42,
      name: 'checkout-api',
      displayName: 'Checkout API',
      type: 'service',
      status: 'healthy',
      owner: 'platform',
      environment: 'prod',
      system: 'payments',
      description: 'Checkout service'
    },
    identities: [{ id: 'host' }],
    monitorBinds: [{ id: 1 }],
    relations: [{ id: 2 }]
  },
  evidenceSummary: {
    collectorOfflineCount: 1,
    collectorOnlineCount: 1,
    collectorTaskCount: 11,
    collectorTotalCount: 2,
    collectorLastSeenAt: '2026-04-10 18:05:00',
    downMonitorCount: 1,
    identityCount: 1
  },
  monitorSummary: {
    totalBoundMonitors: 2
  },
  logSummary: {
    hintCount: 3,
    preferredQueryTitle: 'checkout errors'
  },
  traceSummary: {
    recentTraceCount: 4,
    recentErrorTraceCount: 1
  },
  activeAlerts: [{ id: 1 }],
  alertSummary: {
    totalActiveAlerts: 1
  },
  nextActions: [
    {
      title: 'Open monitors',
      summary: 'Inspect the abnormal monitors first.',
      actionLabel: 'Open monitors'
    }
  ]
} as any;

describe('EntityDetailSurface', () => {
  it('keeps entity detail on the cold full-width Workbench owner without side panels', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-detail-surface.tsx'), 'utf8');

    expect(source).toContain('data-entity-detail-surface="otlp-cold-entity-detail"');
    expect(source).toContain('data-entity-detail-style-baseline={coldEntityDetailVisual.canvasName}');
    expect(source).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(source).toContain('data-entity-detail-header="cold-compact-header"');
    expect(source).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(source).toContain('data-entity-detail-count-strip="cold-inline-counts"');
    expect(source).toContain('data-entity-detail-signal-grid="cold-detail-grid"');
    expect(source).toContain('data-entity-detail-overview-panel="cold-overview-panel"');
    expect(source).toContain('data-entity-detail-related-panel="cold-related-panel"');
    expect(source).toContain('data-entity-detail-next-panel="cold-next-panel"');
    expect(source).toContain('data-entity-detail-drilldown-panel="cold-drilldown-panel"');
    expect(source).toContain('data-entity-detail-context-center="hertzbeat-entity-context"');
    expect(source).toContain('data-entity-detail-current-alerts="current-alerts"');
    expect(source).toContain('data-entity-detail-relationships-panel="upstream-downstream"');
    expect(source).toContain('data-entity-detail-collection-source-panel="source-template-binding"');
    expect(source).toContain('data-entity-detail-attribution-panel="entity-resource-attribution"');
    expect(source).toContain('data-entity-detail-attribution-row={row.key}');
    expect(source).toContain('data-entity-detail-attribution-state={row.state}');
    expect(source).toContain('data-entity-detail-template-binding="monitor-template-binding"');
    expect(source).toContain('data-entity-health-model="lightweight-service-health"');
    expect(source).toContain('data-entity-health-slo-mode="lightweight-no-slo-authoring"');
    expect(source).toContain('data-entity-health-collector-handoff="collector-cluster"');
    expect(source).toContain('data-entity-health-collector-freshness="last-seen"');
    expect(source).toContain('buildEntityHealthModel');
    expect(source).toContain('buildEntityAttributionRows');
    expect(source).toContain('data-entity-detail-context-link={link.key}');
    expect(source).toContain('data-entity-detail-inherited-context="route-context"');
    expect(source).toContain('data-entity-detail-inherited-context-row={row.label}');
    expect(source).toContain("from '../workbench/overlay-dialog'");
    expect(source).toContain('data-entity-detail-delete-confirm-trigger="cold-modal"');
    expect(source).toContain('data-entity-detail-delete-confirm="cold-modal"');
    expect(source).toContain('确认删除实体');
    expect(source).toContain('确认删除');
    expect(source).toContain('取消');
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).toContain('buildEntityContextHandoffLinks');
    expect(source).toContain('data-entity-detail-error="cold-inline-error"');
    expect(source).toContain('lg:grid-cols-2');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).not.toContain('components/workbench/primitives');
    expect(source).not.toContain('text-white/55');
  });

  it('renders Chinese cold entity detail copy and compact action rows', async () => {
    const { EntityDetailSurface } = await import('./entity-detail-surface');
    const html = renderToStaticMarkup(
      <EntityDetailSurface detail={detail} actionError={null} isPending={false} onDelete={() => undefined} onRefresh={() => undefined} />
    );

    expect(html).toContain('data-entity-detail-surface="otlp-cold-entity-detail"');
    expect(html).toContain('data-entity-detail-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(html).toContain('data-entity-detail-header="cold-compact-header"');
    expect(html).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-detail-count-strip="cold-inline-counts"');
    expect(html).toContain('data-entity-detail-signal-grid="cold-detail-grid"');
    expect(html).toContain('data-entity-detail-overview-panel="cold-overview-panel"');
    expect(html).toContain('data-entity-detail-related-panel="cold-related-panel"');
    expect(html).toContain('data-entity-detail-next-panel="cold-next-panel"');
    expect(html).toContain('data-entity-detail-drilldown-panel="cold-drilldown-panel"');
    expect(html).toContain('data-entity-detail-context-center="hertzbeat-entity-context"');
    expect(html).toContain('data-entity-detail-current-alerts="current-alerts"');
    expect(html).toContain('data-entity-detail-relationships-panel="upstream-downstream"');
    expect(html).toContain('data-entity-detail-collection-source-panel="source-template-binding"');
    expect(html).toContain('data-entity-detail-attribution-panel="entity-resource-attribution"');
    expect(html).toContain('data-entity-detail-attribution-row="traditional-monitor"');
    expect(html).toContain('data-entity-detail-attribution-row="otlp-attribution"');
    expect(html).toContain('data-entity-detail-attribution-row="candidate-confirmation"');
    expect(html).toContain('data-entity-detail-attribution-row="missing-diagnostics"');
    expect(html).toContain('data-entity-detail-template-binding="monitor-template-binding"');
    expect(html).toContain('data-entity-health-model="lightweight-service-health"');
    expect(html).toContain('data-entity-health-slo-mode="lightweight-no-slo-authoring"');
    expect(html).toContain('data-entity-health-collector-handoff="collector-cluster"');
    expect(html).toContain('data-entity-health-collector-freshness="last-seen"');
    expect(html).toContain('href="/setting/collector?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/ingestion/otlp/metrics?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/log/manage?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/trace/manage?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/alert/setting?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/monitors?entityId=42&amp;entityName=Checkout+API&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h&amp;returnTo=%2Fentities%2F42"');
    expect(html).toContain('href="/topology?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/entities/42/definition?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('对象优先调查');
    expect(html).toContain('实体详情');
    expect(html).toContain('上下文');
    expect(html).toContain('观测上下文');
    expect(html).toContain('当前告警');
    expect(html).toContain('相关信号');
    expect(html).toContain('上下游关系');
    expect(html).toContain('采集来源');
    expect(html).toContain('传统监控绑定');
    expect(html).toContain('OTLP 归因');
    expect(html).toContain('候选确认');
    expect(html).toContain('归因诊断');
    expect(html).toContain('模板绑定');
    expect(html).toContain('告警规则');
    expect(html).toContain('绑定监控');
    expect(html).toContain('上下游拓扑');
    expect(html).toContain('轻量健康模型');
    expect(html).toContain('可用性');
    expect(html).toContain('错误率');
    expect(html).toContain('延迟');
    expect(html).toContain('当前告警');
    expect(html).toContain('最近异常');
    expect(html).toContain('采集健康');
    expect(html).toContain('采集器 1 / 2 在线');
    expect(html).toContain('任务 11 · 离线 1');
    expect(html).toContain('最近上报 2026-04-10 18:05:00');
    expect(html).toContain('健康评分');
    expect(html).toContain('暂不展开 SLO 编排');
    expect(html).toContain('下一步');
    expect(html).toContain('高级入口');
    expect(html).toContain('全部实体');
    expect(html).toContain('刷新');
    expect(html).toContain('编辑定义');
    expect(html).toContain('删除');
    expect(html).toContain('编辑');
    expect(html).toContain('关联指标');
    expect(html).toContain('先检查异常监控。');
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('Review the summary first');
    expect(html).not.toContain('Related metrics');
    expect(html).not.toContain('definition workspace');
    expect(html).not.toContain('data-stage-section');
    expect(html).not.toContain('data-drawer-section');
  });

  it('renders entity context handoff links with inherited time and monitor context', async () => {
    const { EntityDetailSurface } = await import('./entity-detail-surface');
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          source: 'monitor',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443'
        }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain(
      'href="/ingestion/otlp/metrics?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-45m&amp;start=1713200000000&amp;end=1713202700000&amp;refresh=30&amp;live=false&amp;tz=Asia%2FShanghai&amp;source=monitor&amp;monitorId=632051474676992&amp;monitorName=checkout-http&amp;monitorApp=website&amp;monitorInstance=example.com%3A443"'
    );
    expect(html).toContain(
      'href="/topology?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-45m&amp;start=1713200000000&amp;end=1713202700000&amp;refresh=30&amp;live=false&amp;tz=Asia%2FShanghai&amp;source=monitor&amp;monitorId=632051474676992&amp;monitorName=checkout-http&amp;monitorApp=website&amp;monitorInstance=example.com%3A443"'
    );
    expect(html).toContain('data-entity-detail-inherited-context="route-context"');
    expect(html).toContain('data-entity-detail-inherited-context-row="时间范围"');
    expect(html).toContain('last-45m');
    expect(html).toContain('2024/04/16 00:53:20 → 2024/04/16 01:38:20 · refresh 30s · 已暂停 · Asia/Shanghai');
    expect(html).toContain('data-entity-detail-inherited-context-row="监控实例"');
    expect(html).toContain('checkout-http');
    expect(html).toContain('website · example.com:443 · monitorId 632051474676992');
    expect(html).toContain('data-entity-detail-inherited-context-row="采集来源"');
    expect(html).toContain('传统监控');
    expect(html).not.toContain('0 个证据');
  });
});
