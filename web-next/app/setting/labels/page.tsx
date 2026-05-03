'use client';

import { useCallback, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { LabelManageSurface } from '@/components/pages/label-manage-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { cloneLabelDraft, createEmptyLabelDraft, deleteLabel, loadLabelData, saveLabel } from '@/lib/label-manage/controller';
import type { LabelQueryState } from '@/lib/label-manage/query-state';
import type { Label } from '@/lib/types';

export default function SettingLabelsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<LabelQueryState>({ search: '', type: '' });
  const [draftLabel, setDraftLabel] = useState<Label | null>(null);
  const [isManageModalAdd, setIsManageModalAdd] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const load = useCallback(async () => {
    return loadLabelData(apiMessageGet, query);
  }, [query, reloadVersion]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('setting.labels.loading')}>
      {data => (
        <LabelManageSurface
          t={t}
          data={data}
          search={search}
          draftLabel={draftLabel}
          isManageModalAdd={isManageModalAdd}
          formatTime={formatTime}
          onSearchChange={setSearch}
          onSearch={() => setQuery({ search, type: '' })}
          onRefresh={() => setReloadVersion(version => version + 1)}
          onNew={() => {
            setDraftLabel(createEmptyLabelDraft());
            setIsManageModalAdd(true);
          }}
          onCopy={label => {
            const text = `${label.name}${label.tagValue ? `:${label.tagValue}` : ''}`;
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              void navigator.clipboard.writeText(text);
            }
          }}
          onEdit={label => {
            setDraftLabel(cloneLabelDraft(label));
            setIsManageModalAdd(false);
          }}
          onDelete={label => {
            void deleteLabel(apiMessageDelete, label.id).then(() => {
              setReloadVersion(version => version + 1);
            });
          }}
          onDraftChange={patch => setDraftLabel(previous => (previous ? { ...previous, ...patch } : previous))}
          onCloseDialog={() => setDraftLabel(null)}
          onSaveDialog={() => {
            if (!draftLabel) return;
            void saveLabel(apiMessagePost, apiMessagePut, draftLabel, isManageModalAdd).then(() => {
              setDraftLabel(null);
              setReloadVersion(version => version + 1);
            });
          }}
        />
      )}
    </ClientWorkbench>
  );
}
