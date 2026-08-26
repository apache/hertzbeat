/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiMessageError } from '@/core/http/api-message';

import {
  loadMonitorMetricLayout,
  resetMonitorMetricLayout,
  saveMonitorMetricLayout
} from '../api/monitor-metric-layout-api';
import { MonitorMetricLayoutContractError } from '../api/monitor-metric-layout-schema';
import {
  mergeMonitorMetricLayout,
  snapMonitorMetricLayoutItems,
  type MonitorMetricHistoryDock,
  type MonitorMetricLayoutDocument,
  type MonitorMetricLayoutItem
} from '../model/monitor-metric-layout-model';
import { monitorQueryKeys } from './monitor-query-keys';
import { useMonitorMetricLayoutCommandOwner } from './use-monitor-metric-layout-command-owner';

export function useMonitorMetricLayoutController(application: string | undefined, groups: string[]) {
  const resource = useLayoutResource(application);
  const [draft, setDraft] = useState<MonitorMetricLayoutDocument | null>(null);
  const ownership = useMonitorMetricLayoutCommandOwner(application);
  const canonical = useMemo(() => mergeMonitorMetricLayout(resource.data, groups), [groups, resource.data]);
  const layout = ownership.editing && draft ? draft : canonical;
  const commandInput = { resource, ownership, setDraft };
  const save = useSaveLayoutCommand({ ...commandInput, draft });
  const reset = useResetLayoutCommand(commandInput);

  return {
    state: {
      readState: readState(resource.error, resource.isPending),
      editing: ownership.editing,
      saving: ownership.saving,
      revision: resource.data?.revision ?? 'missing',
      hasSavedLayout: Boolean(resource.data),
      layout
    },
    actions: {
      beginEdit: () => {
        if (!ownership.beginEdit()) return;
        setDraft({ ...canonical, mode: 'custom', items: canonical.items.map(item => ({ ...item })) });
      },
      cancelEdit: () => {
        ownership.cancelEdit();
        setDraft(null);
      },
      changeItems: (items: MonitorMetricLayoutItem[]) =>
        setDraft(current =>
          current ? { ...current, mode: 'custom', items: snapMonitorMetricLayoutItems(items) } : current
        ),
      changeHistoryDock: (historyDock: MonitorMetricHistoryDock) =>
        setDraft(current => (current ? { ...current, mode: 'custom', historyDock } : current)),
      save,
      reset
    }
  };
}

function useLayoutResource(application: string | undefined) {
  return useQuery({
    queryKey: monitorQueryKeys.layout(application),
    queryFn: application ? ({ signal }) => loadMonitorMetricLayout(application, signal) : skipToken,
    retry: false
  });
}

type LayoutCommandInput = {
  resource: ReturnType<typeof useLayoutResource>;
  ownership: ReturnType<typeof useMonitorMetricLayoutCommandOwner>;
  setDraft: Dispatch<SetStateAction<MonitorMetricLayoutDocument | null>>;
};

function useSaveLayoutCommand(input: LayoutCommandInput & { draft: MonitorMetricLayoutDocument | null }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return async () => {
    const owner = input.ownership.activeOwner;
    if (!owner || !input.draft || !input.ownership.isCurrent(owner) || !input.ownership.beginCommand(owner)) return;
    try {
      const saved = await saveMonitorMetricLayout(owner.application, {
        schemaVersion: input.draft.schemaVersion,
        mode: 'custom',
        columns: input.draft.columns,
        items: input.draft.items,
        historyDock: input.draft.historyDock,
        expectedRevision: input.resource.data?.revision ?? 'missing'
      });
      queryClient.setQueryData(monitorQueryKeys.layout(owner.application), saved);
      if (input.ownership.clearEdit(owner)) {
        input.setDraft(null);
        void message.success(t('monitorMetrics.layout.saved'));
      }
    } catch (error) {
      if (input.ownership.isCurrent(owner)) {
        await reportLayoutCommandError(error, input.resource.refetch, message, t);
      }
    } finally {
      input.ownership.endCommand(owner);
    }
  };
}

function useResetLayoutCommand(input: LayoutCommandInput) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return async () => {
    const owner = input.ownership.currentOwner;
    if (!owner || !input.ownership.beginCommand(owner)) return;
    try {
      if (input.resource.data) await resetMonitorMetricLayout(owner.application, input.resource.data.revision);
      queryClient.setQueryData(monitorQueryKeys.layout(owner.application), null);
      if (input.ownership.isCurrent(owner)) {
        if (input.ownership.clearEdit(owner)) input.setDraft(null);
        void message.success(t('monitorMetrics.layout.resetDone'));
      }
    } catch (error) {
      if (input.ownership.isCurrent(owner)) {
        await reportLayoutCommandError(error, input.resource.refetch, message, t);
      }
    } finally {
      input.ownership.endCommand(owner);
    }
  };
}

async function reportLayoutCommandError(
  error: unknown,
  refetch: () => Promise<unknown>,
  message: ReturnType<typeof App.useApp>['message'],
  t: ReturnType<typeof useTranslation>['t']
) {
  if (error instanceof ApiMessageError && error.status === 409) {
    void message.warning(t('monitorMetrics.layout.conflict'));
    await refetch();
  } else {
    void message.error(t('monitorMetrics.layout.saveFailed'));
  }
}

function readState(error: unknown, pending: boolean) {
  if (pending) return 'loading' as const;
  if (!error) return 'ready' as const;
  if (error instanceof MonitorMetricLayoutContractError) return 'invalid' as const;
  if (error instanceof ApiMessageError && (error.status === undefined || error.status >= 500)) {
    return 'unavailable' as const;
  }
  return 'error' as const;
}
