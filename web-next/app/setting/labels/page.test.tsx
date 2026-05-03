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
          name: 'team',
          tagValue: 'ops',
          description: 'ops team',
          type: 1
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
const loadLabelData = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'setting.labels.loading': '正在加载标签'
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

vi.mock('@/components/pages/label-manage-surface', () => ({
  LabelManageSurface: ({ search, draftLabel, isManageModalAdd }: any) => (
    <div
      data-label-manage-surface="otlp-cold-label-console"
      data-label-manage-style-baseline="hertzbeat-cold-matte"
    >
      <section data-label-admin-layout="full-width-admin-list">
        <span>标签管理</span>
        <span>{search}</span>
        <span>{draftLabel ? draftLabel.name : 'no-draft'}</span>
        <span>{String(isManageModalAdd)}</span>
      </section>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  apiMessageDelete
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/label-manage/controller', () => ({
  loadLabelData,
  createEmptyLabelDraft: () => ({ id: 0, name: '', tagValue: '', description: '', type: 1 }),
  cloneLabelDraft: (label: any) => ({ ...label }),
  saveLabel: vi.fn(),
  deleteLabel: vi.fn()
}));

describe('setting labels page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    apiMessageDelete.mockReset();
    loadLabelData.mockReset().mockImplementation(async (apiGetFn, query) => {
      await apiGetFn(`/label?pageIndex=0&pageSize=8${query.search ? `&search=${query.search}` : ''}`);
      return mockState.renderData;
    });
  });

  it('renders the shared label surface and keeps the route focused on load composition', async () => {
    const { default: SettingLabelsPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingLabelsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-label-manage-surface="otlp-cold-label-console"');
    expect(html).toContain('data-label-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-label-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-label-summary-rail=');
    expect(html).not.toContain('标签摘要');
    expect(html).not.toContain('当前标签集');
    expect(html).toContain('标签管理');
    expect(html).toContain('no-draft');
    expect(html).toContain('false');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/label?pageIndex=0&pageSize=8');
  });

  it('keeps the route thin and leaves cold label visuals in the shared surface', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/page.tsx'), 'utf8');

    expect(source).toContain('LabelManageSurface');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('data-label-card-shell');
    expect(source).not.toContain('data-label-toolbar');
    expect(source).not.toContain('otlp-cold-label-console');
  });
});
