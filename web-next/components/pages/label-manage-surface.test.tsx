import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('label manage surface', () => {
  it('renders the OTLP cold-matte label console, dense table, and authoring dialog shell', async () => {
    const { LabelManageSurface } = await import('./label-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.copy.button': '复制',
        'common.button.edit': '编辑',
        'common.button.delete': '删除选中项',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.edit': '编辑标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'team',
                tagValue: 'ops',
                description: 'ops team',
                type: 1,
                gmtUpdate: '2026-04-10T10:00:00Z'
              },
              {
                id: 2,
                name: 'source',
                tagValue: 'system',
                description: 'preset label',
                type: 2,
                gmtUpdate: '2026-04-09T10:00:00Z'
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search="team"
        draftLabel={{
          id: 0,
          name: 'team',
          tagValue: 'ops',
          description: 'ops team',
          type: 1
        }}
        isManageModalAdd
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-manage-surface="otlp-cold-label-console"');
    expect(html).toContain('data-label-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-label-header="cold-compact-header"');
    expect(html).toContain('data-label-command-row="standard-equal-buttons"');
    expect(html).toContain('data-label-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-label-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-label-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-label-table-shell="cold-dense-table"');
    expect(html).toContain('data-label-table="cold-label-table"');
    expect(html).toContain('data-label-row="1"');
    expect(html).toContain('data-label-row-actions="cold-icon-actions"');
    expect(html).not.toContain('data-label-summary-rail=');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('标签管理');
    expect(html).toContain('新增');
    expect(html).toContain('搜索标签');
    expect(html).toContain('搜索');
    expect(html).toContain('aria-label="复制"');
    expect(html).toContain('aria-label="编辑"');
    expect(html).toContain('aria-label="删除选中项"');
    expect(html).toContain('team:ops');
    expect(html).toContain('source:system');
    expect(html).toContain('ops team');
    expect(html).toContain('preset label');
    expect(html).toContain('用户标签');
    expect(html).toContain('预置标签');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('新增标签');
    expect(html).toContain('标签名');
    expect(html).toContain('标签值');
    expect(html).toContain('标签描述');
    expect(html).toContain('效果');
    expect(html).toContain('取消');
    expect(html).toContain('保存');
    expect(html).not.toContain('data-label-manage-route="angular-label-cards"');
    expect(html).not.toContain('data-label-card-shell="angular-card"');
    expect(html).not.toContain('setting.labels.subtitle');
  });

  it('renders a cold table empty state with Chinese fallback copy when no labels exist', async () => {
    const { LabelManageSurface } = await import('./label-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'label.search': '搜索标签'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        draftLabel={null}
        isManageModalAdd={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-empty-state="cold-table-empty"');
    expect(html).toContain('data-label-empty-icon="cold-empty-box"');
    expect(html).toContain('暂无标签');
    expect(html).toContain('请先新增标签。');
    expect(html).not.toContain('setting.labels.empty.title');
    expect(html).not.toContain('setting.labels.empty.copy');
  });

  it('keeps the labels page on the cold visual owner instead of WorkbenchPage or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/label-manage-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-label-manage-surface="otlp-cold-label-console"');
    expect(source).toContain('data-label-manage-style-baseline={coldLabelVisual.canvasName}');
    expect(source).toContain('data-label-header="cold-compact-header"');
    expect(source).toContain('data-label-command-row="standard-equal-buttons"');
    expect(source).toContain('data-label-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-label-toolbar="cold-table-toolbar"');
    expect(source).toContain('data-label-search-owner="shared-search-row"');
    expect(source).toContain('data-label-table-shell="cold-dense-table"');
    expect(source).toContain('data-label-table="cold-label-table"');
    expect(source).toContain('data-label-empty-state="cold-table-empty"');
    expect(source).not.toContain('data-label-summary-rail');
    expect(source).not.toContain('coldLabelVisual.search.row');
    expect(source).not.toContain('coldLabelVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldLabelVisual.layout.heroGrid');
    expect(source).not.toContain('coldLabelVisual.layout.railGrid');
    expect(source).not.toContain('coldLabelVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('data-label-manage-route="angular-label-cards"');
    expect(source).not.toContain('data-label-toolbar="angular-card-toolbar"');
    expect(source).not.toContain('data-label-card-grid="angular-card-grid"');
    expect(source).not.toContain('data-label-card-shell="angular-card"');
    expect(source).not.toContain('data-label-card-actions="angular-card-actions"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('buildLabelFacts');
    expect(source).not.toContain('setting.labels.subtitle');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.02]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('text-white/72');
    expect(source).not.toContain('text-white/86');
    expect(source).not.toContain('text-white/62');
    expect(source).not.toContain('text-white/30');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('flex min-h-[180px] flex-col rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3.5');
  });
});
