'use client';

import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { SettingDefineSurface } from '@/components/pages/setting-define-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import {
  buildNewTemplateDraft,
  deleteTemplateDefine,
  loadDefineCenterData,
  reloadTemplateDefinitionStartupContext,
  saveTemplateDefine,
  updateTemplateVisibility,
  type SettingDefinePageData
} from '@/lib/setting-define/controller';
import { readSettingDefineRouteStateFromSearch } from '@/lib/setting-define/query-state';

const SETTING_DEFINE_SETTLED_CACHE_TTL_MS = 10_000;

function readInitialSelectedApp() {
  if (typeof window === 'undefined') return undefined;
  return readSettingDefineRouteStateFromSearch(window.location.search).app;
}

function writeSelectedAppToUrl(app: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const nextSearch = app ? `?app=${encodeURIComponent(app)}` : '';
  window.history.pushState({}, '', `${url.pathname}${nextSearch}`);
}

function buildYamlLabel(app: string | null, yaml: string) {
  if (app) return `app-${app}.yml`;
  const match = yaml.match(/^\s*app:\s*([^\s#]+)/m);
  return `app-${match?.[1]?.trim() || 'custom'}.yml`;
}

function resolveDefineWorkbenchTheme(theme: string | null | undefined): 'dark-ops' | 'light-ops' {
  return theme === 'light-ops' || theme === 'default' || theme === 'compact' ? 'light-ops' : 'dark-ops';
}

function readMutationFailureDetail(error: unknown, fallback = '') {
  if (error instanceof Error) return error.message;
  return fallback;
}

function readStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('theme');
  } catch {
    return null;
  }
}

function readInitialDefineDarkMode() {
  if (typeof document === 'undefined') return false;
  const domTheme = document.body?.getAttribute('data-theme') || document.documentElement?.getAttribute('data-theme');
  const theme = resolveDefineWorkbenchTheme(domTheme || readStoredTheme() || 'dark-ops');
  return theme === 'dark-ops';
}

export default function SettingDefinePage() {
  const { locale, t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<string | null | undefined>(() => readInitialSelectedApp());
  const [message, setMessage] = useState<string | null>(null);
  const [messageMeta, setMessageMeta] = useState<string | null>(null);
  const [messageContract, setMessageContract] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState<string | null>(null);
  const [originalYaml, setOriginalYaml] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => readInitialDefineDarkMode());
  const [isEditing, setIsEditing] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingDefineCacheKey = useMemo(
    () => ['setting-define-yml', selectedApp || 'new', reloadVersion].join(':'),
    [selectedApp, reloadVersion]
  );

  const load = useCallback(async () => {
    return loadDefineCenterData(apiMessageGet, selectedApp ?? null, locale);
  }, [selectedApp, locale]);

  const refreshStartupContextAfterMutation = useCallback(() => {
    void reloadTemplateDefinitionStartupContext(apiMessageGet, locale).catch(() => undefined);
  }, [locale]);

  const clearMutationMessage = useCallback(() => {
    setMessage(null);
    setMessageMeta(null);
    setMessageContract(null);
  }, []);

  const buildFallbackDefineData = useCallback((): SettingDefinePageData => {
    const draft = buildNewTemplateDraft(locale);
    return {
      menuGroups: [],
      appLabels: {},
      selectedApp: selectedApp ?? null,
      yaml: draft.yaml,
      originalYaml: draft.originalYaml
    };
  }, [locale, selectedApp]);

  function selectApp(app: string) {
    setSelectedApp(app);
    writeSelectedAppToUrl(app);
    setEditorValue(null);
    setOriginalYaml(null);
    clearMutationMessage();
    setIsEditing(false);
  }

  function startNewTemplate() {
    const draft = buildNewTemplateDraft(locale);
    setSelectedApp(null);
    setEditorValue(draft.yaml);
    setOriginalYaml(draft.originalYaml);
    clearMutationMessage();
    setIsEditing(true);
  }

  async function saveCurrent(currentApp: string | null, currentYaml: string, currentOriginalYaml: string) {
    if (currentYaml === currentOriginalYaml) return;
    if (currentYaml === '') {
      setMessage(t('define.save-apply.no-code'));
      setMessageMeta(null);
      setMessageContract(null);
      return;
    }
    clearMutationMessage();
    setSavePending(true);
    try {
      await saveTemplateDefine(apiMessagePost, apiMessagePut, currentYaml, !currentApp);
      setMessage(t('common.notify.apply-success'));
      setMessageMeta(null);
      setMessageContract(null);
      if (currentApp) {
        setEditorValue(null);
        setOriginalYaml(null);
        setIsEditing(false);
      } else {
        setOriginalYaml(currentOriginalYaml);
      }
      setReloadVersion(version => version + 1);
      refreshStartupContextAfterMutation();
    } catch (error) {
      setMessage(t('common.notify.apply-fail'));
      setMessageMeta(readMutationFailureDetail(error, t('setting.define.save.failed')));
      setMessageContract('angular-apply-fail-notification');
    } finally {
      setSavePending(false);
    }
  }

  async function deleteCurrent(currentApp: string | null) {
    if (!currentApp) return;
    clearMutationMessage();
    try {
      await deleteTemplateDefine(apiMessageDelete, currentApp);
      const draft = buildNewTemplateDraft(locale);
      setSelectedApp(null);
      setEditorValue(draft.yaml);
      setOriginalYaml(draft.originalYaml);
      setMessage(t('common.notify.delete-success'));
      setMessageMeta(null);
      setMessageContract(null);
      setReloadVersion(version => version + 1);
      refreshStartupContextAfterMutation();
    } catch (error) {
      setMessage(t('common.notify.delete-fail'));
      setMessageMeta(readMutationFailureDetail(error));
      setMessageContract('angular-delete-fail-notification');
    }
  }

  async function toggleTemplateVisibility(app: string, hide: boolean) {
    clearMutationMessage();
    setSavePending(true);
    try {
      await updateTemplateVisibility(apiMessagePut, app, hide);
      setMessage(t('common.notify.apply-success'));
      setMessageMeta(null);
      setMessageContract(null);
      setReloadVersion(version => version + 1);
      refreshStartupContextAfterMutation();
    } catch (error) {
      setMessage(t('common.notify.apply-fail'));
      setMessageMeta(readMutationFailureDetail(error));
      setMessageContract('angular-apply-fail-notification');
    } finally {
      setSavePending(false);
    }
  }

  function renderDefineSurface(data: SettingDefinePageData, loadError: string | null = null) {
    const activeApp = selectedApp === undefined ? data.selectedApp : selectedApp;
    const resolvedEditorValue = editorValue ?? data.yaml;
    const resolvedOriginalYaml = originalYaml ?? data.originalYaml;

    return (
      <SettingDefineSurface
        t={t}
        data={data}
        search={search}
        selectedApp={activeApp}
        editorValue={resolvedEditorValue}
        originalYaml={resolvedOriginalYaml}
        yamlLabel={buildYamlLabel(activeApp, resolvedEditorValue)}
        darkMode={darkMode}
        isEditing={isEditing}
        menuLoading={false}
        editorLoading={false}
        savePending={savePending}
        message={message}
        messageMeta={messageMeta}
        messageContract={messageContract}
        loadError={loadError}
        onSearchChange={setSearch}
        onSearch={() => undefined}
        onSelectApp={selectApp}
        onNew={startNewTemplate}
        onEdit={() => setIsEditing(true)}
        onCancel={() => {
          setEditorValue(resolvedOriginalYaml);
          clearMutationMessage();
          setIsEditing(false);
        }}
        onSave={() => void saveCurrent(activeApp, resolvedEditorValue, resolvedOriginalYaml)}
        onDelete={() => void deleteCurrent(activeApp)}
        onToggleTemplateVisibility={(app, hide) => void toggleTemplateVisibility(app, hide)}
        onToggleDarkMode={setDarkMode}
        onEditorValueChange={value => {
          setEditorValue(value);
          clearMutationMessage();
          if (!isEditing) {
            setIsEditing(true);
          }
        }}
      />
    );
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.define.loading')}
      cacheKey={settingDefineCacheKey}
      cacheSettledTtlMs={SETTING_DEFINE_SETTLED_CACHE_TTL_MS}
      renderError={(message) => renderDefineSurface(buildFallbackDefineData(), message)}
    >
      {data => renderDefineSurface(data)}
    </ClientWorkbench>
  );
}
