import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EntityDetailSurface } from './entity-detail-surface';

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
      runbook: 'https://runbooks.local/checkout',
      description: 'Checkout service'
    },
    identities: [{ id: 'host' }],
    monitorBinds: [{ id: 1 }],
    relations: [{ relationType: 'calls', targetEntityId: 'mysql-1', targetEntityName: 'mysql-prod' }]
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
  unifiedEvidenceSummary: {
    activeSignalCount: 3,
    metricsActive: true,
    logsActive: true,
    tracesActive: true,
    metricEvidenceCount: 2,
    logEvidenceCount: 3,
    traceEvidenceCount: 4,
    latestObservedAt: '2026-05-13 14:55:00',
    activeSignals: ['metrics', 'logs', 'traces']
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
    expect(source).toContain('data-entity-detail-evidence-model="red-use-read-model"');
    expect(source).toContain('buildUnifiedEvidenceRows');
    expect(source).toContain('data-entity-detail-evidence-handoff="alert-topology-runbook"');
    expect(source).toContain('data-entity-detail-evidence-handoff-row={row.key}');
    expect(source).toContain('data-entity-detail-evidence-handoff-source={row.evidence}');
    expect(source).toContain('data-entity-detail-evidence-handoff-count={row.count}');
    expect(source).toContain('buildEntityEvidenceHandoffRows');
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
    expect(source).toContain("translateEntityDetail('entities.detail.delete.title')");
    expect(source).toContain("translateEntityDetail('entities.detail.delete.kicker')");
    expect(source).toContain("translateEntityDetail('entities.detail.delete.cancel')");
    expect(source).toContain("translateEntityDetail('entities.detail.delete.confirm')");
    expect(source).toContain("translateEntityDetail('entities.detail.delete.copy')");
    expect(source).toContain("translateEntityDetail('entities.detail.attribution.ready')");
    expect(source).toContain("translateEntityDetail('entities.detail.attribution.review')");
    expect(source).toContain("translateEntityDetail('entities.detail.attribution.missing')");
    expect(source).not.toContain('title="确认删除实体"');
    expect(source).not.toContain('kicker="对象目录"');
    expect(source).not.toContain('删除后实体会从对象目录移除');
    expect(source).not.toContain('已归因');
    expect(source).not.toContain('待确认');
    expect(source).not.toContain('缺失');
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

  it('renders English fallback cold entity detail copy and compact action rows', () => {
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
    expect(html).toContain('data-entity-detail-evidence-model="red-use-read-model"');
    expect(html).toContain('data-entity-detail-evidence-handoff="alert-topology-runbook"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="alerts"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="active-alerts"');
    expect(html).toContain('data-entity-detail-evidence-handoff-count="1"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="topology"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="topology-relation"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="runbook"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="runbook"');
    expect(html).toContain('data-entity-health-collector-handoff="collector-cluster"');
    expect(html).toContain('data-entity-health-collector-freshness="last-seen"');
    expect(html).toContain('href="/setting/collector?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/ingestion/otlp/metrics?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/log/manage?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/trace/manage?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/alert/setting?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('href="/alert?status=firing&amp;entityId=42&amp;entityName=Checkout+API&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h&amp;returnTo=%2Fentities%2F42"');
    expect(html).toContain('href="/monitors?entityId=42&amp;entityName=Checkout+API&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h&amp;returnTo=%2Fentities%2F42"');
    expect(html).toContain('href="/topology?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('topologyTargetId=mysql-1');
    expect(html).toContain('topologyTargetName=mysql-prod');
    expect(html).toContain('href="https://runbooks.local/checkout"');
    expect(html).toContain('href="/entities/42/definition?entityId=42&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('Entity-first investigation');
    expect(html).toContain('Entity detail');
    expect(html).toContain('Context');
    expect(html).toContain('Observability context');
    expect(html).toContain('Current alerts');
    expect(html).toContain('Related signals');
    expect(html).toContain('Upstream and downstream');
    expect(html).toContain('Collection source');
    expect(html).toContain('Traditional monitor binding');
    expect(html).toContain('OTLP attribution');
    expect(html).toContain('Candidate confirmation');
    expect(html).toContain('Attribution diagnostics');
    expect(html).toContain('Template binding');
    expect(html).toContain('Alert rules');
    expect(html).toContain('Bound monitors');
    expect(html).toContain('Upstream topology');
    expect(html).toContain('Lightweight health model');
    expect(html).toContain('Evidence model');
    expect(html).toContain('RED / USE read model');
    expect(html).toContain('Active alert evidence');
    expect(html).toContain('Topology context');
    expect(html).toContain('Runbook');
    expect(html).toContain('3 active signals');
    expect(html).toContain('metrics · logs · traces');
    expect(html).toContain('Metrics / USE');
    expect(html).toContain('Logs / RED');
    expect(html).toContain('Traces / RED');
    expect(html).toContain('Availability');
    expect(html).toContain('Error rate');
    expect(html).toContain('Latency');
    expect(html).toContain('Current alerts');
    expect(html).toContain('Recent anomalies');
    expect(html).toContain('Collection health');
    expect(html).toContain('Collectors 1 / 2 online');
    expect(html).toContain('Tasks 11 · offline 1');
    expect(html).toContain('Last report 2026-04-10 18:05:00');
    expect(html).toContain('Health score');
    expect(html).toContain('without SLO authoring');
    expect(html).toContain('Next step');
    expect(html).toContain('Advanced entries');
    expect(html).toContain('All entities');
    expect(html).toContain('Refresh');
    expect(html).toContain('Edit definition');
    expect(html).toContain('Delete');
    expect(html).toContain('Edit');
    expect(html).toContain('Related metrics');
    expect(html).toContain('Inspect abnormal monitors first.');
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('Review the summary first');
    expect(html).not.toContain('对象优先调查');
    expect(html).not.toContain('关联指标');
    expect(html).not.toContain('definition workspace');
    expect(html).not.toContain('data-stage-section');
    expect(html).not.toContain('data-drawer-section');
  }, 30000);

  it('uses shared signal evidence when deciding whether the entity has investigation context', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={{
          entity: {
            entity: {
              id: 77,
              name: 'payment-api',
              displayName: 'Payment API',
              type: 'service',
              status: 'healthy'
            }
          },
          evidenceSummary: {
            downMonitorCount: 0
          },
          alertSummary: {
            totalActiveAlerts: 0
          },
          signalEvidence: {
            logSummary: { hintCount: 2 },
            traceSummary: { recentTraceCount: 3 }
          }
        } as any}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('Logs, traces, or monitor evidence are linked and ready for investigation.');
    expect(html).not.toContain('Add owner, definition, and telemetry binding so this entity becomes usable.');
  });

  it('renders entity context handoff links with inherited time and monitor context', () => {
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
    expect(html).toContain('data-entity-detail-inherited-context-row="Time range"');
    expect(html).toContain('last-45m');
    expect(html).toContain('2024/04/16 00:53:20 → 2024/04/16 01:38:20 · Refresh 30s · Paused · Asia/Shanghai');
    expect(html).toContain('data-entity-detail-inherited-context-row="Monitor instance"');
    expect(html).toContain('checkout-http');
    expect(html).toContain('website · example.com:443 · monitorId 632051474676992');
    expect(html).toContain('data-entity-detail-inherited-context-row="Source"');
    expect(html).toContain('Traditional monitoring');
    expect(html).not.toContain('0 个证据');
    expect(html).not.toContain('0 evidence');
  }, 30000);
});
