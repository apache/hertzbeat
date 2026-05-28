import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const loadState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>)
}));
const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({ t })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load, loadingCopy, cacheKey, cacheSettledTtlMs }: any) => {
    loadState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-loading-copy={loadingCopy}
        data-cache-key={cacheKey}
        data-cache-ttl={cacheSettledTtlMs}
      >
        {children({
          apiState: 'ready',
          apiSource: 'status-page-incident-list',
          detailState: 'ready',
          detailSource: 'status-page-incident-detail',
          detailId: '42',
          queryLabel: '/status/page/incident?pageIndex=0&pageSize=8',
          title: '故障事件',
          subtitle: '按 OTLP 工作台的冷色基线统一响应时间线、责任人和证据入口。',
          kicker: '事件响应台',
          metrics: [
            { label: '打开事件', value: '1', tone: 'warning' },
            { label: '严重事件', value: '1', tone: 'critical' },
            { label: '缓解中', value: '1', tone: 'info' },
            { label: '责任队列', value: '1', tone: 'info' }
          ],
          incidents: [
            {
              id: '42',
              title: 'API 延迟事件',
              severity: 'critical',
              stage: '调查中',
              service: 'api-gateway',
              owner: 'platform-oncall',
              openedAt: '2026-04-10 18:00:00',
              blastRadius: '1 组件'
            }
          ],
          timelineRows: [
            {
              id: 'incident-timeline-42-8',
              title: '2026-04-10 18:05:00 · 已识别',
              copy: '已开始回滚',
              meta: 'API 延迟事件',
              tone: 'warning'
            }
          ],
          ownershipRows: [
            {
              id: 'incident-owner-42',
              owner: 'platform-oncall',
              queue: '调查中',
              copy: 'API 延迟事件',
              meta: '1 组件 · 2026-04-10 18:00:00',
              tone: 'critical'
            }
          ],
          nextHops: [
            { label: '打开概览', href: '/overview', variant: 'subtle' },
            { label: '查看日志', href: '/log/manage', variant: 'default' }
          ],
          selectedIncidentId: '42',
          selectedIncident: {
            id: 42,
            name: 'API 延迟事件',
            state: 1,
            contents: []
          },
          transitionState: 'ready',
          totalElements: 1
        })}
      </div>
    );
  }
}));

vi.mock('../../lib/api-client', () => ({
  apiMessageGet,
  apiMessagePut
}));

