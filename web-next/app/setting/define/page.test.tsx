// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  lastSurfaceProps: null as null | Record<string, any>,
  renderErrorMessage: null as string | null,
  renderData: {
    menuGroups: [
      {
        key: 'database',
        label: 'DATABASE',
        items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
      }
    ],
    appLabels: { mysql: 'MySQL' },
    selectedApp: 'mysql',
    yaml: 'app: mysql\ncategory: database',
    originalYaml: 'app: mysql\ncategory: database'
  },
  defaultRenderData: {
    menuGroups: [
      {
        key: 'database',
        label: 'DATABASE',
        items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
      }
    ],
    appLabels: { mysql: 'MySQL' },
    selectedApp: 'mysql',
    yaml: 'app: mysql\ncategory: database',
    originalYaml: 'app: mysql\ncategory: database'
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());
const apiMessageDelete = vi.hoisted(() => vi.fn());
const loadDefineCenterData = vi.hoisted(() => vi.fn());
const saveTemplateDefine = vi.hoisted(() => vi.fn());
const deleteTemplateDefine = vi.hoisted(() => vi.fn());
const updateTemplateVisibility = vi.hoisted(() => vi.fn());
const reloadTemplateDefinitionStartupContext = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'zh-CN',
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    renderError
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
    renderError?: (message: string, retry: () => void) => React.ReactNode;
  }) => {
    mockState.lastLoad = load;
    if (mockState.renderErrorMessage && renderError) {
      return <div data-client-workbench="true">{renderError(mockState.renderErrorMessage, vi.fn())}</div>;
    }
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/setting-define-surface', () => ({
  SettingDefineSurface: (props: any) => {
    mockState.lastSurfaceProps = props;
    const {
      selectedApp,
      yamlLabel,
      editorValue,
      originalYaml,
      darkMode,
      isEditing,
      menuLoading,
      editorLoading,
      loadError,
      message,
      messageMeta,
      messageContract,
      onNew,
      onSave,
      onDelete,
      onToggleTemplateVisibility
    } = props;
    return (
      <div
        data-setting-define-surface="otlp-cold-define-console"
        data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"
        data-setting-define-menu-filtered-owner="setting-define-controller"
        data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"
        data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"
        data-setting-define-menu-loading={menuLoading ? 'true' : 'false'}
        data-setting-define-load-failure-contract="angular-console-only-shell"
        data-setting-define-load-failure-owner="setting-define-controller"
        data-setting-define-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
        data-setting-define-theme-switch-contract="angular-nz-switch-code-editor-theme"
        data-setting-define-theme-switch-owner="hertzbeat-ui-switch"
        data-setting-define-theme-switch-state={darkMode ? 'vs-dark' : 'vs'}
        data-setting-define-save-reload-contract="angular-load-app-define-content-after-save"
        data-setting-define-save-reload-owner="setting-define-controller"
        data-setting-define-save-reload-scope={selectedApp ? 'existing-template' : 'new-template-draft'}
        data-setting-define-startup-reload-contract="angular-startup-load-after-success"
        data-setting-define-startup-reload-owner="startup-service"
        data-setting-define-startup-reload-scope="save-delete-visibility-success"
        data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"
        data-setting-define-startup-reload-failure-owner="startup-service"
        data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"
        data-setting-define-editor-option-owner="cold-code-editor"
        data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"
        data-setting-define-editor-loading-owner="cold-code-editor"
        data-setting-define-editor-loading={editorLoading ? 'true' : 'false'}
        data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"
        data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"
        data-setting-define-new-draft-owner="setting-define-controller"
        data-setting-define-new-draft-state={selectedApp ? 'existing-template' : 'new-template'}
        data-setting-define-new-action-contract="angular-current-app-reset-url-retained"
        data-setting-define-new-action-owner="setting-define-controller"
        data-setting-define-new-action-state={selectedApp ? 'available' : 'hidden'}
        data-setting-define-menu-select-query-contract="angular-replace-with-app-only"
        data-setting-define-menu-select-query-owner="setting-define-page-router"
      >
        <span>定义</span>
        <span>{selectedApp}</span>
        <span>{yamlLabel}</span>
        <span>{editorValue}</span>
        <span data-setting-define-original-yaml="true">{originalYaml}</span>
        <span>{String(darkMode)}</span>
        <span>{String(isEditing)}</span>
        <span data-setting-define-load-error={loadError ? 'present' : 'none'} />
        <span data-setting-define-test-save-pending="true">{String(props.savePending)}</span>
        <span
          data-setting-define-test-message={message || ''}
          data-setting-define-test-message-meta={messageMeta || ''}
          data-setting-define-test-message-contract={messageContract || ''}
        />
        <button data-setting-define-test-new="true" onClick={onNew}>new</button>
        <button data-setting-define-test-save="true" onClick={onSave}>save</button>
        <button data-setting-define-test-delete="true" onClick={onDelete}>delete</button>
        <button data-setting-define-test-visibility="true" onClick={() => onToggleTemplateVisibility('mysql', true)}>visibility</button>
      </div>
    );
  }
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  apiMessageDelete
}));

