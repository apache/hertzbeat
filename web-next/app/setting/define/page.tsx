'use client';

import { useCallback, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { SettingDefineSurface } from '@/components/pages/setting-define-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiGet, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { buildPreviewUrl, buildSkeletonDefine, loadDefineCenterData, saveDefine } from '@/lib/setting-define/controller';
import type { AlertDefine } from '@/lib/types';

function buildDefineEditorValue(define: AlertDefine | null) {
  const draft = define || buildSkeletonDefine();
  return [
    `name: ${draft.name || ''}`,
    `type: ${draft.type || ''}`,
    `datasource: ${draft.datasource || ''}`,
    `enable: ${draft.enable === false ? 'false' : 'true'}`,
    `period: ${draft.period || 0}`,
    `times: ${draft.times || 0}`,
    'expr: |',
    `  ${(draft.expr || '').replace(/\n/g, '\n  ')}`
  ].join('\n');
}

function buildCurrentYamlLabel(define: AlertDefine | null) {
  if (!define) return null;
  const stem = define.datasource || define.name || 'current';
  return `${stem}.yml`;
}

function cloneDefine(define: AlertDefine) {
  return {
    ...define,
    labels: define.labels ? { ...define.labels } : define.labels,
    annotations: define.annotations ? { ...define.annotations } : define.annotations
  };
}

export default function SettingDefinePage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AlertDefine | null>(null);
  const [preview, setPreview] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    return loadDefineCenterData(apiMessageGet, query);
  }, [query]);

  async function previewDefine(current: AlertDefine | null) {
    if (!current?.datasource || !current?.expr) return;
    setMessage(null);
    try {
      const result = await apiGet<{ code: number; data?: unknown; msg?: string }>(buildPreviewUrl(current));
      setPreview(result.data);
      setMessage(result.code === 0 ? t('setting.define.preview.success') : result.msg || t('setting.define.preview.failed'));
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : t('setting.define.preview.failed'));
    }
  }

  async function saveSelected(current: AlertDefine | null) {
    if (!current) return;
    setSaving(true);
    setMessage(null);
    try {
      if (current.id && current.id > 0) {
        await saveDefine(apiMessagePut, current);
      } else {
        await apiMessagePost('/alert/define', current);
      }
      setMessage(t('setting.define.save.success'));
      setIsEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('setting.define.save.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientWorkbench load={load} loadingCopy={t('setting.define.loading')}>
      {data => {
        const activeDefine = selected ?? data.list.content[0] ?? null;
        const resolvedEditorValue = editorValue || buildDefineEditorValue(activeDefine);

        return (
          <SettingDefineSurface
            t={t}
            data={data}
            search={search}
            selectedDefine={activeDefine}
            editorValue={resolvedEditorValue}
            yamlLabel={buildCurrentYamlLabel(activeDefine)}
            darkMode={darkMode}
            isEditing={isEditing}
            formatTime={formatTime}
            message={message}
            preview={preview}
            onSearchChange={setSearch}
            onSearch={() => setQuery(search)}
            onSelectDefine={define => {
              setSelected(cloneDefine(define));
              setEditorValue(buildDefineEditorValue(define));
              setMessage(null);
              setPreview(null);
              setIsEditing(false);
            }}
            onNew={() => {
              const skeleton = buildSkeletonDefine();
              setSelected(skeleton);
              setEditorValue(buildDefineEditorValue(skeleton));
              setMessage(null);
              setPreview(null);
              setIsEditing(true);
            }}
            onEdit={() => {
              if (activeDefine) {
                setSelected(cloneDefine(activeDefine));
                setEditorValue(resolvedEditorValue);
                setIsEditing(true);
              }
            }}
            onCancel={() => {
              setEditorValue(buildDefineEditorValue(activeDefine));
              setMessage(null);
              setPreview(null);
              setIsEditing(false);
            }}
            onSave={() => void saveSelected(activeDefine)}
            onDelete={() => setMessage(t('define.delete', { app: activeDefine?.name || 'current' }))}
            onToggleDarkMode={setDarkMode}
            onPreview={() => void previewDefine(activeDefine)}
            onEditorValueChange={value => {
              setEditorValue(value);
              if (!isEditing) {
                setIsEditing(true);
              }
            }}
          />
        );
      }}
    </ClientWorkbench>
  );
}
