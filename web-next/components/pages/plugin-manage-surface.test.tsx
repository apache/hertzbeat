import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('plugin manage surface', () => {
  it('renders the OTLP cold-matte plugin console, dense table, translated types, and upload dialog shell', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.file.select': '选择文件'
      }
    });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'smtp',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }, { type: 'POST_COLLECT' }],
                paramCount: 2
              },
              {
                id: 2,
                name: 'slack',
                enableStatus: false,
                items: [{ type: 'POST_ALERT' }],
                paramCount: 0
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search="smtp"
        selectedIds={[1]}
        draftPlugin={{
          name: 'smtp',
          jarFileName: 'smtp.jar',
          enableStatus: true
        }}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-plugin-header="cold-compact-header"');
    expect(html).toContain('data-plugin-command-row="standard-equal-buttons"');
    expect(html).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-plugin-manage-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-plugin-manage-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-trailing-actions="detached-secondary"');
    expect(html).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(html).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(html).toContain('data-plugin-select-all="cold-checkbox"');
    expect(html).toContain('data-plugin-row="1"');
    expect(html).toContain('data-plugin-row="2"');
    expect(html).toContain('data-plugin-row-actions="cold-icon-actions"');
    expect(html).not.toContain('data-plugin-summary-rail=');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('插件管理');
    expect(html).toContain('上传插件');
    expect(html).toContain('搜索插件');
    expect(html).toContain('插件名称');
    expect(html).toContain('插件类型');
    expect(html).toContain('启用状态');
    expect(html).toContain('操作');
    expect(html).toContain('smtp');
    expect(html).toContain('slack');
    expect(html).toContain('告警后');
    expect(html).toContain('采集后');
    expect(html).toContain('已启用');
    expect(html).toContain('已停用');
    expect(html).toContain('已选择');
    expect(html).not.toContain('POST_ALERT');
    expect(html).not.toContain('POST_COLLECT');
    expect(html).toContain('编辑参数');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('Jar包');
    expect(html).toContain('选择文件');
    expect(html).toContain('取消');
    expect(html).toContain('保存');
    expect(html).not.toContain('data-plugin-manage-route="angular-plugin-table"');
    expect(html).not.toContain('data-plugin-manage-table="angular-nz-table"');
  });

  it('keeps a cold table empty state inside the plugin table body', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
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
        selectedIds={[]}
        draftPlugin={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(html).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(html).toContain('data-plugin-manage-empty-state="cold-table-empty"');
    expect(html).toContain('data-plugin-manage-empty-icon="cold-empty-box"');
    expect(html).toContain('暂无数据');
  });

  it('keeps the plugin page on the cold visual owner instead of WorkbenchPage or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/plugin-manage-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(source).toContain('data-plugin-manage-style-baseline={coldPluginVisual.canvasName}');
    expect(source).toContain('data-plugin-header="cold-compact-header"');
    expect(source).toContain('data-plugin-command-row="standard-equal-buttons"');
    expect(source).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-plugin-manage-toolbar="cold-table-toolbar"');
    expect(source).toContain('data-plugin-manage-search-owner="shared-search-row"');
    expect(source).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(source).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(source).toContain('data-plugin-manage-empty-state="cold-table-empty"');
    expect(source).not.toContain('data-plugin-summary-rail');
    expect(source).not.toContain('coldPluginVisual.search.row');
    expect(source).not.toContain('coldPluginVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldPluginVisual.layout.heroGrid');
    expect(source).not.toContain('coldPluginVisual.layout.railGrid');
    expect(source).not.toContain('coldPluginVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('AlertSurfaceTable');
    expect(source).not.toContain('data-plugin-manage-route="angular-plugin-table"');
    expect(source).not.toContain('data-plugin-manage-panel="angular-table-panel"');
    expect(source).not.toContain('data-plugin-manage-toolbar="angular-table-toolbar"');
    expect(source).not.toContain('data-plugin-manage-table-shell="angular-table"');
    expect(source).not.toContain('data-plugin-manage-empty-state="angular-table-empty"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('WorkbenchTableFrame');
    expect(source).not.toContain('WorkbenchValuePill');
    expect(source).not.toContain('buildPluginFacts');
    expect(source).not.toContain('setting.plugins.subtitle');
    expect(source).not.toContain('rounded-[12px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('text-white/78');
    expect(source).not.toContain('text-white/72');
    expect(source).not.toContain('text-white/86');
    expect(source).not.toContain('text-white/42');
    expect(source).not.toContain('text-[#e7dfd1]');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('overflow-x-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain('className="inline-flex min-h-7 items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 text-[12px] text-[var(--ops-text-primary)]"');
  });

  it('uses the shared cold checkbox for table selection and draft enable state', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 11,
                name: 'smtp',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }],
                paramCount: 2
              },
              {
                id: 12,
                name: 'slack',
                enableStatus: false,
                items: [{ type: 'POST_COLLECT' }],
                paramCount: 0
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[11]}
        draftPlugin={{
          name: 'smtp',
          jarFileName: 'smtp.jar',
          enableStatus: true
        }}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    const source = readFileSync(resolve(process.cwd(), 'components/pages/plugin-manage-surface.tsx'), 'utf8');

    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-plugin-select-all="cold-checkbox"');
    expect(source).toContain('data-plugin-row-select={String(original.id)}');
    expect(source).toContain('data-plugin-draft-enabled-checkbox="cold-checkbox"');
    expect(source).not.toContain('className="h-3.5 w-3.5 accent-[#4e74f8]"');
    expect(html).toContain('data-plugin-select-all="cold-checkbox"');
    expect(html).toContain('data-plugin-row-select="11"');
    expect(html).toContain('data-plugin-row-select="12"');
    expect(html).toContain('data-plugin-draft-enabled-checkbox="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length ?? 0).toBe(4);
    expect(html.match(/data-cold-checkbox-control="native-hidden"/g)?.length ?? 0).toBe(4);
    expect(html.match(/data-cold-checkbox-box="indicator"/g)?.length ?? 0).toBe(4);
    expect(html).toContain('data-cold-checkbox-label="true"');
  });
});
