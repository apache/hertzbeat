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
          id: 1,
          name: 'cpu-alert',
          type: 'realtime_metric',
          datasource: 'http',
          expr: 'up == 0',
          enable: true,
          period: 60
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    },
    datasourceStatus: {
      code: 0,
      data: {
        http: 'ready'
      }
    }
  }
}));

const apiGet = vi.hoisted(() => vi.fn());
const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());
const loadDefineCenterData = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'setting.define.loading': '加载定义中心',
        'menu.advanced.define': '定义'
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

vi.mock('@/components/pages/setting-define-surface', () => ({
  SettingDefineSurface: ({ selectedDefine, yamlLabel, darkMode, isEditing }: any) => (
    <div data-setting-define-surface="otlp-cold-define-console">
      <span>定义</span>
      <span>{selectedDefine?.name}</span>
      <span>{yamlLabel}</span>
      <span>{String(darkMode)}</span>
      <span>{String(isEditing)}</span>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiGet,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/setting-define/controller', () => ({
  loadDefineCenterData,
  buildPreviewUrl: () => '/alert/define/preview/http?type=realtime_metric&expr=up+%3D%3D+0',
  buildSkeletonDefine: () => ({
    id: 0,
    name: 'next-migrated-define',
    datasource: 'promql',
    expr: 'up == 0'
  }),
  createSkeletonDefine: vi.fn(),
  saveDefine: vi.fn()
}));

describe('setting define page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiGet.mockReset();
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    loadDefineCenterData.mockReset().mockImplementation(async (apiGetFn, search) => {
      await apiGetFn(`/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc${search ? `&search=${search}` : ''}`);
      await apiGetFn('/alert/define/datasource/status');
      return mockState.renderData;
    });
  });

  it('renders the shared define surface and keeps the route focused on load composition', async () => {
    const { default: SettingDefinePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingDefinePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('定义');
    expect(html).toContain('cpu-alert');
    expect(html).toContain('http.yml');
    expect(html).toContain('false');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/alert/define/datasource/status');
  });
});
