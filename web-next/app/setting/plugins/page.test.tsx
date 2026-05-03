import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
          name: 'smtp',
          enableStatus: true,
          items: [{ type: 'POST_ALERT' }],
          paramCount: 2
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());
const apiMessageDelete = vi.hoisted(() => vi.fn());
const loadPluginData = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'setting.plugins.loading': '加载插件'
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

vi.mock('@/components/pages/plugin-manage-surface', () => ({
  PluginManageSurface: ({ search, draftPlugin }: any) => (
    <div
      data-plugin-manage-surface="otlp-cold-plugin-console"
      data-plugin-manage-style-baseline="hertzbeat-cold-matte"
    >
      <section data-plugin-admin-layout="full-width-admin-list">
        <span>插件表格</span>
      </section>
      <span>插件管理</span>
      <span>{search}</span>
      <span>{draftPlugin ? draftPlugin.name : 'no-draft'}</span>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  apiMessageDelete
}));

vi.mock('@/lib/plugin-manage/controller', () => ({
  loadPluginData,
  createEmptyPluginDraft: () => ({ name: '', jarFileName: '', enableStatus: true }),
  savePlugin: vi.fn(),
  togglePluginStatus: vi.fn(),
  deletePlugin: vi.fn()
}));

describe('setting plugins page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    apiMessageDelete.mockReset();
    loadPluginData.mockReset().mockImplementation(async (apiGetFn, query) => {
      await apiGetFn(`/plugin?pageIndex=0&pageSize=8${query.search ? `&search=${query.search}` : ''}`);
      return mockState.renderData;
    });
  });

  it('renders the shared plugin surface and keeps the route focused on load composition', async () => {
    const { default: SettingPluginsPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingPluginsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-plugin-summary-rail=');
    expect(html).not.toContain('插件摘要');
    expect(html).not.toContain('当前插件');
    expect(html).toContain('插件管理');
    expect(html).toContain('no-draft');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/plugin?pageIndex=0&pageSize=8');
  });

  it('keeps route composition out of the old observability/workbench visual owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/plugins/page.tsx'), 'utf8');

    expect(source).toContain('PluginManageSurface');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('buildPluginFacts');
  });
});
