import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      content: [
        {
          collector: {
            name: 'edge-a',
            ip: '10.0.0.1',
            status: 0,
            mode: 'public',
            version: '1.0.0',
            gmtUpdate: '2026-04-10T10:00:00Z'
          },
          pinMonitorNum: 2,
          dispatchMonitorNum: 5
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const loadCollectorData = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.collector': '采集集群',
        'collector.deploy': '部署采集器',
        'collector.online': '上线采集器',
        'collector.offline': '下线采集器',
        'collector.delete': '删除采集器',
        'collector.name': '采集器名称',
        'collector.status': '运行状态',
        'common.refresh': '刷新',
        'common.search': '搜索'
      }
    })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/collector-manage-surface', () => ({
  CollectorManageSurface: ({ search, data }: any) => (
    <div data-collector-manage-surface="otlp-cold-collector-console" data-collector-manage-style-baseline="hertzbeat-cold-matte">
      <section data-collector-admin-layout="full-width-admin-list">
        <span>刷新</span>
        <span>部署采集器</span>
        <span>上线采集器</span>
        <span>下线采集器</span>
        <span>删除采集器</span>
        <span>搜索</span>
        <span>采集集群</span>
        <span>{search}</span>
        <span>{data.list.content[0].collector.name}</span>
        <span>{data.list.content[0].collector.ip}</span>
      </section>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/collector-manage/controller', () => ({
  loadCollectorData
}));

describe('setting collector page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset();
    loadCollectorData.mockReset().mockImplementation(async (apiGet, query) => {
      await apiGet(`/collector?pageIndex=0&pageSize=8${query.search ? `&name=${query.search}` : ''}`);
      return mockState.renderData;
    });
  });

  it('renders the collector toolbar and table shell inside the route contract', async () => {
    const { default: SettingCollectorPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingCollectorPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-collector-summary-rail=');
    expect(html).not.toContain('当前采集集群');
    expect(html).not.toContain('选中节点');
    expect(html).toContain('刷新');
    expect(html).toContain('部署采集器');
    expect(html).toContain('上线采集器');
    expect(html).toContain('下线采集器');
    expect(html).toContain('删除采集器');
    expect(html).toContain('搜索');
    expect(html).toContain('采集集群');
    expect(html).toContain('edge-a');
    expect(html).toContain('10.0.0.1');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/collector?pageIndex=0&pageSize=8');
  });
});
