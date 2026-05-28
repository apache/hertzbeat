// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { SettingDefineSurface } from './setting-define-surface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, readOnly, language, theme, loading, loadingLabel, onChange: _onChange, ...props }: any) => (
    <div
      data-hz-ui={props['data-hz-ui']}
      data-setting-define-editor-field={props['data-setting-define-editor-field']}
      data-setting-define-code-editor={props['data-setting-define-code-editor']}
      data-setting-define-editor-theme={props['data-setting-define-editor-theme']}
      data-setting-define-editor-theme-owner={props['data-setting-define-editor-theme-owner']}
      data-setting-define-editor-folding={props['data-setting-define-editor-folding']}
      data-setting-define-editor-automatic-layout={props['data-setting-define-editor-automatic-layout']}
      data-setting-define-editor-loading={props['data-setting-define-editor-loading']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-theme={theme}
      data-cold-code-editor-loading={loading ? 'true' : 'false'}
      data-cold-code-editor-loading-owner="cold-code-editor"
      data-cold-code-editor-folding="true"
      data-cold-code-editor-automatic-layout="true"
      data-cold-code-editor-readonly={readOnly || loading ? 'true' : undefined}
    >
      {value}
      {loading ? (
        <span
          data-cold-code-editor-loading-state="angular-nz-code-editor-loading"
          data-cold-code-editor-loading-state-owner="cold-code-editor"
        >
          {loadingLabel}
        </span>
      ) : null}
    </div>
  )
}));