vi.mock('@/lib/setting-define/controller', () => ({
  loadDefineCenterData,
  buildNewTemplateYaml: () => 'app: custom',
  buildNewTemplateDraft: () => ({ yaml: 'app: custom\n\n\n\n\n', originalYaml: 'app: custom' }),
  saveTemplateDefine,
  deleteTemplateDefine,
  updateTemplateVisibility,
  reloadTemplateDefinitionStartupContext
}));

describe('setting define page', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/setting/define');
    window.localStorage.clear();
    document.body.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme');
    mockState.lastLoad = null;
    mockState.lastSurfaceProps = null;
    mockState.renderErrorMessage = null;
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database',
      originalYaml: 'app: mysql\ncategory: database'
    };
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    apiMessageDelete.mockReset();
    loadDefineCenterData.mockReset().mockResolvedValue(mockState.renderData);
    saveTemplateDefine.mockReset().mockResolvedValue(undefined);
    deleteTemplateDefine.mockReset().mockResolvedValue(undefined);
    updateTemplateVisibility.mockReset().mockResolvedValue(undefined);
    reloadTemplateDefinitionStartupContext.mockReset().mockResolvedValue(undefined);
  });

  it('renders the monitor-template YML surface and loads through old app define APIs', async () => {
    const { default: SettingDefinePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingDefinePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"');
    expect(html).toContain('data-setting-define-menu-filtered-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"');
    expect(html).toContain('data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"');
    expect(html).toContain('data-setting-define-menu-loading="false"');
    expect(html).toContain('data-setting-define-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-setting-define-load-failure-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-load-failure="none"');
    expect(html).toContain('data-setting-define-theme-switch-contract="angular-nz-switch-code-editor-theme"');
    expect(html).toContain('data-setting-define-theme-switch-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-setting-define-theme-switch-state="vs-dark"');
    expect(html).toContain('data-setting-define-save-reload-contract="angular-load-app-define-content-after-save"');
    expect(html).toContain('data-setting-define-save-reload-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-save-reload-scope="new-template-draft"');
    expect(html).toContain('data-setting-define-startup-reload-contract="angular-startup-load-after-success"');
    expect(html).toContain('data-setting-define-startup-reload-owner="startup-service"');
    expect(html).toContain('data-setting-define-startup-reload-scope="save-delete-visibility-success"');
    expect(html).toContain('data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"');
    expect(html).toContain('data-setting-define-startup-reload-failure-owner="startup-service"');
    expect(html).toContain('data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"');
    expect(html).toContain('data-setting-define-editor-option-owner="cold-code-editor"');
    expect(html).toContain('data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"');
    expect(html).toContain('data-setting-define-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('data-setting-define-editor-loading="false"');
    expect(html).toContain('data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"');
    expect(html).toContain('data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"');
    expect(html).toContain('data-setting-define-new-draft-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-new-draft-state="new-template"');
    expect(html).toContain('data-setting-define-new-action-contract="angular-current-app-reset-url-retained"');
    expect(html).toContain('data-setting-define-new-action-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-new-action-state="hidden"');
    expect(html).toContain('data-setting-define-menu-select-query-contract="angular-replace-with-app-only"');
    expect(html).toContain('data-setting-define-menu-select-query-owner="setting-define-page-router"');
    expect(html).toContain('mysql');
    expect(html).toContain('app-mysql.yml');
    expect(html).toContain('app: mysql');
    expect(html).toContain('data-setting-define-original-yaml="true"');
    expect(html).toContain('true');

    await mockState.lastLoad?.();

    expect(loadDefineCenterData).toHaveBeenCalledWith(apiMessageGet, null, 'zh-CN');
  });

  it('keeps the Angular setting define shell visible when menu or YML loading fails', async () => {
    mockState.renderErrorMessage = 'backend refused define load';
    const { default: SettingDefinePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingDefinePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-setting-define-surface="otlp-cold-define-console"');
    expect(html).toContain('data-setting-define-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-setting-define-load-failure-owner="setting-define-controller"');
    expect(html).toContain('data-setting-define-load-failure="angular-console-only-shell"');
    expect(html).toContain('app-custom.yml');
    expect(html).toContain('app: custom');
    expect(html).not.toContain('backend refused define load');
    expect(html).not.toContain('common.load-failed');
    expect(html).not.toContain('data-observability-status');
    expect(mockState.lastSurfaceProps?.data.menuGroups).toEqual([]);
    expect(mockState.lastSurfaceProps?.loadError).toBe('backend refused define load');
  });

  it('initializes the YML editor dark toggle from the Angular theme service contract', async () => {
    const { default: SettingDefinePage } = await import('./page');

    window.localStorage.setItem('theme', 'light-ops');
    renderToStaticMarkup(<SettingDefinePage />);
    expect(mockState.lastSurfaceProps?.darkMode).toBe(false);

    document.body.setAttribute('data-theme', 'dark-ops');
    renderToStaticMarkup(<SettingDefinePage />);
    expect(mockState.lastSurfaceProps?.darkMode).toBe(true);
  });

  it('keeps setting define remounts keyed by selected app and reload version', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/define/setting-define-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_DEFINE_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('loadDefineCenterData(apiMessageGet, selectedApp ?? null, locale)');
    expect(source).toContain('buildNewTemplateDraft');
    expect(source).toContain('buildFallbackDefineData');
    expect(source).toContain('renderError={(message) => renderDefineSurface(buildFallbackDefineData(), message)}');
    expect(source).toContain('loadError={loadError}');
    expect(source).toContain('menuLoading={false}');
    expect(source).toContain('editorLoading={false}');
    expect(source).toContain('reloadTemplateDefinitionStartupContext');
    expect(source).toContain("if (typeof window === 'undefined') return undefined;");
    expect(source).toContain('useState<string | null | undefined>(() => readInitialSelectedApp())');
    expect(source).toContain('writeSelectedAppToUrl(app)');
    expect(source).toContain("const nextSearch = app ? `?app=${encodeURIComponent(app)}` : '';");
    expect(source).toContain("window.history.pushState({}, '', `${url.pathname}${nextSearch}`);");
    expect(source).not.toContain("url.searchParams.set('app', app)");
    expect(source).toContain('setEditorValue(null)');
    expect(source).toContain('setOriginalYaml(null)');
    expect(source).toContain('resolveDefineWorkbenchTheme');
    expect(source).toContain("window.localStorage.getItem('theme')");
    expect(source).toContain("document.body?.getAttribute('data-theme')");
    expect(source).toContain("document.documentElement?.getAttribute('data-theme')");
    expect(source).toContain("const [darkMode, setDarkMode] = useState(() => readInitialDefineDarkMode());");
    expect(source).toContain("['setting-define-yml', selectedApp || 'new', reloadVersion].join(':')");
    expect(source).toContain('[selectedApp, reloadVersion]');
    expect(source).toContain('[selectedApp, locale]');
    expect(source).toContain('cacheKey={settingDefineCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_DEFINE_SETTLED_CACHE_TTL_MS}');
    expect(source).toContain('const activeApp = selectedApp === undefined ? data.selectedApp : selectedApp;');
    expect(source).not.toContain('const activeApp = selectedApp ?? data.selectedApp;');
    expect(source).toContain('originalYaml={resolvedOriginalYaml}');
    expect(source).not.toContain('const [darkMode, setDarkMode] = useState(false);');
    expect(source).toContain('const [savePending, setSavePending] = useState(false);');
    expect(source).toContain('const [messageMeta, setMessageMeta] = useState<string | null>(null);');
    expect(source).toContain('const [messageContract, setMessageContract] = useState<string | null>(null);');
    expect(source).toContain('function readMutationFailureDetail(error: unknown, fallback = \'\')');
    expect(source).toContain('savePending={savePending}');
    expect(source).toContain('messageMeta={messageMeta}');
    expect(source).toContain('messageContract={messageContract}');
    expect(source).toContain('setEditorValue(draft.yaml)');
    expect(source).toContain('setOriginalYaml(draft.originalYaml)');
    expect(source).not.toContain('writeSelectedAppToUrl(null);');
    expect(source).toContain('currentYaml === currentOriginalYaml');
    expect(source).toContain("currentYaml === ''");
    expect(source).toContain("t('define.save-apply.no-code')");
    expect(source).toContain("await saveTemplateDefine(apiMessagePost, apiMessagePut, currentYaml, !currentApp);");
    expect(source).toContain("setMessage(t('common.notify.apply-success'));");
    expect(source).toContain("setMessage(t('common.notify.apply-fail'));");
    expect(source).toContain("setMessageMeta(readMutationFailureDetail(error, t('setting.define.save.failed')));");
    expect(source).toContain("setMessageContract('angular-apply-fail-notification');");
    expect(source).toContain("setMessage(t('common.notify.delete-fail'));");
    expect(source).toContain('setMessageMeta(readMutationFailureDetail(error));');
    expect(source).toContain("setMessageContract('angular-delete-fail-notification');");
    expect(source).not.toContain('buildMutationFailureMessage(');
    expect(source).toContain('setEditorValue(null);');
    expect(source).toContain('setOriginalYaml(null);');
    expect(source).toContain('refreshStartupContextAfterMutation();');
    expect(source).toContain('void reloadTemplateDefinitionStartupContext(apiMessageGet, locale).catch(() => undefined);');
    expect(source).not.toContain("setMessage(t('setting.define.save.success'))");
  });

  it('re-reads existing app YML from workbench data after a successful save like Angular loadAppDefineContent', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database\n# backend canonical',
      originalYaml: 'app: mysql\ncategory: database\n# backend canonical'
    };
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: mysql\ncategory: database\n# backend canonical');

    await act(async () => {
      mockState.lastSurfaceProps?.onEditorValueChange('app: mysql\ncategory: database\n# local edit before save');
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: mysql\ncategory: database\n# local edit before save');
    expect(mockState.lastSurfaceProps?.isEditing).toBe(true);

    await act(async () => {
      mockState.lastSurfaceProps?.onSave();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveTemplateDefine).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      'app: mysql\ncategory: database\n# local edit before save',
      false
    );
    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: mysql\ncategory: database\n# backend canonical');
    expect(mockState.lastSurfaceProps?.originalYaml).toBe('app: mysql\ncategory: database\n# backend canonical');
    expect(mockState.lastSurfaceProps?.isEditing).toBe(false);
    expect(reloadTemplateDefinitionStartupContext).toHaveBeenCalledWith(apiMessageGet, 'zh-CN');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('refreshes startup config context after successful YML mutations', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database\n# changed',
      originalYaml: 'app: mysql\ncategory: database'
    };
    const { default: SettingDefinePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingDefinePage />);
    expect(html).toContain('data-setting-define-test-save="true"');

    mockState.lastSurfaceProps?.onSave();
    await Promise.resolve();
    await Promise.resolve();

    expect(saveTemplateDefine).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      'app: mysql\ncategory: database\n# changed',
      false
    );
    expect(reloadTemplateDefinitionStartupContext).toHaveBeenCalledWith(apiMessageGet, 'zh-CN');

    mockState.lastSurfaceProps?.onDelete();
    await Promise.resolve();
    await Promise.resolve();

    expect(deleteTemplateDefine).toHaveBeenCalledWith(apiMessageDelete, 'mysql');
    expect(reloadTemplateDefinitionStartupContext).toHaveBeenCalledTimes(2);

    mockState.lastSurfaceProps?.onToggleTemplateVisibility('mysql', true);
    await Promise.resolve();
    await Promise.resolve();

    expect(updateTemplateVisibility).toHaveBeenCalledWith(apiMessagePut, 'mysql', true);
    expect(reloadTemplateDefinitionStartupContext).toHaveBeenCalledTimes(3);
  });

  it('keeps mutation success when the Angular startup refresh side effect fails', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database\n# changed',
      originalYaml: 'app: mysql\ncategory: database'
    };
    reloadTemplateDefinitionStartupContext.mockRejectedValueOnce(new Error('startup refresh down'));
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSave();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveTemplateDefine).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      'app: mysql\ncategory: database\n# changed',
      false
    );
    expect(reloadTemplateDefinitionStartupContext).toHaveBeenCalledWith(apiMessageGet, 'zh-CN');
    expect(mockState.lastSurfaceProps?.message).toContain('应用成功');
    expect(mockState.lastSurfaceProps?.message).not.toContain('startup refresh down');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('keeps the Angular URL app parameter when starting a new draft or after delete success', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql&returnTo=%2Fsettings');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database',
      originalYaml: 'app: mysql\ncategory: database'
    };
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    expect(window.location.search).toContain('app=mysql');
    expect(window.location.search).toContain('returnTo=%2Fsettings');

    await act(async () => {
      mockState.lastSurfaceProps?.onNew();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.selectedApp).toBeNull();
    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: custom\n\n\n\n\n');
    expect(window.location.search).toContain('app=mysql');
    expect(window.location.search).toContain('returnTo=%2Fsettings');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();

    window.history.pushState({}, '', '/setting/define?app=mysql&returnTo=%2Fsettings');
    const deleteContainer = document.createElement('div');
    document.body.appendChild(deleteContainer);
    const deleteRoot = createRoot(deleteContainer);

    await act(async () => {
      deleteRoot.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDelete();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deleteTemplateDefine).toHaveBeenCalledWith(apiMessageDelete, 'mysql');
    expect(mockState.lastSurfaceProps?.selectedApp).toBeNull();
    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: custom\n\n\n\n\n');
    expect(mockState.lastSurfaceProps?.originalYaml).toBe('app: custom');
    expect(mockState.lastSurfaceProps?.isEditing).toBe(false);
    expect(window.location.search).toContain('app=mysql');
    expect(window.location.search).toContain('returnTo=%2Fsettings');

    await act(async () => {
      deleteRoot.unmount();
      await Promise.resolve();
    });
    deleteContainer.remove();
  });

  it('navigates selected menu templates through the Angular app query contract', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql&returnTo=%2Fsettings');
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.selectedApp).toBe('mysql');

    await act(async () => {
      mockState.lastSurfaceProps?.onSelectApp('linux');
      await Promise.resolve();
    });

    expect(window.location.search).toContain('app=linux');
    expect(window.location.search).toBe('?app=linux');
    expect(window.location.search).not.toContain('returnTo=%2Fsettings');
    expect(mockState.lastSurfaceProps?.selectedApp).toBe('linux');
    expect(mockState.lastSurfaceProps?.isEditing).toBe(false);

    await mockState.lastLoad?.();
    expect(loadDefineCenterData).toHaveBeenLastCalledWith(apiMessageGet, 'linux', 'zh-CN');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('keeps the surface save action busy while save/apply or visibility updates are pending', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database\n# changed',
      originalYaml: 'app: mysql\ncategory: database'
    };
    let resolveSave: (() => void) | undefined;
    saveTemplateDefine.mockImplementationOnce(() => new Promise<void>(resolve => {
      resolveSave = resolve;
    }));
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.savePending).toBe(false);

    await act(async () => {
      mockState.lastSurfaceProps?.onSave();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.savePending).toBe(true);

    await act(async () => {
      resolveSave?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.savePending).toBe(false);

    let resolveVisibility: (() => void) | undefined;
    updateTemplateVisibility.mockImplementationOnce(() => new Promise<void>(resolve => {
      resolveVisibility = resolve;
    }));

    await act(async () => {
      mockState.lastSurfaceProps?.onToggleTemplateVisibility('mysql', true);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.savePending).toBe(true);

    await act(async () => {
      resolveVisibility?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.savePending).toBe(false);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('preserves the old Angular edit flag when saving a direct new-template YML draft', async () => {
    const draftYaml = 'app: custom\ncategory: custom\n# still drafting';
    const draftOriginalYaml = '# 请在此通过编写YML内容来定义新的监控类型';
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: null,
      yaml: draftYaml,
      originalYaml: draftOriginalYaml
    };
    window.history.pushState({}, '', '/setting/define');
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.selectedApp).toBeNull();
    expect(mockState.lastSurfaceProps?.isEditing).toBe(false);

    await act(async () => {
      mockState.lastSurfaceProps?.onSave();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveTemplateDefine).toHaveBeenCalledWith(apiMessagePost, apiMessagePut, draftYaml, true);
    expect(mockState.lastSurfaceProps?.selectedApp).toBeNull();
    expect(mockState.lastSurfaceProps?.editorValue).toBe(draftYaml);
    expect(mockState.lastSurfaceProps?.originalYaml).toBe(draftOriginalYaml);
    expect(mockState.lastSurfaceProps?.isEditing).toBe(false);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('keeps old Angular apply-fail title with backend detail when YML save fails', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database\n# invalid',
      originalYaml: 'app: mysql\ncategory: database'
    };
    saveTemplateDefine.mockRejectedValueOnce(new Error('schema invalid'));
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSave();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveTemplateDefine).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      'app: mysql\ncategory: database\n# invalid',
      false
    );
    expect(mockState.lastSurfaceProps?.message).toContain('应用失败');
    expect(mockState.lastSurfaceProps?.message).not.toContain('schema invalid');
    expect(mockState.lastSurfaceProps?.messageMeta).toBe('schema invalid');
    expect(mockState.lastSurfaceProps?.messageContract).toBe('angular-apply-fail-notification');
    expect(reloadTemplateDefinitionStartupContext).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('keeps old Angular delete-fail title with backend detail when YML delete fails', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database',
      originalYaml: 'app: mysql\ncategory: database'
    };
    deleteTemplateDefine.mockRejectedValueOnce(new Error('template is still in use'));
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDelete();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deleteTemplateDefine).toHaveBeenCalledWith(apiMessageDelete, 'mysql');
    expect(mockState.lastSurfaceProps?.message).toContain('删除失败');
    expect(mockState.lastSurfaceProps?.message).not.toContain('template is still in use');
    expect(mockState.lastSurfaceProps?.messageMeta).toBe('template is still in use');
    expect(mockState.lastSurfaceProps?.messageContract).toBe('angular-delete-fail-notification');
    expect(mockState.lastSurfaceProps?.selectedApp).toBe('mysql');
    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: mysql\ncategory: database');
    expect(mockState.lastSurfaceProps?.originalYaml).toBe('app: mysql\ncategory: database');
    expect(reloadTemplateDefinitionStartupContext).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('keeps old Angular apply-fail title with backend detail when template visibility update fails', async () => {
    window.history.pushState({}, '', '/setting/define?app=mysql');
    mockState.renderData = {
      menuGroups: [
        {
          key: 'database',
          label: 'DATABASE',
          items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
        }
      ],
      appLabels: { mysql: 'MySQL' },
      selectedApp: 'mysql',
      yaml: 'app: mysql\ncategory: database',
      originalYaml: 'app: mysql\ncategory: database'
    };
    updateTemplateVisibility.mockRejectedValueOnce(new Error('visibility locked by policy'));
    const { default: SettingDefinePage } = await import('./page');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingDefinePage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onToggleTemplateVisibility('mysql', true);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateTemplateVisibility).toHaveBeenCalledWith(apiMessagePut, 'mysql', true);
    expect(mockState.lastSurfaceProps?.message).toContain('应用失败');
    expect(mockState.lastSurfaceProps?.message).not.toContain('visibility locked by policy');
    expect(mockState.lastSurfaceProps?.messageMeta).toBe('visibility locked by policy');
    expect(mockState.lastSurfaceProps?.messageContract).toBe('angular-apply-fail-notification');
    expect(mockState.lastSurfaceProps?.selectedApp).toBe('mysql');
    expect(mockState.lastSurfaceProps?.editorValue).toBe('app: mysql\ncategory: database');
    expect(reloadTemplateDefinitionStartupContext).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it('does not depend on alert definition preview or datasource APIs', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/define/setting-define-page.tsx'), 'utf8');

    expect(source).toContain('saveTemplateDefine');
    expect(source).toContain('deleteTemplateDefine');
    expect(source).toContain('updateTemplateVisibility');
    expect(source).toContain('refreshStartupContextAfterMutation');
    expect(source).toContain('.catch(() => undefined)');
    expect(source).toContain('apiMessageDelete');
    expect(source).not.toContain('/alert/define');
    expect(source).not.toContain('buildPreviewUrl');
    expect(source).not.toContain('buildSkeletonDefine');
  });
});
