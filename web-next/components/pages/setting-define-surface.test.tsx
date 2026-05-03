import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, readOnly, language, onChange: _onChange, ...props }: any) => (
    <div
      data-setting-define-editor-field={props['data-setting-define-editor-field']}
      data-setting-define-code-editor={props['data-setting-define-code-editor']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-readonly={readOnly ? 'true' : undefined}
    >
      {value}
    </div>
  )
}));

describe('setting define surface', () => {
  const t = createTranslatorMock({
    locale: 'zh-CN',
    overrides: {
      'menu.advanced.define': '定义',
      'setting.define.subtitle': '管理监控类型定义、数据源和规则 YAML。',
      'define.new': '新增类型',
      'common.button.edit': '编辑',
      'common.button.cancel': '取消',
      'define.save-apply': '保存并应用',
      'define.delete': '删除 {{app}}',
      'common.search': '搜索',
      'common.dark-mode': '深色模式',
      'common.enabled': '已启用',
      'common.disabled': '已停用',
      'common.ready': '就绪',
      'common.attention': '关注',
      'common.workspace': '工作区',
      'common.total': '总量',
      'common.current-page-count': '当前页',
      'setting.define.item.fallback': '未命名定义',
      'setting.define.datasource.title': '数据源状态',
      'setting.define.empty.title': '暂无定义',
      'setting.define.empty.copy': '请先新增监控类型定义。',
      'setting.define.empty-selected.title': '未选择定义',
      'setting.define.empty-selected.copy': '从左侧列表选择一条定义。',
      'setting.define.preview.action': '预览查询',
      'setting.define.preview.title': '定义预览',
      'alert.setting.type.realtime.metric': '指标实时'
    }
  });

  it('renders the OTLP cold-matte define workspace without the copied OTLP right rail', async () => {
    const { SettingDefineSurface } = await import('./setting-define-surface');

    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'cpu-alert',
                type: 'realtime_metric',
                datasource: 'http',
                expr: 'up == 0',
                enable: true,
                period: 60,
                gmtUpdate: '2026-04-10T10:00:00Z'
              },
              {
                id: 2,
                name: 'memory-alert',
                type: 'realtime_metric',
                datasource: 'jvm',
                expr: 'memory > 90',
                enable: false,
                period: 120,
                gmtUpdate: '2026-04-09T10:00:00Z'
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          },
          datasourceStatus: {
            code: 0,
            data: {
              http: 'ready',
              jvm: 'ready'
            }
          }
        }}
        search="cpu"
        selectedDefine={{
          id: 1,
          name: 'cpu-alert',
          type: 'realtime_metric',
          datasource: 'http',
          expr: 'up == 0',
          enable: true,
          period: 60,
          gmtUpdate: '2026-04-10T10:00:00Z'
        }}
        editorValue={'apiVersion: v1\nkind: cpu-alert'}
        yamlLabel="http.yml"
        darkMode
        isEditing
        formatTime={() => '2026-04-10 18:00:00'}
        message="预览完成"
        preview={{ ok: true }}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectDefine={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleDarkMode={() => {}}
        onPreview={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('data-setting-define-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-define-header="cold-compact-header"');
    expect(html).toContain('data-setting-define-command-row="standard-equal-buttons"');
    expect(html).toContain('data-setting-define-workspace="cold-define-workspace"');
    expect(html).toContain('data-setting-define-menu="cold-static-list"');
    expect(html).toContain('data-setting-define-toolbar="cold-search-row"');
    expect(html).toContain('data-setting-define-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-setting-define-menu-shell="cold-dense-list"');
    expect(html).toContain('data-setting-define-editor="cold-settings-form"');
    expect(html).toContain('data-setting-define-editor-shell="cold-yaml-editor"');
    expect(html).toContain('data-setting-define-editor-field="cold-code-editor"');
    expect(html).toContain('data-setting-define-code-editor="definition-yaml"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="yaml"');
    expect(html).toContain('data-setting-define-preview-panel="cold-preview-panel"');
    expect(html).toContain('data-setting-define-datasource-panel="cold-datasource-panel"');
    expect(html).not.toContain('data-setting-define-summary-rail=');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).toContain('定义');
    expect(html).toContain('管理监控类型定义、数据源和规则 YAML。');
    expect(html).toContain('新增类型');
    expect(html).toContain('http.yml');
    expect(html).toContain('编辑');
    expect(html).toContain('取消');
    expect(html).toContain('保存并应用');
    expect(html).toContain('删除 cpu-alert');
    expect(html).toContain('深色模式');
    expect(html).toContain('cpu-alert');
    expect(html).toContain('memory-alert');
    expect(html).toContain('指标实时');
    expect(html).toContain('已启用');
    expect(html).toContain('已停用');
    expect(html).toContain('预览完成');
    expect(html).toContain('数据源状态');
    expect(html).not.toContain('data-setting-define-editor-field="cold-code-textarea"');
  });

  it('renders a cold empty state in the definition list', async () => {
    const { SettingDefineSurface } = await import('./setting-define-surface');

    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={{
          list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 },
          datasourceStatus: { code: 0, data: {} }
        }}
        search=""
        selectedDefine={null}
        editorValue="name: "
        yamlLabel={null}
        darkMode={false}
        isEditing={false}
        formatTime={() => '-'}
        message={null}
        preview={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectDefine={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleDarkMode={() => {}}
        onPreview={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-empty-state="cold-list-empty"');
    expect(html).toContain('暂无定义');
    expect(html).toContain('请先新增监控类型定义。');
  });

  it('uses the shared cold visual owner instead of WorkbenchPage or workbench primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/setting-define-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '../ui/cold-code-editor'");
    expect(source).toContain('data-setting-define-search-owner="shared-search-row"');
    expect(source).toContain('inputWidthClassName="w-[180px]"');
    expect(source).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(source).toContain('data-setting-define-style-baseline={coldDefineVisual.canvasName}');
    expect(source).toContain('data-setting-define-workspace="cold-define-workspace"');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('WorkbenchEditorField');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('cold-code-textarea');
    expect(source).not.toContain('WorkbenchSelectableCard');
    expect(source).not.toContain('PayloadPreview');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('coldDefineVisual.search.row');
    expect(source).not.toContain('coldDefineVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('data-setting-define-summary-rail');
    expect(source).not.toContain('coldDefineVisual.layout.heroGrid');
    expect(source).not.toContain('coldDefineVisual.layout.railGrid');
    expect(source).not.toContain('coldDefineVisual.signal.band');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.02]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('bg-black/30');
    expect(source).not.toContain('text-white');
    expect(source).not.toContain('Dark mode');
    expect(source).toContain('border-[#2b3039]');
    expect(source).toContain('bg-[#101217]');
    expect(source).toContain('text-[#a9b0bb]');
    expect(source).toContain('text-[#858d9a]');
  });

  it('uses the shared cold checkbox for the definition editor dark-mode toggle', async () => {
    const { SettingDefineSurface } = await import('./setting-define-surface');

    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'cpu-alert',
                type: 'realtime_metric',
                datasource: 'http',
                expr: 'up == 0',
                enable: true,
                period: 60,
                gmtUpdate: '2026-04-10T10:00:00Z'
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          },
          datasourceStatus: { code: 0, data: { http: 'ready' } }
        }}
        search=""
        selectedDefine={{
          id: 1,
          name: 'cpu-alert',
          type: 'realtime_metric',
          datasource: 'http',
          expr: 'up == 0',
          enable: true,
          period: 60,
          gmtUpdate: '2026-04-10T10:00:00Z'
        }}
        editorValue="apiVersion: v1"
        yamlLabel="http.yml"
        darkMode
        isEditing
        formatTime={() => '2026-04-10 18:00:00'}
        message={null}
        preview={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectDefine={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleDarkMode={() => {}}
        onPreview={() => {}}
        onEditorValueChange={() => {}}
      />
    );
    const source = readFileSync(resolve(process.cwd(), 'components/pages/setting-define-surface.tsx'), 'utf8');

    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-setting-define-theme-toggle="cold-theme-toggle"');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('accent-[#4e74f8]');
    expect(html).toContain('data-setting-define-theme-toggle="cold-theme-toggle"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-checkbox-label="true"');
    expect(html).toContain('深色模式');
  });
});