describe('setting define monitor-template surface', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  const t = createTranslatorMock({
    locale: 'zh-CN',
    overrides: {
      'setting.define.title': '定义',
      'setting.define.subtitle': '管理监控模板 YAML，直接维护采集协议、参数和指标字段。',
      'setting.define.action.new': '新增类型',
      'common.button.edit': '编辑',
      'common.button.cancel': '取消',
      'setting.define.action.save-apply': '保存并应用',
      'setting.define.action.delete': '删除 {{app}}',
      'define.save-apply.confirm': '请确认是否保存修改并应用此监控类型定义? 这会影响到您的监控内容。',
      'define.save-apply.no-code': '监控类型定义内容不能为空。',
      'define.delete.confirm': '请确认是否删除 {{app}} 监控类型? 删除后无法添加此类监控。',
      'define.hide-true.confirm': '确认是否显示此菜单?',
      'define.hide-false.confirm': '确认是否隐藏此菜单?',
      'setting.define.action.hide': '隐藏',
      'setting.define.action.hide-aria': '隐藏模板 {{app}}',
      'setting.define.action.show': '显示',
      'setting.define.action.show-aria': '显示模板 {{app}}',
      'setting.define.save.pending': '正在应用定义...',
      'common.button.ok': '确定',
      'common.search': '搜索',
      'common.dark-mode': '深色模式',
      'setting.define.empty.title': '暂无模板',
      'setting.define.empty.copy': '请先新增监控模板 YAML。',
      'setting.define.empty.search-title': '没有匹配的模板',
      'setting.define.empty.search-copy': '调整搜索关键字后再试。',
      'setting.define.template.visible': '可见',
      'setting.define.template.hidden': '隐藏',
      'setting.define.new-template': '新增模板草稿',
      'setting.define.summary.yaml-lines': '{{count}} 行 YAML',
      'setting.define.summary.mode.edit': '编辑',
      'setting.define.summary.mode.new': '新增',
      'setting.define.diff.original': '原始 YAML',
      'setting.define.diff.current': '当前编辑 YAML'
    }
  });

  const data = {
    menuGroups: [
      {
        key: 'database',
        label: 'DATABASE',
        items: [
          { category: 'database', value: 'mysql', label: 'MySQL', hide: false },
          { category: 'database', value: 'postgresql', label: 'PostgreSQL', hide: true }
        ]
      }
    ],
    appLabels: { mysql: 'MySQL', postgresql: 'PostgreSQL' },
    selectedApp: 'mysql',
    yaml: 'app: mysql\ncategory: database',
    originalYaml: 'app: mysql\ncategory: database'
  };

  it('renders the old monitor-template YML workspace without alert preview or datasource panels', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search="mysql"
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database\nmetrics:\n  - uptime"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode
        isEditing
        message="保存成功"
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('data-setting-define-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-define-route-state="angular-current-app-url-retained"');
    expect(html).toContain('data-setting-define-theme-contract="angular-theme-service-initial"');
    expect(html).toContain('data-setting-define-theme-owner="angular-theme-service"');
    expect(html).toContain('data-setting-define-theme-mode="dark-ops"');
    expect(html).toContain('data-setting-define-theme-switch-contract="angular-nz-switch-code-editor-theme"');
    expect(html).toContain('data-setting-define-theme-switch-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-setting-define-theme-switch-state="vs-dark"');
    expect(html).toContain('data-setting-define-theme-toggle="angular-nz-switch"');
    expect(html).toContain('data-setting-define-theme-toggle-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-setting-define-theme-toggle-state="vs-dark"');
    expect(html).toContain('data-hz-ui="switch"');
    expect(html).toContain('data-hz-switch-owner="hertzbeat-ui-switch"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-setting-define-menu-filter-contract="angular-monitor-select-list-label-only"');
    expect(html).toContain('data-setting-define-menu-filter-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"');
    expect(html).toContain('data-setting-define-menu-filtered-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"');
    expect(html).toContain('data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-menu-loading="false"');
    expect(html).toContain('data-setting-define-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-setting-define-load-failure-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-load-failure="none"');
    expect(html).toContain('data-hz-template-loading="false"');
    expect(html).toContain('data-hz-template-loading-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"');
    expect(html).toContain('data-setting-define-new-draft-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-new-draft-state="existing-template"');
    expect(html).toContain('data-setting-define-new-action-contract="angular-current-app-reset-url-retained"');
    expect(html).toContain('data-setting-define-new-action-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-new-action-state="available"');
    expect(html).toContain('data-setting-define-menu-select-contract="angular-router-navigate-app-query"');
    expect(html).toContain('data-setting-define-menu-select-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-menu-select-query-contract="angular-replace-with-app-only"');
    expect(html).toContain('data-setting-define-menu-select-query-owner="setting-define-page-router"');
    expect(html).toContain('data-setting-define-confirm-closable-contract="angular-nz-closable-false"');
    expect(html).toContain('data-setting-define-confirm-ok-contract="angular-nz-ok-danger-primary"');
    expect(html).toContain('data-setting-define-delete-success-edit-state-contract="angular-preserve-is-editing"');
    expect(html).toContain('data-setting-define-save-visibility-contract="angular-code-diff-independent-of-editing"');
    expect(html).toContain('data-setting-define-save-reload-contract="angular-load-app-define-content-after-save"');
    expect(html).toContain('data-setting-define-save-reload-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-save-reload-scope="existing-template"');
    expect(html).toContain('data-setting-define-startup-reload-contract="angular-startup-load-after-success"');
    expect(html).toContain('data-setting-define-startup-reload-owner="startup-service"');
    expect(html).toContain('data-setting-define-startup-reload-scope="save-delete-visibility-success"');
    expect(html).toContain('data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"');
    expect(html).toContain('data-setting-define-startup-reload-failure-owner="startup-service"');
    expect(html).toContain('data-setting-define-template-visibility-loading-contract="angular-save-loading"');
    expect(html).toContain('data-setting-define-template-visibility-loading-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-template-visibility-loading="false"');
    expect(html).toContain('data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"');
    expect(html).toContain('data-setting-define-editor-option-owner="cold-code-editor"');
    expect(html).toContain('data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"');
    expect(html).toContain('data-setting-define-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('data-setting-define-editor-loading="false"');
    expect(html).toContain('data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"');
    expect(html).toContain('data-setting-define-header="cold-compact-header"');
    expect(html).toContain('data-setting-define-command-row="standard-equal-buttons"');
    expect(html).toContain('data-setting-define-workspace="cold-define-workspace"');
    expect(html).toContain('data-hz-ui="yaml-workspace"');
    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('data-hz-template-filter-contract="angular-monitor-select-list-label-only"');
    expect(html).toContain('data-hz-template-filter-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-hz-template-filter-match="label"');
    expect(html).toContain('data-hz-template-filter-state="matched-groups"');
    expect(html).toContain('data-hz-yaml-editor-runtime="external"');
    expect(html).toContain('data-setting-define-editor-shell="shared-yaml-workspace"');
    expect(html).toContain('data-setting-define-editor-field="cold-code-editor"');
    expect(html).toContain('data-setting-define-code-editor="monitor-template-yaml"');
    expect(html).toContain('data-hz-ui="yaml-editor"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="yaml"');
    expect(html).toContain('data-cold-code-editor-theme="vs-dark"');
    expect(html).toContain('data-cold-code-editor-loading="false"');
    expect(html).toContain('data-cold-code-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('data-cold-code-editor-folding="true"');
    expect(html).toContain('data-cold-code-editor-automatic-layout="true"');
    expect(html).toContain('data-setting-define-editor-theme="vs-dark"');
    expect(html).toContain('data-setting-define-editor-theme-owner="angular-nz-code-editor-theme"');
    expect(html).toContain('data-setting-define-editor-folding="true"');
    expect(html).toContain('data-setting-define-editor-automatic-layout="true"');
    expect(html).toContain('data-setting-define-editor-loading="false"');
    expect(html).toContain('data-hz-template-item="mysql"');
    expect(html).toContain('data-setting-define-template-visibility="mysql"');
    expect(html).toContain('data-setting-define-template-visibility-contract="angular-hide-true-or-undefined-contextual"');
    expect(html).toContain('data-setting-define-template-visibility-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-setting-define-template-visibility-label="MySQL"');
    expect(html).toContain('data-setting-define-template-visibility-action="hide"');
    expect(html).toContain('data-setting-define-template-visibility-next-hide="true"');
    expect(html).toContain('aria-label="隐藏模板 MySQL"');
    expect(html).toContain('title="隐藏模板 MySQL"');
    expect(html).toContain('data-setting-define-new-action="angular-current-app-reset"');
    expect(html).toContain('data-setting-define-new-action-contract="angular-current-app-reset-url-retained"');
    expect(html).toContain('data-setting-define-new-action-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-new-route-state="url-retained"');
    expect(html).toContain('data-setting-define-monitor-link="mysql"');
    expect(html).toContain('data-setting-define-monitor-link-contract="angular-routerlink-monitors-app"');
    expect(html).toContain('data-setting-define-monitor-link-owner="hertzbeat-ui-button-link"');
    expect(html).toContain('data-setting-define-monitor-link-app="mysql"');
    expect(html).toContain('data-hz-ui="button-link"');
    expect(html).toContain('href="/monitors?app=mysql"');
    expect(html).toContain('data-setting-define-delete-action="angular-current-app-id"');
    expect(html).toContain('data-setting-define-delete-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-setting-define-delete-action-label="mysql"');
    expect(html).toContain('aria-label="删除 mysql"');
    expect(html).toContain('title="删除 mysql"');
    expect(html).toContain('data-setting-define-save-confirm="closed"');
    expect(html).toContain('data-setting-define-save-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-setting-define-save-confirm-closable="false"');
    expect(html).toContain('data-setting-define-save-confirm-ok-danger="true"');
    expect(html).toContain('data-setting-define-save-confirm-ok-type="primary"');
    expect(html).toContain('data-setting-define-delete-confirm="closed"');
    expect(html).toContain('data-setting-define-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-setting-define-delete-confirm-closable="false"');
    expect(html).toContain('data-setting-define-delete-confirm-ok-danger="true"');
    expect(html).toContain('data-setting-define-delete-confirm-ok-type="primary"');
    expect(html).toContain('data-setting-define-template-visibility-confirm="closed"');
    expect(html).toContain('data-setting-define-template-visibility-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('定义');
    expect(html).toContain('管理监控模板 YAML');
    expect(html).toContain('新增类型');
    expect(html).toContain('app-mysql.yml');
    expect(html).toContain('MySQL');
    expect(html).toContain('DATABASE');
    expect(html).toContain('保存并应用');
    expect(html).toContain('删除 mysql');
    expect(html).toContain('深色模式');
    expect(html).not.toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('保存成功');
    expect(html).not.toContain('data-setting-define-preview-panel');
    expect(html).not.toContain('data-setting-define-datasource-panel');
    expect(html).not.toContain('预览查询');
    expect(html).not.toContain('数据源状态');
  });

  it('hides edit and save-apply while editing an existing template until YAML differs from the original', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-diff-shell="monitor-template-diff"');
    expect(html).toContain('取消');
    expect(html).toContain('删除 mysql');
    expect(html).not.toContain('lucide-pencil');
    expect(html).not.toContain('保存并应用');
  });

  it('keeps new-template drafts out of existing-template rollback actions', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp={null}
        editorValue="app: custom\ncategory: custom\nmetrics: []"
        originalYaml="app: custom\ncategory: custom"
        yamlLabel="app-custom.yml"
        darkMode={false}
        isEditing
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('新增模板草稿');
    expect(html).toContain('data-setting-define-code-editor="monitor-template-yaml"');
    expect(html).toContain('保存并应用');
    expect(html).toContain('data-setting-define-new-action-contract="angular-current-app-reset-url-retained"');
    expect(html).toContain('data-setting-define-new-action-state="hidden"');
    expect(html).not.toContain('data-setting-define-diff-shell="monitor-template-diff"');
    expect(html).not.toContain('data-setting-define-monitor-link=');
    expect(html).not.toContain('新增类型');
    expect(html).not.toContain('取消');
    expect(html).not.toContain('删除');
  });

  it('keeps the Angular save action visible for dirty code even when the editor is read-only', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp={null}
        editorValue="app: custom\n\n\n\n\n"
        originalYaml="app: custom"
        yamlLabel="app-custom.yml"
        darkMode={false}
        isEditing={false}
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-save-visibility-contract="angular-code-diff-independent-of-editing"');
    expect(html).toContain('data-cold-code-editor-readonly="true"');
    expect(html).toContain('data-setting-define-save-action="request"');
    expect(html).toContain('保存并应用');
    expect(html).not.toContain('data-setting-define-diff-shell="monitor-template-diff"');
  });

  it('shows the Angular editor loading state and hides save while template YAML is loading', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database\n# changed"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode
        isEditing
        menuLoading={false}
        editorLoading
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"');
    expect(html).toContain('data-setting-define-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('data-setting-define-editor-loading="true"');
    expect(html).toContain('data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"');
    expect(html).toContain('data-cold-code-editor-loading="true"');
    expect(html).toContain('data-cold-code-editor-loading-state="angular-nz-code-editor-loading"');
    expect(html).toContain('data-cold-code-editor-loading-state-owner="cold-code-editor"');
    expect(html).toContain('加载定义中心');
    expect(html).not.toContain('data-setting-define-save-action="request"');
    expect(html).not.toContain('保存并应用');
  });

  it('renders a cold empty state in the template list', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={{ menuGroups: [], appLabels: {}, selectedApp: null, yaml: 'app: custom', originalYaml: 'app: custom' }}
        search=""
        selectedApp={null}
        editorValue="app: custom"
        originalYaml="app: custom"
        yamlLabel="app-custom.yml"
        darkMode={false}
        isEditing={false}
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-empty-state="cold-list-empty"');
    expect(html).toContain('data-hz-ui="yaml-workspace"');
    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('暂无模板');
    expect(html).not.toContain('请先新增监控模板 YAML。');
  });

  it('keeps the Angular define shell mounted without showing backend load errors', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={{ menuGroups: [], appLabels: {}, selectedApp: null, yaml: 'app: custom\n\n\n\n\n', originalYaml: 'app: custom' }}
        search=""
        selectedApp={null}
        editorValue="app: custom\n\n\n\n\n"
        originalYaml="app: custom"
        yamlLabel="app-custom.yml"
        darkMode={false}
        isEditing={false}
        message={null}
        loadError="backend refused define load"
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('data-setting-define-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-setting-define-load-failure-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-hz-ui="yaml-workspace"');
    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).toContain('data-setting-define-code-editor="monitor-template-yaml"');
    expect(html).toContain('app-custom.yml');
    expect(html).toContain('app: custom');
    expect(html).not.toContain('backend refused define load');
    expect(html).not.toContain('data-observability-status');
  });

  it('keeps search misses out of the create-template empty call to action', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search="linux_script"
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing={false}
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-empty-state="cold-list-empty"');
    expect(html).toContain('data-hz-template-empty-state="angular-no-matched-children"');
    expect(html).toContain('没有匹配的模板');
    expect(html).toContain('data-hz-ui="template-picker"');
    expect(html).not.toContain('暂无模板');
    expect(html).not.toContain('请先新增监控模板 YAML。');
    expect(html).toContain('app-mysql.yml');
  });

  it('confirms template visibility changes before mutating the monitor-template menu config', async () => {
    const onToggleTemplateVisibility = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <SettingDefineSurface
          t={t}
          data={data}
          search=""
          selectedApp="mysql"
          editorValue="app: mysql\ncategory: database"
          originalYaml="app: mysql\ncategory: database"
          yamlLabel="app-mysql.yml"
          darkMode={false}
          isEditing={false}
          message={null}
          onSearchChange={() => {}}
          onSearch={() => {}}
          onSelectApp={() => {}}
          onNew={() => {}}
          onEdit={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
          onToggleTemplateVisibility={onToggleTemplateVisibility}
          onToggleDarkMode={() => {}}
          onEditorValueChange={() => {}}
        />
      );
      await Promise.resolve();
    });

    const showPostgresql = interactionContainer.querySelector(
      'button[data-setting-define-template-visibility="postgresql"]'
    ) as HTMLButtonElement | null;
    expect(showPostgresql).not.toBeNull();
    expect(showPostgresql?.getAttribute('aria-label')).toBe('显示模板 PostgreSQL');
    expect(showPostgresql?.getAttribute('title')).toBe('显示模板 PostgreSQL');
    expect(showPostgresql?.getAttribute('data-setting-define-template-visibility-owner')).toBe('hertzbeat-ui-button');
    expect(showPostgresql?.getAttribute('data-setting-define-template-visibility-label')).toBe('PostgreSQL');
    expect(showPostgresql?.getAttribute('data-setting-define-template-visibility-action')).toBe('show');
    expect(showPostgresql?.getAttribute('data-setting-define-template-visibility-contract')).toBe(
      'angular-hide-true-or-undefined-contextual'
    );
    expect(showPostgresql?.getAttribute('data-setting-define-template-visibility-next-hide')).toBe('false');

    await act(async () => {
      showPostgresql?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onToggleTemplateVisibility).not.toHaveBeenCalled();
    expect(
      interactionContainer.querySelector('[data-setting-define-template-visibility-confirm="open"][data-setting-define-template-visibility-app="postgresql"]')
    ).not.toBeNull();
    expect(
      interactionContainer.querySelector(
        '[data-setting-define-template-visibility-confirm-contract="angular-popconfirm-before-config-update"][data-setting-define-template-visibility-next-hide="false"]'
      )
    ).not.toBeNull();
    expect(
      interactionContainer.querySelector('[data-setting-define-template-visibility-confirm-dialog="angular-popconfirm"][data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"]')
    ).not.toBeNull();
    expect(interactionContainer.textContent).toContain('确认是否显示此菜单?');

    const confirmButtons = interactionContainer
      .querySelector('[data-setting-define-template-visibility-confirm="open"]')
      ?.querySelectorAll('button');
    const confirmButton = confirmButtons?.[confirmButtons.length - 1] as HTMLButtonElement | undefined;
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onToggleTemplateVisibility).toHaveBeenCalledWith('postgresql', false);
  });

  it('warns on empty YML before opening save confirmation or mutating the template', async () => {
    const onSave = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <SettingDefineSurface
          t={t}
          data={data}
          search=""
          selectedApp="mysql"
          editorValue=""
          originalYaml="app: mysql\ncategory: database"
          yamlLabel="app-mysql.yml"
          darkMode={false}
          isEditing
          message={null}
          onSearchChange={() => {}}
          onSearch={() => {}}
          onSelectApp={() => {}}
          onNew={() => {}}
          onEdit={() => {}}
          onCancel={() => {}}
          onSave={onSave}
          onDelete={() => {}}
          onToggleTemplateVisibility={() => {}}
          onToggleDarkMode={() => {}}
          onEditorValueChange={() => {}}
        />
      );
      await Promise.resolve();
    });

    const saveButton = interactionContainer.querySelector('[data-setting-define-save-action="request"]') as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-setting-define-save-confirm="open"]')).toBeNull();
    expect(interactionContainer.querySelector('[data-setting-define-save-confirm="closed"]')).not.toBeNull();
    expect(interactionContainer.textContent).toContain('监控类型定义内容不能为空。');
  });

  it('uses the Angular confirmation copy as save and delete modal titles', async () => {
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <SettingDefineSurface
          t={t}
          data={data}
          search=""
          selectedApp="mysql"
          editorValue="app: mysql\ncategory: database\nmetrics:\n  - uptime"
          originalYaml="app: mysql\ncategory: database"
          yamlLabel="app-mysql.yml"
          darkMode={false}
          isEditing
          message={null}
          onSearchChange={() => {}}
          onSearch={() => {}}
          onSelectApp={() => {}}
          onNew={() => {}}
          onEdit={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
          onToggleTemplateVisibility={() => {}}
          onToggleDarkMode={() => {}}
          onEditorValueChange={() => {}}
        />
      );
      await Promise.resolve();
    });

    const saveButton = interactionContainer.querySelector('[data-setting-define-save-action="request"]') as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const saveDialog = interactionContainer.querySelector(
      '[data-setting-define-save-confirm-dialog="angular-modal-confirm"][data-setting-define-confirm-title="angular-title-copy"]'
    );
    expect(saveDialog?.getAttribute('aria-label')).toBe('请确认是否保存修改并应用此监控类型定义? 这会影响到您的监控内容。');
    expect(saveDialog?.getAttribute('data-hz-confirm-closable')).toBe('false');
    expect(saveDialog?.getAttribute('data-hz-confirm-ok-danger')).toBe('true');
    expect(saveDialog?.getAttribute('data-hz-confirm-ok-type')).toBe('primary');
    expect(saveDialog?.getAttribute('data-setting-define-confirm-closable')).toBe('false');
    expect(saveDialog?.getAttribute('data-setting-define-confirm-ok-danger')).toBe('true');
    expect(saveDialog?.getAttribute('data-setting-define-confirm-ok-type')).toBe('primary');
    expect(saveDialog?.querySelector('[data-setting-define-save-confirm-submit="angular-modal-confirm"]')?.getAttribute('data-setting-define-save-confirm-submit-danger')).toBe('true');
    expect(saveDialog?.querySelector('[data-setting-define-save-confirm-submit="angular-modal-confirm"]')?.getAttribute('data-setting-define-save-confirm-submit-type')).toBe('primary');
    expect(saveDialog?.textContent).toContain('请确认是否保存修改并应用此监控类型定义? 这会影响到您的监控内容。');

    await act(async () => {
      saveDialog?.querySelector('[data-hz-confirm-action="cancel"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const deleteButton = Array.from(interactionContainer.querySelectorAll('button')).find(button =>
      button.textContent?.includes('删除 mysql')
    ) as HTMLButtonElement | undefined;
    expect(deleteButton).toBeDefined();

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const deleteDialog = interactionContainer.querySelector(
      '[data-setting-define-delete-confirm-dialog="angular-modal-confirm"][data-setting-define-confirm-title="angular-title-copy"]'
    );
    expect(deleteDialog?.getAttribute('aria-label')).toBe('请确认是否删除 MySQL 监控类型? 删除后无法添加此类监控。');
    expect(deleteDialog?.getAttribute('data-hz-confirm-closable')).toBe('false');
    expect(deleteDialog?.getAttribute('data-hz-confirm-ok-danger')).toBe('true');
    expect(deleteDialog?.getAttribute('data-hz-confirm-ok-type')).toBe('primary');
    expect(deleteDialog?.getAttribute('data-setting-define-confirm-closable')).toBe('false');
    expect(deleteDialog?.getAttribute('data-setting-define-confirm-ok-danger')).toBe('true');
    expect(deleteDialog?.getAttribute('data-setting-define-confirm-ok-type')).toBe('primary');
    expect(deleteDialog?.querySelector('[data-setting-define-delete-confirm-submit="angular-modal-confirm"]')?.getAttribute('data-setting-define-delete-confirm-submit-danger')).toBe('true');
    expect(deleteDialog?.querySelector('[data-setting-define-delete-confirm-submit="angular-modal-confirm"]')?.getAttribute('data-setting-define-delete-confirm-submit-type')).toBe('primary');
    expect(deleteDialog?.textContent).toContain('请确认是否删除 MySQL 监控类型? 删除后无法添加此类监控。');
  });

  it('keeps the save action in the old Angular loading state while applying YML', () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database\nmetrics:\n  - uptime"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing
        savePending
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-save-pending="true"');
    expect(html).toContain('data-setting-define-save-loading-owner="angular-nz-loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-setting-define-save-pending-feedback="angular-save-loading"');
    expect(html).toContain('data-setting-define-save-pending-feedback-owner="hertzbeat-ui-workspace-feedback"');
    expect(html).toContain('正在应用定义...');
  });

  it('keeps mutation failure feedback as Angular fixed title plus backend detail metadata', () => {
    const saveHtml = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database\nmetrics:\n  - uptime"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing
        message="应用失败"
        messageMeta="schema invalid"
        messageContract="angular-apply-fail-notification"
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(saveHtml).toContain('data-setting-define-action-feedback="angular-apply-fail-notification"');
    expect(saveHtml).toContain('data-setting-define-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(saveHtml).toContain('data-setting-define-action-feedback-title="common.notify.apply-fail"');
    expect(saveHtml).toContain('data-setting-define-action-feedback-detail="backend-message"');
    expect(saveHtml).toContain('data-setting-define-save-feedback="angular-apply-fail-notification"');
    expect(saveHtml).toContain('data-setting-define-save-feedback-title="common.notify.apply-fail"');
    expect(saveHtml).toContain('data-setting-define-save-feedback-detail="backend-message"');
    expect(saveHtml).toContain('data-setting-define-visibility-feedback="angular-apply-fail-notification"');
    expect(saveHtml).toContain('data-setting-define-visibility-feedback-title="common.notify.apply-fail"');
    expect(saveHtml).toContain('data-setting-define-visibility-feedback-detail="backend-message"');
    expect(saveHtml).toContain('应用失败');
    expect(saveHtml).toContain('schema invalid');

    const deleteHtml = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing={false}
        message="删除失败"
        messageMeta="template is still in use"
        messageContract="angular-delete-fail-notification"
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(deleteHtml).toContain('data-setting-define-action-feedback="angular-delete-fail-notification"');
    expect(deleteHtml).toContain('data-setting-define-action-feedback-title="common.notify.delete-fail"');
    expect(deleteHtml).toContain('data-setting-define-action-feedback-detail="backend-message"');
    expect(deleteHtml).toContain('data-setting-define-delete-feedback="angular-delete-fail-notification"');
    expect(deleteHtml).toContain('data-setting-define-delete-feedback-title="common.notify.delete-fail"');
    expect(deleteHtml).toContain('data-setting-define-delete-feedback-detail="backend-message"');
    expect(deleteHtml).toContain('删除失败');
    expect(deleteHtml).toContain('template is still in use');
  });

  it('passes the Angular monitor-select-list loading state into the shared template picker', () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql"
        originalYaml="app: mysql"
        yamlLabel="app-mysql.yml"
        darkMode
        isEditing={false}
        menuLoading
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"');
    expect(html).toContain('data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-menu-loading="true"');
    expect(html).toContain('data-setting-define-load-failure="none"');
    expect(html).toContain('data-hz-template-loading="true"');
    expect(html).toContain('data-hz-template-loading-state="angular-monitor-select-list-loading"');
    expect(html).toContain('data-hz-template-loading-state-owner="hertzbeat-ui-template-picker"');
  });

  it('shows the old Angular diff context when editing an existing monitor-template YML', async () => {
    const html = renderToStaticMarkup(
      <SettingDefineSurface
        t={t}
        data={data}
        search=""
        selectedApp="mysql"
        editorValue="app: mysql\ncategory: database\nmetrics:\n  - cpu"
        originalYaml="app: mysql\ncategory: database"
        yamlLabel="app-mysql.yml"
        darkMode={false}
        isEditing
        message={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSelectApp={() => {}}
        onNew={() => {}}
        onEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
        onToggleTemplateVisibility={() => {}}
        onToggleDarkMode={() => {}}
        onEditorValueChange={() => {}}
      />
    );

    expect(html).toContain('data-setting-define-diff-shell="monitor-template-diff"');
    expect(html).toContain('data-setting-define-diff-original="true"');
    expect(html).toContain('data-setting-define-diff-current="true"');
    expect(html).toContain('data-setting-define-code-editor="monitor-template-yaml-original"');
    expect(html).toContain('data-setting-define-code-editor="monitor-template-yaml"');
    expect(html).toContain('原始 YAML');
    expect(html).toContain('当前编辑 YAML');
    expect(html).toContain('保存并应用');
    expect(html).toContain('app: mysql');
    expect(html).toContain('category: database');
    expect(html).toContain('metrics:');
    expect(html).toContain('data-cold-code-editor-readonly="true"');
  });

  it('uses the shared cold visual owner and avoids alert-rule preview dependencies', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/setting-define-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzYamlWorkspace');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzTemplateCategory');
    expect(source).toContain("from '../ui/cold-code-editor'");
    expect(source).not.toContain("from '../ui/cold-confirm-dialog'");
    expect(source).toContain('originalYaml');
    expect(source).toContain('data-setting-define-diff-shell="monitor-template-diff"');
    expect(source).toContain('data-setting-define-code-editor="monitor-template-yaml"');
    expect(source).toContain('data-setting-define-code-editor="monitor-template-yaml-original"');
    expect(source).toContain('data-setting-define-editor-shell="shared-yaml-workspace"');
    expect(source).toContain('data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"');
    expect(source).toContain('data-setting-define-menu-filtered-owner="setting-define-controller"');
    expect(source).toContain('data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"');
    expect(source).toContain('data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"');
    expect(source).toContain("data-setting-define-menu-loading={menuLoading ? 'true' : 'false'}");
    expect(source).toContain('data-setting-define-load-failure-contract="angular-console-only-shell"');
    expect(source).toContain('data-setting-define-load-failure-owner="setting-define-controller"');
    expect(source).toContain("data-setting-define-load-failure={loadError ? 'angular-console-only-shell' : 'none'}");
    expect(source).toContain('templatePickerLoading={menuLoading}');
    expect(source).toContain('data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"');
    expect(source).toContain('data-setting-define-new-draft-owner="setting-define-controller"');
    expect(source).toContain("data-setting-define-new-draft-state={hasSelectedApp ? 'existing-template' : 'new-template'}");
    expect(source).toContain('data-setting-define-monitor-link-contract="angular-routerlink-monitors-app"');
    expect(source).toContain('data-setting-define-monitor-link-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-setting-define-template-visibility=');
    expect(source).toContain('data-setting-define-template-visibility-contract="angular-hide-true-or-undefined-contextual"');
    expect(source).toContain('data-setting-define-template-visibility-next-hide={String(!row.hidden)}');
    expect(source).toContain('data-setting-define-confirm-closable-contract="angular-nz-closable-false"');
    expect(source).toContain('data-setting-define-confirm-ok-contract="angular-nz-ok-danger-primary"');
    expect(source).toContain('data-setting-define-delete-success-edit-state-contract="angular-preserve-is-editing"');
    expect(source).toContain('data-setting-define-save-visibility-contract="angular-code-diff-independent-of-editing"');
    expect(source).toContain('data-setting-define-startup-reload-contract="angular-startup-load-after-success"');
    expect(source).toContain('data-setting-define-startup-reload-owner="startup-service"');
    expect(source).toContain('data-setting-define-startup-reload-scope="save-delete-visibility-success"');
    expect(source).toContain('data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"');
    expect(source).toContain('data-setting-define-startup-reload-failure-owner="startup-service"');
    expect(source).toContain('data-setting-define-template-visibility-loading-contract="angular-save-loading"');
    expect(source).toContain('data-setting-define-template-visibility-loading-owner="setting-define-controller"');
    expect(source).toContain("data-setting-define-template-visibility-loading={savePending ? 'true' : 'false'}");
    expect(source).toContain('messageMeta?: string | null');
    expect(source).toContain('messageContract?: string | null');
    expect(source).toContain("messageContract === 'angular-apply-fail-notification'");
    expect(source).toContain("messageContract === 'angular-delete-fail-notification'");
    expect(source).toContain('data-setting-define-action-feedback-owner={messageContract ?');
    expect(source).toContain('data-setting-define-action-feedback-title={messageContract ?');
    expect(source).toContain("data-setting-define-action-feedback-detail={messageContract && messageMeta ? 'backend-message' : undefined}");
    expect(source).toContain("data-setting-define-save-feedback={applyFailure ? 'angular-apply-fail-notification' : undefined}");
    expect(source).toContain("data-setting-define-delete-feedback={deleteFailure ? 'angular-delete-fail-notification' : undefined}");
    expect(source).toContain("data-setting-define-visibility-feedback={applyFailure ? 'angular-apply-fail-notification' : undefined}");
    expect(source).toContain('data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"');
    expect(source).toContain('data-setting-define-editor-option-owner="cold-code-editor"');
    expect(source).toContain('data-setting-define-editor-folding="true"');
    expect(source).toContain('data-setting-define-editor-automatic-layout="true"');
    expect(source).toContain('data-setting-define-save-confirm');
    expect(source).toContain('data-setting-define-save-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-setting-define-save-confirm-closable="false"');
    expect(source).toContain('data-setting-define-save-confirm-ok-danger="true"');
    expect(source).toContain('data-setting-define-save-confirm-ok-type="primary"');
    expect(source).toContain('data-setting-define-save-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain('data-setting-define-delete-confirm');
    expect(source).toContain('data-setting-define-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-setting-define-delete-confirm-closable="false"');
    expect(source).toContain('data-setting-define-delete-confirm-ok-danger="true"');
    expect(source).toContain('data-setting-define-delete-confirm-ok-type="primary"');
    expect(source).toContain('data-setting-define-delete-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain('data-setting-define-confirm-title="angular-title-copy"');
    expect(source).toContain('data-setting-define-template-visibility-confirm');
    expect(source).toContain('data-setting-define-template-visibility-confirm-contract="angular-popconfirm-before-config-update"');
    expect(source).toContain('data-setting-define-template-visibility-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-setting-define-template-visibility-confirm-dialog="angular-popconfirm"');
    expect(source).toContain('data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('setSaveConfirmOpen(true)');
    expect(source).toContain('setDeleteConfirmOpen(true)');
    expect(source).toContain('setVisibilityConfirm(');
    expect(source).toContain("t('define.save-apply.confirm')");
    expect(source).toContain("t('define.save-apply.no-code')");
    expect(source).toContain("t('define.delete.confirm'");
    expect(source).toContain("t('define.hide-true.confirm')");
    expect(source).toContain("t('define.hide-false.confirm')");
    expect(source).not.toContain('buildPreviewRows');
    expect(source).not.toContain('selectedDefine');
    expect(source).not.toContain('datasourceStatus');
    expect(source).not.toContain('data-setting-define-preview-panel');
    expect(source).not.toContain('data-setting-define-datasource-panel');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('text-white');
  });
});
