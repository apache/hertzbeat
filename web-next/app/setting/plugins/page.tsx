'use client';

import { useCallback, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { PluginManageSurface } from '@/components/pages/plugin-manage-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { createEmptyPluginDraft, deletePlugin, loadPluginData, savePlugin, togglePluginStatus, type PluginUploadDraft } from '@/lib/plugin-manage/controller';
import type { PluginQueryState } from '@/lib/plugin-manage/query-state';
import type { Plugin } from '@/lib/types';

export default function SettingPluginsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<PluginQueryState>({ search: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draftPlugin, setDraftPlugin] = useState<PluginUploadDraft | null>(null);

  const load = useCallback(async () => {
    return loadPluginData(apiMessageGet, query);
  }, [query, reloadVersion]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('setting.plugins.loading')}>
      {data => (
        <PluginManageSurface
          t={t}
          data={data}
          search={search}
          selectedIds={selectedIds}
          draftPlugin={draftPlugin}
          onSearchChange={setSearch}
          onSearch={() => setQuery({ search })}
          onRefresh={() => setReloadVersion(version => version + 1)}
          onNew={() => setDraftPlugin(createEmptyPluginDraft())}
          onDeleteSelected={() => {
            selectedIds.forEach(id => {
              void deletePlugin(apiMessageDelete, id);
            });
            setSelectedIds([]);
            setReloadVersion(version => version + 1);
          }}
          onSelectedIdsChange={setSelectedIds}
          onEditParams={(_plugin: Plugin) => {}}
          onToggleEnabled={plugin => {
            void togglePluginStatus(apiMessagePut, plugin).then(() => {
              setReloadVersion(version => version + 1);
            });
          }}
          onDeleteOne={plugin => {
            void deletePlugin(apiMessageDelete, plugin.id).then(() => {
              setReloadVersion(version => version + 1);
            });
          }}
          onDraftChange={patch => setDraftPlugin(previous => (previous ? { ...previous, ...patch } : previous))}
          onCloseDialog={() => setDraftPlugin(null)}
          onSaveDialog={() => {
            if (!draftPlugin) return;
            void savePlugin(apiMessagePost, draftPlugin).then(() => {
              setDraftPlugin(null);
              setReloadVersion(version => version + 1);
            });
          }}
        />
      )}
    </ClientWorkbench>
  );
}
