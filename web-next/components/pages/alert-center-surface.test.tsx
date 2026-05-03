// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertCenterSurface } from './alert-center-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ kicker, title, subtitle, facts, factsVariant, main, side }: any) => (
    <main data-workbench-page="true" data-has-side={side ? 'true' : 'false'}>
      <div data-kicker="true">{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-facts="true" data-facts-variant={factsVariant ?? 'grid'}>{facts.map((fact: any) => `${fact.label}:${fact.value}`).join('|')}</div>
      <div data-main="true">{main}</div>
      {side ? <aside data-side="true">{side}</aside> : null}
    </main>
  )
}));

vi.mock('../observability', () => ({
  CodePane: ({ children }: any) => <pre>{children}</pre>,
  ObservabilityStatGrid: ({ items }: any) => <div data-observability-stat-grid="pills">{items.map((item: any) => item.label).join('|')}</div>,
  SelectableEvidenceList: ({ rows }: any) => <div data-evidence-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  ToolbarField: ({ label, children }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToolbarRow: ({ children, ...props }: any) => <div data-toolbar-row="true" {...props}>{children}</div>
}));

vi.mock('../workbench/primitives', () => ({
  SurfaceSection: ({ title, children }: any) => (
    <section data-panel="true">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  RailSection: ({ title, children }: any) => (
    <section data-rail="true">
      <h3>{title}</h3>
      {children}
    </section>
  ),
  StatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
  WorkbenchToolbarAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  WorkbenchValuePill: ({ children }: any) => <span data-value-pill="true">{children}</span>
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('../../lib/format', () => ({
  formatTime: () => '2026-04-19 20:00:00'
}));

describe('AlertCenterSurface', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;
  const t = createTranslatorMock();
  const zh = createTranslatorMock({ locale: 'zh-CN' });
  const summary = {
    total: 3,
    dealNum: 1,
    rate: 33,
    priorityWarningNum: 1,
    priorityCriticalNum: 1,
    priorityEmergencyNum: 0
  };
  const groupAlerts = {
    content: [
      {
        id: 7,
        status: 'firing',
        groupLabels: { service: 'checkout', severity: 'critical' },
        alerts: [
          {
            id: 701,
            content: 'CPU high',
            fingerprint: 'fp-1',
            creator: 'ops',
            labels: { service: 'checkout', severity: 'critical', alertname: 'HighCPU' },
            status: 'firing',
            triggerTimes: 2,
            gmtUpdate: 1713200000000,
            gmtCreate: 1713190000000,
            startAt: 1713190000000,
            activeAt: 1713200000000
          }
        ],
        gmtUpdate: 1713200000000
      }
    ],
    totalElements: 1,
    pageIndex: 0,
    pageSize: 8
  };

  const renderSurface = (
    props: Partial<React.ComponentProps<typeof AlertCenterSurface>> = {},
    translator = zh
  ) => renderToStaticMarkup(
    <AlertCenterSurface
      t={translator}
      data={{ summary, groupAlerts } as any}
      draft={{ search: '', status: '', severity: '' }}
      onDraftChange={vi.fn()}
      onRefresh={vi.fn()}
      onClearFilters={vi.fn()}
      {...props}
    />
  );

  afterEach(() => {
    if (interactionRoot) {
      act(() => {
        interactionRoot?.unmount();
      });
    }
    interactionContainer?.remove();
    interactionRoot = null;
    interactionContainer = null;
  });

  it('renders the OTLP cold-matte alert-center zh-CN header and single query contract', () => {
    const html = renderSurface();

    expect(html).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(html).toContain('data-alert-center-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-center-header="cold-compact-header"');
    expect(html).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(html).toContain('data-alert-center-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(html).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(html).not.toContain('data-alert-center-summary-rail=');
    expect(html).toContain('告警中心');
    expect(html).toContain('集中查看并处理当前告警');
    expect(html).toContain('按时间、状态和对象筛选告警，并在这里完成确认、恢复或继续查看详情。');
    expect(html).toContain('告警中');
    expect(html).toContain('已确认');
    expect(html).toContain('已恢复');
    expect(html).toContain('搜索告警');
    expect(html).toContain('告警状态');
    expect(html).toContain('严重级别');
    expect((html.match(/>刷新</g) ?? []).length).toBe(1);
    expect(html).not.toContain('alert.center.kicker');
    expect(html).not.toContain('alert.center.title');
    expect(html).not.toContain('Alert Center');
    expect(html).not.toContain('SESSION');
    expect(html).not.toContain('Restoring');
  });

  it('renders a cold dense empty state instead of the old inline state', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any
    });

    expect(html).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(html).toContain('data-alert-center-empty-state="cold-table-empty"');
    expect(html).toContain('data-alert-center-empty-icon="cold-empty-box"');
    expect(html).toContain('当前范围内没有告警');
    expect(html).toContain('当前时间范围和筛选条件下还没有可处理的告警。');
    expect(html).not.toContain('data-alert-center-empty-action="refresh"');
    expect(html).not.toContain('点击刷新');
    expect(html).not.toContain('data-alert-center-empty-state="angular-inline"');
    expect(html).not.toContain('alert.center.empty.title');
    expect(html).not.toContain('alert.center.empty.copy');
  });

  it('drops the WorkbenchPage and single-panel contract for the shared cold visual owner', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any
    });
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-alert-center-workbench-panel="angular-single-panel"');
    expect(html).not.toContain('data-alert-center-workbench-body="angular-list-region"');
    expect(html).not.toContain('data-alert-center-toolbar="angular-density"');
    expect(html).not.toContain('data-observability-stat-grid="pills"');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-alert-center-admin-layout="full-width-admin-list"');
    expect(source).not.toContain('data-alert-center-summary-rail');
    expect(source).not.toContain('coldCenterVisual.layout.heroGrid');
    expect(source).not.toContain('coldCenterVisual.layout.railGrid');
    expect(source).not.toContain('coldCenterVisual.signal.band');
    expect(source).not.toContain('coldCenterVisual.panel.rail');
    expect(source).not.toContain("from '../workbench/workbench-page'");
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('AlertSurfaceEmptyState');
    expect(source).not.toContain('ToolbarRow');
  });

  it('uses the cold compact toolbar density with low-radius controls and no stacked field labels', () => {
    const html = renderSurface({
      draft: { search: 'checkout', status: 'acknowledged', severity: 'warning' }
    });
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(html).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-center-search-row="shared-compact"');
    expect(html).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-filter-slot="inline-before-submit"');
    expect(html).toContain('data-alert-center-query-filters="inline-before-submit"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-center-select="status"');
    expect(html).toContain('data-alert-center-select="severity"');
    expect(html).toContain('data-alert-center-clear-filters="true"');
    expect(html.indexOf('data-cold-search-input="fixed-width-direct"')).toBeLessThan(
      html.indexOf('data-alert-center-select="status"')
    );
    expect(html.indexOf('data-alert-center-select="severity"')).toBeLessThan(
      html.indexOf('data-cold-search-action="submit"')
    );
    expect(html).not.toContain('data-alert-center-refresh-slot="right"');
    expect(html).not.toContain('<span>搜索告警</span>');
    expect(html).not.toContain('<span>告警状态</span>');
    expect(html).not.toContain('<span>严重级别</span>');
    expect(source).toContain('rounded-[4px]');
    expect(source).toContain('rounded-[3px]');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).not.toContain('data-alert-center-search-field="cold-leading-icon"');
    expect(source).not.toContain('coldCenterVisual.search.input');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('min-h-[596px]');
  });

  it('hides the clear-filters action when no filters are active', () => {
    const html = renderSurface({}, t);

    expect((html.match(/>Refresh</g) ?? []).length).toBe(1);
    expect(html).not.toContain('Clear Filters');
    expect(html).not.toContain('data-alert-center-clear-filters="true"');
  });

  it('renders cold entity context and noise-control summary shells', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts,
        noiseControlSummary: {
          activeSilenceCount: 1,
          matchingInhibitCount: 2,
          possibleAlertSuppression: true,
          activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
          matchingInhibits: [{ id: 22, name: 'inhibit-1', type: 'inhibit' }]
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      }
    }, t);

    expect(html).toContain('data-alert-entity-context="cold-context-panel"');
    expect(html).toContain('data-alert-noise-controls="cold-noise-panel"');
    expect(html).toContain('Reviewing this entity');
    expect(html).toContain('Checkout API');
    expect(html).toContain('Back to entity');
    expect(html).toContain('Silence and inhibit rules');
    expect(html).toContain('Open matching silence rules');
    expect(html).toContain('Open matching inhibit rules');
  });

  it('renders topology alert-impact context with the selected edge and return path', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const html = renderSurface({
      draft: {
        search: 'checkout-api',
        status: 'firing',
        severity: '',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db',
        returnTo: `${returnTo}&returnLabel=HertzBeat%20%E4%BC%81%E4%B8%9A%E8%BF%90%E7%BB%B4%E6%8B%93%E6%89%91`,
        returnLabel: 'HertzBeat 企业运维拓扑'
      }
    }, zh);

    expect(html).toContain('data-alert-topology-context="impact-filter-panel"');
    expect(html).toContain('拓扑影响面');
    expect(html).toContain('checkout-api');
    expect(html).toContain('resource-dependency');
    expect(html).toContain('数据库 / 中间件连接');
    expect(html).toContain('svc-checkout--res-orders-db');
    expect(html).toContain('data-alert-topology-return="true"');
    expect(html).toContain('href="/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain('returnLabel');
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
  });

  it('renders the OTLP alert evidence closure panel with signal evidence and operation entries', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        signal: 'traces',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/topology?viewMode=resource-dependency&edgeId=svc-checkout--orders-db'
      }
    }, zh);

    expect(html).toContain('data-alert-evidence-closure="otlp-alert-evidence-workbench"');
    expect(html).toContain('告警证据闭环');
    expect(html).toContain('把实体、指标、日志、链路和拓扑证据放在同一个处理入口。');
    expect(html).toContain('data-alert-closure-summary="evidence-and-actions"');
    expect(html).toContain('data-alert-evidence-summary="entity,metrics,logs,traces,topology"');
    expect(html).toContain('data-alert-operation-summary="acknowledge,recover,threshold,notice,group,silence,inhibit,automation,close"');
    expect(html).toContain('证据范围');
    expect(html).toContain('实体详情 / 指标证据 / 日志证据 / 链路证据 / 拓扑影响面');
    expect(html).toContain('处理动作');
    expect(html).toContain('确认告警 / 标记已恢复 / 创建阈值规则 / 配置通知策略 / 配置分组收敛 / 创建静默 / 创建抑制 / 建议自动化动作 / 关闭告警');
    expect(html).toContain('data-alert-evidence-link="entity"');
    expect(html).toContain('data-alert-evidence-link="metrics"');
    expect(html).toContain('data-alert-evidence-link="logs"');
    expect(html).toContain('data-alert-evidence-link="traces"');
    expect(html).toContain('data-alert-evidence-link="topology"');
    expect(html).toContain('/entities/42?');
    expect(html).toContain('/ingestion/otlp/metrics?');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('/topology?viewMode=resource-dependency');
    expect(html).toContain('data-alert-closure-action="acknowledge"');
    expect(html).toContain('data-alert-closure-action="recover"');
    expect(html).toContain('data-alert-closure-action="threshold"');
    expect(html).toContain('data-alert-closure-action="notice"');
    expect(html).toContain('data-alert-closure-action="group"');
    expect(html).toContain('data-alert-closure-action="silence"');
    expect(html).toContain('data-alert-closure-action="inhibit"');
    expect(html).toContain('data-alert-closure-action="automation"');
    expect(html).toContain('data-alert-closure-action="close"');
    expect(html).toContain('确认告警');
    expect(html).toContain('标记已恢复');
    expect(html).toContain('创建阈值规则');
    expect(html).toContain('配置通知策略');
    expect(html).toContain('配置分组收敛');
    expect(html).toContain('创建静默');
    expect(html).toContain('创建抑制');
    expect(html).toContain('建议自动化动作');
    expect(html).toContain('/actions?');
    expect(html).toContain('alertGroupId=7');
    expect(html).toContain('关闭告警');
  });

  it('renders inherited time and monitor context inside the existing alert evidence panel', () => {
    const html = renderSurface({
      draft: {
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        timeRange: 'last-45m',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        source: 'monitor',
        signal: 'metrics',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443',
        returnTo: '/monitors/632051474676992'
      }
    }, zh);

    expect(html).toContain('data-alert-evidence-closure="otlp-alert-evidence-workbench"');
    expect(html).toContain('data-alert-evidence-context="inherited-time-context"');
    expect(html).toContain('data-alert-evidence-context-row="time"');
    expect(html).toContain('时间范围');
    expect(html).toContain('last-45m');
    expect(html).toContain('2024/04/16 00:53:20 → 2024/04/16 01:38:20 · 刷新 30s · 已暂停 · Asia/Shanghai');
    expect(html).toContain('data-alert-evidence-context-row="monitor"');
    expect(html).toContain('监控实例');
    expect(html).toContain('checkout-http');
    expect(html).toContain('website · example.com:443 · monitorId 632051474676992');
    expect(html).toContain('data-alert-evidence-context-row="source"');
    expect(html).toContain('采集来源');
    expect(html).toContain('传统监控');
    expect(html).toContain('监控中心上下文');
    expect(html).not.toContain('健康');
    expect(html).not.toContain('0 个证据');
    expect(html).not.toContain('fake');
  });

  it('renders operator feedback after an alert closure operation succeeds or fails', () => {
    const successHtml = renderSurface({
      operationFeedback: {
        tone: 'success',
        copy: '告警状态已更新，列表正在刷新。'
      }
    }, zh);
    const failedHtml = renderSurface({
      operationFeedback: {
        tone: 'danger',
        copy: '操作未完成，请稍后重试。'
      }
    }, zh);

    expect(successHtml).toContain('data-alert-operation-feedback="success"');
    expect(successHtml).toContain('aria-live="polite"');
    expect(successHtml).toContain('告警状态已更新，列表正在刷新。');
    expect(failedHtml).toContain('data-alert-operation-feedback="danger"');
    expect(failedHtml).toContain('操作未完成，请稍后重试。');
  });

  it('explains disabled direct closure actions with localized title and aria labels', () => {
    const html = renderSurface({
      data: {
        summary,
        groupAlerts: {
          content: [],
          totalElements: 0,
          pageIndex: 0,
          pageSize: 8
        }
      } as any,
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        source: 'alert',
        timeRange: 'last-1h'
      }
    }, zh);

    expect(html).toContain('data-alert-closure-action-disabled="missing-alert-group-id"');
    expect(html).toContain('title="需要选择告警组后才能执行此操作"');
    expect(html).toContain('aria-label="确认告警：需要选择告警组后才能执行此操作"');
    expect(html).toContain('aria-label="标记已恢复：需要选择告警组后才能执行此操作"');
    expect(html).toContain('aria-label="关闭告警：需要选择告警组后才能执行此操作"');
    expect(html).not.toContain('missing-alert-group-id 需要');
  });

  it('fires direct closure operation buttons with the primary group id while keeping silence and inhibit as rule links', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{
            search: 'checkout',
            status: 'firing',
            severity: 'critical',
            entityId: '42',
            entityName: 'Checkout API',
            serviceName: 'checkout',
            source: 'otlp',
            signal: 'traces',
            traceId: 'trace-123',
            spanId: 'span-456',
            collector: 'edge-collector-a',
            template: 'java-service',
            returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
          }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const acknowledge = interactionContainer.querySelector(
      'button[data-alert-closure-action="acknowledge"]'
    ) as HTMLButtonElement | null;
    const recover = interactionContainer.querySelector('button[data-alert-closure-action="recover"]') as HTMLButtonElement | null;
    const close = interactionContainer.querySelector('button[data-alert-closure-action="close"]') as HTMLButtonElement | null;
    const threshold = interactionContainer.querySelector('a[data-alert-closure-action="threshold"]') as HTMLAnchorElement | null;
    const notice = interactionContainer.querySelector('a[data-alert-closure-action="notice"]') as HTMLAnchorElement | null;
    const group = interactionContainer.querySelector('a[data-alert-closure-action="group"]') as HTMLAnchorElement | null;
    const silence = interactionContainer.querySelector('a[data-alert-closure-action="silence"]') as HTMLAnchorElement | null;
    const inhibit = interactionContainer.querySelector('a[data-alert-closure-action="inhibit"]') as HTMLAnchorElement | null;

    expect(acknowledge).not.toBeNull();
    expect(recover).not.toBeNull();
    expect(close).not.toBeNull();
    expect(threshold?.getAttribute('href')).toContain('/alert/setting?');
    expect(notice?.getAttribute('href')).toContain('/alert/notice?');
    expect(group?.getAttribute('href')).toContain('/alert/group?');
    expect(silence?.getAttribute('href')).toContain('/alert/silence?');
    expect(inhibit?.getAttribute('href')).toContain('/alert/inhibit?');
    [threshold, notice, group, silence, inhibit].forEach(anchor => {
      const params = new URL(anchor?.getAttribute('href') || '', 'http://localhost').searchParams;
      expect(params.get('signal')).toBe('traces');
      expect(params.get('traceId')).toBe('trace-123');
      expect(params.get('spanId')).toBe('span-456');
      expect(params.get('collector')).toBe('edge-collector-a');
      expect(params.get('template')).toBe('java-service');
      expect(params.get('returnTo')).toBe('/trace/manage?traceId=trace-123');
      expect(params.get('returnLabel')).toBeNull();
    });

    await act(async () => {
      acknowledge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      recover?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'acknowledge', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'recover', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(3, 'close', 7);
  });

  it('uses the same mutation callback for grouped-card acknowledge and resolve actions', async () => {
    const onClosureAction = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertCenterSurface
          t={zh}
          data={{ summary, groupAlerts } as any}
          draft={{ search: '', status: 'firing', severity: '', entityId: '42', entityName: 'Checkout API' }}
          onDraftChange={vi.fn()}
          onRefresh={vi.fn()}
          onClearFilters={vi.fn()}
          onClosureAction={onClosureAction}
        />
      );
      await Promise.resolve();
    });

    const acknowledge = interactionContainer.querySelector(
      'button[data-alert-group-action="acknowledge"]'
    ) as HTMLButtonElement | null;
    const resolveAction = interactionContainer.querySelector('button[data-alert-group-action="resolve"]') as HTMLButtonElement | null;

    expect(acknowledge).not.toBeNull();
    expect(resolveAction).not.toBeNull();

    await act(async () => {
      acknowledge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      resolveAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClosureAction).toHaveBeenNthCalledWith(1, 'acknowledge', 7);
    expect(onClosureAction).toHaveBeenNthCalledWith(2, 'recover', 7);
  });

  it('keeps the entity-context return link on the shared workspace return owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(source).toContain("from '../../lib/workspace-navigation'");
    expect(source).toContain('buildEntitySignalRouteContext');
    expect(source).toContain('buildEntityWorkspaceHref');
    expect(source).not.toContain("href={draft.returnTo || '#'}");
  });

  it('renders the grouped alert stack without falling back to the selected-alert rail posture', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      }
    }, t);

    expect(html).toContain('data-alert-group-card-stack="true"');
    expect(html).toContain('data-alert-group-card="7"');
    expect(html).toContain('data-alert-group-response-posture="7"');
    expect(html).toContain('data-alert-group-response-stage="Response state: Needs acknowledgement"');
    expect(html).toContain('data-alert-group-evidence-summary="Evidence: 1 alert · 2 labels"');
    expect(html).toContain('data-alert-group-closure-summary="Next: Acknowledge / Mark resolved / Create silence / Create inhibit"');
    expect(html).toContain('Response state: Needs acknowledgement');
    expect(html).toContain('Evidence: 1 alert · 2 labels');
    expect(html).toContain('Next: Acknowledge / Mark resolved / Create silence / Create inhibit');
    expect(html).toContain('data-alert-card="701"');
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
    expect(html).toContain('Acknowledge');
    expect(html).toContain('Mark resolved');
    expect(html).toContain('Create silence');
    expect(html).toContain('Create inhibit');
    expect(html).not.toContain('Fingerprint / Creator');
  });

  it('renders the shared silence quick-dialog shell when the grouped-card action opens it', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      },
      initialDialogState: { groupKey: '7', mode: 'silence' }
    }, t);

    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-alert-rule-dialog="silence"');
    expect(html).toContain('Create alert silence');
    expect(html).toContain('Checkout API');
    expect(html).toContain('Silence Strategy Name');
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
  });

  it('renders the shared inhibit quick-dialog shell with shared shortcut posture', () => {
    const html = renderSurface({
      draft: {
        search: '',
        status: 'firing',
        severity: '',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42',
        returnLabel: 'Checkout'
      },
      initialDialogState: { groupKey: '7', mode: 'inhibit' }
    }, t);

    expect(html).toContain('data-alert-rule-dialog="inhibit"');
    expect(html).toContain('Create alert inhibit');
    expect(html).toContain('Copy source to target');
    expect(html).toContain('Target without severity');
    expect(html).toContain('Clear target');
    expect(html).toContain('Clear equal labels');
    expect(html).toContain('Source Labels');
    expect(html).toContain('Target Labels');
    expect(html).toContain('Equal Labels');
  });

  it('pins the alert center shell to the shared cold visual owner instead of page-local primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(source).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(source).toContain('data-alert-center-style-baseline={coldCenterVisual.canvasName}');
    expect(source).toContain('data-alert-center-header="cold-compact-header"');
    expect(source).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(source).toContain('data-alert-center-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-center-query-toolbar="single-query-form"');
    expect(source).toContain('data-alert-center-list-shell="cold-alert-list"');
    expect(source).toContain('data-alert-center-empty-state="cold-table-empty"');
    expect(source).not.toContain('data-alert-center-refresh-slot');
    expect(source).not.toContain('data-alert-center-empty-action');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('angular-single-panel');
    expect(source).not.toContain('angular-density');
  });
});
