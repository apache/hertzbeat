'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { StatusSettingSurface } from '@/components/pages/status-setting-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { buildStatusIncidentListUrl, createStatusPageComponent, createStatusPageIncident, deleteStatusPageComponent, deleteStatusPageIncident, loadStatusManagementData, saveStatusPageOrg, updateStatusPageComponent, updateStatusPageIncident } from '@/lib/setting-status/controller';
import { buildStatusComponentDraft, buildStatusComponentPayload, buildStatusIncidentDraft, buildStatusIncidentPayload, buildStatusOrgDraft, buildStatusOrgPayload, type StatusComponentDraft, type StatusIncidentDraft, type StatusOrgDraft, validateStatusComponentDraft, validateStatusIncidentDraft, validateStatusOrgDraft } from '@/lib/setting-status/view-model';
import type { PageResult, StatusPageComponent, StatusPageIncident, StatusPageOrg } from '@/lib/types';

type StatusManagementData = {
  org: StatusPageOrg;
  components: StatusPageComponent[];
  incidents: PageResult<StatusPageIncident>;
};

const SETTING_STATUS_SETTLED_CACHE_TTL_MS = 10_000;

export default function SettingStatusPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'component' | 'incident'>('component');
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDraft, setOrgDraft] = useState<StatusOrgDraft>(() => buildStatusOrgDraft(null));
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [editingComponent, setEditingComponent] = useState(false);
  const [componentDraft, setComponentDraft] = useState<StatusComponentDraft>(() => buildStatusComponentDraft(null));
  const [savingComponent, setSavingComponent] = useState(false);
  const [componentMessage, setComponentMessage] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<number | null>(null);
  const [editingIncident, setEditingIncident] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState<StatusIncidentDraft>(() => buildStatusIncidentDraft(null));
  const [savingIncident, setSavingIncident] = useState(false);
  const [incidentMessage, setIncidentMessage] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [incidentSearchInput, setIncidentSearchInput] = useState('');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentPageIndex, setIncidentPageIndex] = useState(0);
  const [incidentPageSize, setIncidentPageSize] = useState(8);
  const [refreshTick, setRefreshTick] = useState(0);

  const statusIncidentQuery = useMemo(() => ({
    search: incidentSearch,
    pageIndex: incidentPageIndex,
    pageSize: incidentPageSize
  }), [incidentPageIndex, incidentPageSize, incidentSearch]);
  const statusIncidentListUrl = useMemo(() => buildStatusIncidentListUrl(statusIncidentQuery), [statusIncidentQuery]);
  const settingStatusCacheKey = useMemo(
    () => ['setting-status', '/status/page/org', '/status/page/component', statusIncidentListUrl, refreshTick].join(':'),
    [refreshTick, statusIncidentListUrl]
  );

  const load = useCallback(async (): Promise<StatusManagementData> => {
    void refreshTick;
    return loadStatusManagementData(apiMessageGet, statusIncidentQuery);
  }, [refreshTick, statusIncidentQuery]);

  function commitIncidentSearch() {
    const nextSearch = incidentSearchInput.trim();
    setIncidentSearch(nextSearch);
    setIncidentSearchInput(nextSearch);
    setIncidentPageIndex(0);
    setRefreshTick(value => value + 1);
  }

  function handleModeChange(nextMode: 'component' | 'incident') {
    setMode(nextMode);
    setRefreshTick(value => value + 1);
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.status.loading')}
      cacheKey={settingStatusCacheKey}
      cacheSettledTtlMs={SETTING_STATUS_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const selectedComponent = data.components.find(component => component.id === selectedComponentId) ?? data.components[0] ?? null;
        const selectedIncident = data.incidents.content.find(incident => incident.id === selectedIncidentId) ?? data.incidents.content[0] ?? null;
        const resolvedIncidentPageIndex = Math.max(0, data.incidents.pageIndex ?? incidentPageIndex);
        const resolvedIncidentPageSize = Math.max(1, data.incidents.pageSize ?? incidentPageSize);
        const resolvedIncidentTotal = data.incidents.totalElements || 0;
        const resolvedIncidentTotalPages = Math.max(1, Math.ceil(resolvedIncidentTotal / resolvedIncidentPageSize));
        const displayedIncidentPageIndex = Math.min(resolvedIncidentPageIndex, resolvedIncidentTotalPages - 1);

        async function handleEditOrg() {
          setOrgDraft(buildStatusOrgDraft(data.org));
          setOrgMessage(null);
          setOrgError(null);
          setEditingOrg(true);
        }

        async function handleSaveOrg() {
          const validationError = validateStatusOrgDraft(orgDraft, t);
          if (validationError) {
            setOrgError(validationError);
            return;
          }
          setSavingOrg(true);
          setOrgMessage(null);
          setOrgError(null);
          try {
            await saveStatusPageOrg(apiMessagePost as any, buildStatusOrgPayload(orgDraft));
            setOrgMessage(t('common.notify.apply-success'));
            setEditingOrg(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setOrgError(error instanceof Error ? error.message : t('common.notify.apply-fail'));
          } finally {
            setSavingOrg(false);
          }
        }

        async function handleNewComponent() {
          setComponentDraft(buildStatusComponentDraft({ orgId: data.org.id } as StatusPageComponent));
          setComponentMessage(null);
          setComponentError(null);
          setEditingComponent(true);
        }

        async function handleEditComponent(componentOverride?: StatusPageComponent) {
          const component = componentOverride ?? selectedComponent;
          if (!component) return;
          setComponentDraft(buildStatusComponentDraft(component));
          setComponentMessage(null);
          setComponentError(null);
          setEditingComponent(true);
        }

        async function handleSaveComponent() {
          const validationError = validateStatusComponentDraft(componentDraft, t);
          if (validationError) {
            setComponentError(validationError);
            return;
          }
          const componentOrgId = data.org.id || componentDraft.orgId;
          if (!componentOrgId) {
            setComponentError(t('status.component.notify.need-org'));
            return;
          }
          const isEdit = Boolean(componentDraft.id);
          setSavingComponent(true);
          setComponentMessage(null);
          setComponentError(null);
          try {
            const payload = buildStatusComponentPayload({ ...componentDraft, orgId: componentOrgId });
            if (isEdit) {
              await updateStatusPageComponent(apiMessagePut as any, payload);
            } else {
              await createStatusPageComponent(apiMessagePost as any, payload);
            }
            setComponentMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditingComponent(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setComponentError(error instanceof Error ? error.message : t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
          } finally {
            setSavingComponent(false);
          }
        }

        async function handleDeleteComponent(componentOverride?: StatusPageComponent) {
          const component = componentOverride ?? selectedComponent;
          if (!component?.id) return;
          try {
            await deleteStatusPageComponent(apiMessageDelete as any, component.id);
            setComponentMessage(t('common.notify.delete-success'));
            setComponentError(null);
            setEditingComponent(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setComponentError(error instanceof Error ? error.message : t('common.notify.delete-fail'));
          }
        }

        async function handleNewIncident() {
          setIncidentDraft(buildStatusIncidentDraft({ orgId: data.org.id } as StatusPageIncident));
          setIncidentMessage(null);
          setIncidentError(null);
          setEditingIncident(true);
        }

        async function handleEditIncident(incidentOverride?: StatusPageIncident) {
          const incident = incidentOverride ?? selectedIncident;
          if (!incident) return;
          setIncidentDraft(buildStatusIncidentDraft(incident));
          setIncidentMessage(null);
          setIncidentError(null);
          setEditingIncident(true);
        }

        async function handleSaveIncident() {
          const incidentOrgId = data.org.id || incidentDraft.orgId;
          if (!incidentOrgId) {
            setIncidentError(t('status.component.notify.need-org'));
            return;
          }
          const validationError = validateStatusIncidentDraft(incidentDraft, t);
          if (validationError) {
            setIncidentError(validationError);
            return;
          }
          const isEdit = Boolean(incidentDraft.id);
          setSavingIncident(true);
          setIncidentMessage(null);
          setIncidentError(null);
          try {
            const payload = buildStatusIncidentPayload({ ...incidentDraft, orgId: incidentOrgId }, data.components);
            if (isEdit) {
              await updateStatusPageIncident(apiMessagePut as any, payload);
            } else {
              await createStatusPageIncident(apiMessagePost as any, payload);
            }
            setIncidentMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditingIncident(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setIncidentError(error instanceof Error ? error.message : t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setEditingIncident(false);
          } finally {
            setSavingIncident(false);
          }
        }

        async function handleDeleteIncident(incidentOverride?: StatusPageIncident) {
          const incident = incidentOverride ?? selectedIncident;
          if (!incident?.id) return;
          try {
            await deleteStatusPageIncident(apiMessageDelete as any, incident.id);
            setIncidentMessage(t('common.notify.delete-success'));
            setIncidentError(null);
            setEditingIncident(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setIncidentError(error instanceof Error ? error.message : t('common.notify.delete-fail'));
          }
        }

        return (
          <StatusSettingSurface
            t={t}
            data={data}
            mode={mode}
            editingOrg={editingOrg}
            orgDraft={orgDraft}
            savingOrg={savingOrg}
            orgMessage={orgMessage}
            orgError={orgError}
            editingComponent={editingComponent}
            componentDraft={componentDraft}
            savingComponent={savingComponent}
            componentMessage={componentMessage}
            componentError={componentError}
            selectedComponentId={selectedComponentId}
            editingIncident={editingIncident}
            incidentDraft={incidentDraft}
            savingIncident={savingIncident}
            incidentMessage={incidentMessage}
            incidentError={incidentError}
            selectedIncidentId={selectedIncidentId}
            incidentSearchInput={incidentSearchInput}
            formatTime={formatTime}
            publicStatusHref="/status"
            onEditOrg={() => void handleEditOrg()}
            onModeChange={handleModeChange}
            onNewComponent={() => void handleNewComponent()}
            onEditComponent={component => void handleEditComponent(component)}
            onDeleteComponent={component => void handleDeleteComponent(component)}
            onNewIncident={() => void handleNewIncident()}
            onEditIncident={incident => void handleEditIncident(incident)}
            onDeleteIncident={incident => void handleDeleteIncident(incident)}
            onOrgDraftChange={patch => setOrgDraft(prev => ({ ...prev, ...patch }))}
            onSaveOrg={() => void handleSaveOrg()}
            onCancelOrg={() => setEditingOrg(false)}
            onComponentDraftChange={patch => setComponentDraft(prev => ({ ...prev, ...patch }))}
            onSaveComponent={() => void handleSaveComponent()}
            onCancelComponent={() => setEditingComponent(false)}
            onSelectComponent={setSelectedComponentId}
            onIncidentDraftChange={patch => setIncidentDraft(prev => ({ ...prev, ...patch }))}
            onSaveIncident={() => void handleSaveIncident()}
            onCancelIncident={() => setEditingIncident(false)}
            onSelectIncident={setSelectedIncidentId}
            onIncidentSearchInputChange={setIncidentSearchInput}
            onCommitIncidentSearch={commitIncidentSearch}
            onResetIncidentSearch={() => {
              setIncidentSearchInput('');
              setIncidentSearch('');
              setIncidentPageIndex(0);
              setRefreshTick(value => value + 1);
            }}
            onIncidentPageIndexChange={nextPageIndex => setIncidentPageIndex(nextPageIndex)}
            onIncidentPageSizeChange={nextPageSize => {
              setIncidentPageSize(nextPageSize);
              setIncidentPageIndex(0);
            }}
            onIncidentPrevious={() => setIncidentPageIndex(Math.max(0, displayedIncidentPageIndex - 1))}
            onIncidentNext={() => setIncidentPageIndex(Math.min(resolvedIncidentTotalPages - 1, displayedIncidentPageIndex + 1))}
          />
        );
      }}
    </ClientWorkbench>
  );
}