describe('incidents page', () => {
  it('renders the API-backed UI Lab shared incident workbench instead of the placeholder entry shell', async () => {
    loadState.lastLoad = null;
    apiMessageGet.mockReset();
    apiMessagePut.mockReset();
    apiMessageGet
      .mockResolvedValueOnce({
        content: [
          {
            id: 42,
            title: 'API 延迟事件',
            state: 0,
            startTime: 1712730000000,
            creator: 'platform-oncall',
            components: [{ id: 7, name: 'api-gateway' }],
            contents: []
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      })
      .mockResolvedValueOnce({
        id: 42,
        name: 'API 延迟事件详情',
        state: 1,
        startTime: 1712730000000,
        modifier: 'platform-oncall',
        components: [{ id: 7, name: 'api-gateway' }],
        contents: [{ id: 8, state: 1, message: '详情已加载', timestamp: 1712730300000 }]
      });
    const routeSource = readFileSync(resolve(process.cwd(), 'app/incidents/page.tsx'), 'utf8');
    const source = readFileSync(resolve(process.cwd(), 'app/incidents/incidents-page.tsx'), 'utf8');
    const { default: IncidentsPage } = await import('./page');
    const html = renderToStaticMarkup(await IncidentsPage());
    const lastLoad = loadState.lastLoad as (() => Promise<unknown>) | null;
    await lastLoad?.();

    expect(routeSource).toContain("import IncidentsPage from './incidents-page'");
    expect(routeSource).toContain('readIncidentWorkbenchQuery');
    expect(routeSource).toContain('const resolvedSearchParams = await searchParams');
    expect(routeSource).toContain('return <IncidentsPage initialQuery={initialQuery} />');
    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-loading-copy="正在准备页面数据，请稍等。"');
    expect(html).toContain('data-cache-key="incident-workbench::0:8:0"');
    expect(html).toContain('data-cache-ttl="10000"');
    expect(html).toContain('data-incidents-route="incident-workbench-api-ui-lab-shared"');
    expect(html).toContain('data-incidents-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-incidents-workbench="hertzbeat-ui"');
    expect(html).toContain('data-incidents-api-owner="status-page-incident-api"');
    expect(html).toContain('data-incidents-api-source="status-page-incident-list"');
    expect(html).toContain('data-incidents-api-state="ready"');
    expect(html).toContain('data-incidents-api-total="1"');
    expect(html).toContain('data-incidents-detail-owner="status-page-incident-detail-api"');
    expect(html).toContain('data-incidents-detail-source="status-page-incident-detail"');
    expect(html).toContain('data-incidents-detail-state="ready"');
    expect(html).toContain('data-incidents-detail-id="42"');
    expect(html).toContain('data-incidents-transition-owner="status-page-incident-put-api"');
    expect(html).toContain('data-incidents-transition-source="/status/page/incident"');
    expect(html).toContain('data-incidents-transition-state="ready"');
    expect(html).toContain('data-incidents-transition-pending="none"');
    expect(html).toContain('data-incidents-query-contract="angular-search-pagination"');
    expect(html).toContain('data-incidents-query-label="/status/page/incident?pageIndex=0&amp;pageSize=8"');
    expect(html).toContain('data-incidents-shared-workbench="hertzbeat-ui"');
    expect(html).toContain('data-hz-ui="incident-workbench"');
    expect(html).toContain('data-hz-incident-workbench-owner="hertzbeat-ui-incident-workbench"');
    expect(html).toContain('data-hz-incident-workbench-density="operator-compact"');
    expect(html).toContain('data-hz-incident-workbench-style="cold-matte-hard-edge"');
    expect(html).toContain('data-hz-incident-workbench-table="shared"');
    expect(html).toContain('data-hz-incident-workbench-query="/status/page/incident?pageIndex=0&amp;pageSize=8"');
    expect(html).toContain('data-hz-incident-transition-actions="shared"');
    expect(html).toContain('data-hz-incident-transition-owner="hertzbeat-ui-incident-transition-actions"');
    expect(html).toContain('data-hz-incident-transition-action="state-1"');
    expect(html).toContain('data-hz-incident-transition-action="state-2"');
    expect(html).toContain('data-hz-incident-transition-action="state-3"');
    expect(html).toContain('data-hz-incident-transition-disabled="false"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-hz-incident-timeline-item="incident-timeline-42-8"');
    expect(html).toContain('data-hz-incident-owner-item="incident-owner-42"');
    expect(html).toContain('故障事件');
    expect(html).toContain('API 延迟事件');
    expect(html).toContain('data-hz-row-selected="true"');
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/status/page/incident?pageIndex=0&pageSize=8');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/status/page/incident/42');
    expect(html).not.toContain('angular-dark-ops-placeholder');
    expect(html).not.toContain('DARK OPS');
    expect(html).not.toContain('V1 SHELL IS LIVE');
    expect(html).not.toContain('Domain adapter comes next');
    expect(html).not.toContain('data-incidents-shell-panel="cold-ops-shell-panel"');
    expect(html).not.toContain('data-incidents-launch-checklist="cold-ops-static-rail"');
    expect(html).not.toContain('data-incidents-empty-state="cold-ops-domain-adapter"');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('HzIncidentWorkbench');
    expect(source).toContain('ClientWorkbench');
    expect(source).toContain('loadIncidentWorkbenchData');
    expect(source).toContain('apiMessageGet');
    expect(source).toContain('apiMessagePut');
    expect(source).toContain('transitionIncidentStatus');
    expect(source).toContain('data-incidents-detail-source');
    expect(source).toContain('data-incidents-transition-source');
    expect(source).toContain('data-incidents-query-contract="angular-search-pagination"');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('#4f6cff');
    expect(source).not.toContain('#101c31');
    expect(html).not.toContain('incidents.subtitle');
    expect(html).not.toContain('data-summary-metric-grid');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
  });

  it('preserves the Angular incident search and server-side pagination read contract from route query params', async () => {
    loadState.lastLoad = null;
    apiMessageGet.mockReset();
    apiMessagePut.mockReset();
    apiMessageGet
      .mockResolvedValueOnce({
        content: [
          {
            id: 77,
            name: 'API latency from query',
            state: 2,
            startTime: 1712730000000,
            creator: 'platform-oncall',
            components: [{ id: 9, name: 'checkout-api' }],
            contents: []
          }
        ],
        totalElements: 1,
        pageIndex: 2,
        pageSize: 15
      })
      .mockResolvedValueOnce({
        id: 77,
        name: 'API latency from query',
        state: 2,
        startTime: 1712730000000,
        modifier: 'platform-oncall',
        components: [{ id: 9, name: 'checkout-api' }],
        contents: [{ id: 10, state: 2, message: 'query detail loaded', timestamp: 1712730300000 }]
      });

    const { default: IncidentsPage } = await import('./page');
    const html = renderToStaticMarkup(await IncidentsPage({
      searchParams: Promise.resolve({
        search: 'api latency',
        pageIndex: '2',
        pageSize: '15'
      })
    }));
    const lastLoad = loadState.lastLoad as (() => Promise<unknown>) | null;
    await lastLoad?.();

    expect(html).toContain('data-cache-key="incident-workbench:api latency:2:15:0"');
    expect(html).toContain('data-incidents-query-contract="angular-search-pagination"');
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/status/page/incident?pageIndex=2&pageSize=15&search=api+latency');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/status/page/incident/77');
  });
});
