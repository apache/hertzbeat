import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const i18nState = vi.hoisted(() => ({
  locale: 'zh-CN' as 'zh-CN' | 'en-US'
}));

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: i18nState.locale,
    ready: true,
    locales: [],
    setLocale: vi.fn(async () => {}),
    t: createTranslatorMock({ locale: i18nState.locale })
  })
}));

describe('topology page', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    i18nState.locale = 'zh-CN';
  });

  it('keeps topology on the HertzBeat entity relationship surface instead of copied service-map chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/topology/page.tsx'), 'utf8');

    expect(source).toContain('data-topology-route="hertzbeat-entity-topology"');
    expect(source).toContain('data-topology-controls="hertzbeat-topology-controls"');
    expect(source).toContain('data-topology-source-strip="relationship-source-contract"');
    expect(source).toContain('data-topology-source-control="relationship-source"');
    expect(source).toContain('data-topology-canvas="hertzbeat-topology-canvas"');
    expect(source).toContain('data-topology-node="service-node"');
    expect(source).toContain('data-topology-node-focus=');
    expect(source).toContain('data-topology-edge="service-edge"');
    expect(source).toContain('data-topology-edge-focus=');
    expect(source).toContain('data-topology-edge-drilldown=');
    expect(source).toContain('data-topology-edge-evidence-panel=');
    expect(source).toContain('data-topology-incoming-context=');
    expect(source).toContain('data-topology-alert-impact-link="alert-center"');
    expect(source).toContain('useI18n');
    expect(source).toContain("t('topology.search.placeholder')");
    expect(source).not.toContain('搜索实体、服务、资源或标签');
    expect(source).not.toContain('OpsSurfacePage');
    expect(source).not.toContain('buildTopologySurfaceConfig');
    expect(source).not.toContain('Monitor center');
    expect(source).not.toContain('signoz-service-map');
    expect(source).not.toContain('Service Map');
    expect(source).not.toContain('Select Environment/s');
  });

  it('renders HertzBeat topology sources, graph nodes, and operations closure actions', async () => {
    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('data-topology-route="hertzbeat-entity-topology"');
    expect(html).toContain('data-topology-controls="hertzbeat-topology-controls"');
    expect(html).toContain('data-topology-source-strip="relationship-source-contract"');
    expect(html).toContain('data-topology-source-control="relationship-source"');
    expect(html).toContain('data-topology-canvas="hertzbeat-topology-canvas"');
    expect(html).toContain('data-topology-node="service-node"');
    expect(html).toContain('data-topology-node-health-affordance="lightweight-service-health"');
    expect(html).toContain('data-topology-node-health-copy="lightweight-service-health"');
    expect(html).toContain('data-topology-edge="service-edge"');
    expect(html).toContain('HertzBeat 企业运维拓扑');
    expect(html).toContain('应用拓扑');
    expect(html).toContain('服务调用');
    expect(html).toContain('资源依赖');
    expect(html).toContain('告警影响面');
    expect(html).toContain('OTLP 调用关系');
    expect(html).toContain('监控对象归属');
    expect(html).toContain('模板依赖');
    expect(html).toContain('K8s 工作负载');
    expect(html).toContain('数据库 / 中间件连接');
    expect(html).toContain('CMDB / 手工标签');
    expect(html).toContain('checkout-api');
    expect(html).toContain('redis');
    expect(html).toContain('刷新拓扑');
    expect(html).toContain('适配视图');
    expect(html).toContain('data-topology-alert-impact-link="alert-center"');
    expect(html).toContain('查看实体详情');
    expect(html).toContain('打开三信号');
    expect(html).toContain('data-topology-node-entity-href="/entities/service%3Acommerce%2Fcheckout?');
    expect(html).toContain('data-topology-context-link="entity"');
    expect(html).toContain('data-topology-context-link="metrics"');
    expect(html).toContain('data-topology-context-link="logs"');
    expect(html).toContain('data-topology-context-link="traces"');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[\s\S]*data-topology-node-health-copy="lightweight-service-health"[\s\S]*健康评分 62/);
    expect(html).toContain('/ingestion/otlp/metrics?');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('entityId=service%3Acommerce%2Fcheckout');
    expect(html).toContain('serviceName=checkout-api');
    expect(html).toContain('serviceNamespace=commerce');
    expect(html).toContain('environment=prod');
    expect(html).toContain('timeRange=last-1h');
    expect(html).not.toContain('Service Map');
    expect(html).not.toContain('Select Environment/s');
    expect(html).not.toContain('entry surface');
    expect(html).not.toContain('Monitor center');
  });

  it('uses incoming entity context to seed filters, active topology node, and current signal links', async () => {
    mockSearchParams = new URLSearchParams({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-30m'
    });

    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('data-topology-incoming-context="entity-filter"');
    expect(html).toContain('data-topology-active-node-id="svc-checkout"');
    expect(html).toContain('data-topology-filter-environment="prod"');
    expect(html).toContain('data-topology-filter-time-range="last-30m"');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-focus="active"/);
    expect(html).toMatch(/data-topology-edge-source="database-middleware-connection"[^>]+data-topology-edge-focus="active-path"/);
    expect(html).toContain('data-topology-view-mode-active="service-call"');
    expect(html).toContain('value="checkout-api"');
    expect(html).toContain('last-30m');
    expect(html).toContain('timeRange=last-30m');
    expect(html).toContain('当前筛选');
  });

  it('uses view mode and source query params to narrow topology and expose alert-impact closure', async () => {
    mockSearchParams = new URLSearchParams({
      viewMode: 'alert-impact',
      sourceKind: 'alert-impact',
      environment: 'prod',
      timeRange: 'last-1h'
    });

    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('data-topology-active-view-mode="alert-impact"');
    expect(html).toContain('data-topology-active-source-kind="alert-impact"');
    expect(html).toContain('data-topology-view-mode-active="alert-impact"');
    expect(html).toContain('data-topology-source-active="alert-impact"');
    expect(html).toContain('data-topology-edge-focus="active-path"');
    expect(html).toContain('data-topology-edge-focus="context-muted"');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-focus="related"/);
    expect(html).toContain('data-topology-alert-impact-link="alert-center"');
    expect(html).toContain('/alert/center?');
    expect(html).toContain('source=topology');
    expect(html).toContain('viewMode=alert-impact');
    expect(html).toContain('sourceKind=alert-impact');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-entity-href="\/entities\/service%3Acommerce%2Fcheckout\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="entity"[^>]+href="\/entities\/service%3Acommerce%2Fcheckout\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="metrics"[^>]+href="\/ingestion\/otlp\/metrics\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="logs"[^>]+href="\/log\/manage\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="traces"[^>]+href="\/trace\/manage\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
  });

  it('renders selected edge evidence and drilldown links with retained topology context', async () => {
    mockSearchParams = new URLSearchParams({
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      environment: 'prod',
      timeRange: 'last-1h'
    });

    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('data-topology-active-edge-id="svc-checkout--res-orders-db"');
    expect(html).toContain('data-topology-edge-selected="true"');
    expect(html).toMatch(/data-topology-edge-id="svc-checkout--res-orders-db"[^>]+data-topology-edge-focus="active-path"/);
    expect(html).toContain('data-topology-edge-evidence-panel="svc-checkout--res-orders-db"');
    expect(html).toContain('关系证据');
    expect(html).toContain('订单库连接');
    expect(html).toContain('数据库 / 中间件连接');
    expect(html).toContain('采集证据');
    expect(html).toContain('checkout-api');
    expect(html).toContain('orders-db');
    expect(html).toContain('data-topology-edge-evidence-boundary="roadmap-boundary"');
    expect(html).toContain('当前边仅基于已采集的关系证据；依赖自动发现、变更时间线和根因分析仍是 roadmap 能力。');
    expect(html).toContain('data-topology-edge-link-copy="alert-impact"');
    expect(html).toContain('带当前边、实体和三信号上下文进入告警影响面。');
    expect(html).toMatch(/data-topology-edge-link="metrics"[^>]+href="\/ingestion\/otlp\/metrics\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="logs"[^>]+href="\/log\/manage\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="traces"[^>]+href="\/trace\/manage\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="alert-impact"[^>]+href="\/alert\/center\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
  });

  it('renders incoming fault evidence context without fake future analysis panels', async () => {
    mockSearchParams = new URLSearchParams({
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    });

    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('data-topology-fault-context="incoming-evidence"');
    expect(html).toContain('data-topology-fault-context-row="当前实体"');
    expect(html).toContain('entityId service:commerce/checkout');
    expect(html).toContain('data-topology-fault-context-row="当前服务"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('data-topology-fault-context-row="链路上下文"');
    expect(html).toContain('trace-123');
    expect(html).toContain('spanId span-456');
    expect(html).toContain('data-topology-fault-context-row="采集来源"');
    expect(html).toContain('采集器 edge-collector-a · 模板 java-service');
    expect(html).toContain('data-topology-active-node-id="svc-checkout"');
    expect(html).toContain('data-topology-active-edge-id="svc-checkout--res-orders-db"');
    expect(html).not.toContain('data-topology-root-cause-panel');
    expect(html).not.toContain('data-topology-change-timeline');
    expect(html).not.toContain('data-topology-dependency-discovery');
  });

  it('renders localized topology chrome in en-US without closeout Chinese or raw keys', async () => {
    i18nState.locale = 'en-US';
    mockSearchParams = new URLSearchParams({
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    });

    const { default: TopologyPage } = await import('./page');
    const html = renderToStaticMarkup(<TopologyPage />);

    expect(html).toContain('Topology and impact');
    expect(html).toContain('HertzBeat operations topology');
    expect(html).toContain('Refresh topology');
    expect(html).toContain('Search entities, services, resources, or labels');
    expect(html).toContain('Fault context');
    expect(html).toContain('Relationship evidence');
    expect(html).toContain('Metrics evidence');
    expect(html).toContain('Current entity');
    expect(html).toContain('Open alert impact');
    expect(html).toContain('Current service');
    expect(html).toContain('Trace context');
    expect(html).toContain('Source');
    expect(html).not.toMatch(/[一-龥]/);
    expect(html).not.toContain('topology.');
    expect(html).not.toContain('signal.context.');
  });
});
