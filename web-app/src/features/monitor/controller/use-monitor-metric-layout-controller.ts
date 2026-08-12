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

export function useMonitorMetricLayoutController(application: string | undefined, groups: string[]) {
  const resource = useLayoutResource(application);
  const [editingApplication, setEditingApplication] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<MonitorMetricLayoutDocument | null>(null);
  const editing = application !== undefined && editingApplication === application;
  const canonical = useMemo(() => mergeMonitorMetricLayout(resource.data, groups), [groups, resource.data]);
  const layout = editing && draft ? draft : canonical;
  const commandInput = { application, resource, saving, setSaving, setEditingApplication, setDraft };
  const save = useSaveLayoutCommand({ ...commandInput, draft });
  const reset = useResetLayoutCommand(commandInput);

  return {
    state: {
      readState: readState(resource.error, resource.isPending),
      editing,
      saving,
      revision: resource.data?.revision ?? 'missing',
      hasSavedLayout: Boolean(resource.data),
      layout
    },
    actions: {
      beginEdit: () => {
        setDraft({ ...canonical, mode: 'custom', items: canonical.items.map(item => ({ ...item })) });
        setEditingApplication(application ?? null);
      },
      cancelEdit: () => {
        setEditingApplication(null);
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
  application: string | undefined;
  resource: ReturnType<typeof useLayoutResource>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setEditingApplication: Dispatch<SetStateAction<string | null>>;
  setDraft: Dispatch<SetStateAction<MonitorMetricLayoutDocument | null>>;
};

function useSaveLayoutCommand(input: LayoutCommandInput & { draft: MonitorMetricLayoutDocument | null }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return async () => {
    if (!input.application || !input.draft || input.saving) return;
    input.setSaving(true);
    try {
      const saved = await saveMonitorMetricLayout(input.application, {
        ...input.draft,
        mode: 'custom',
        expectedRevision: input.resource.data?.revision ?? 'missing'
      });
      queryClient.setQueryData(monitorQueryKeys.layout(input.application), saved);
      input.setEditingApplication(null);
      input.setDraft(null);
      void message.success(t('monitorMetrics.layout.saved'));
    } catch (error) {
      await reportLayoutCommandError(error, input.resource.refetch, message, t);
    } finally {
      input.setSaving(false);
    }
  };
}

function useResetLayoutCommand(input: LayoutCommandInput) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return async () => {
    if (!input.application || input.saving) return;
    input.setSaving(true);
    try {
      if (input.resource.data) await resetMonitorMetricLayout(input.application, input.resource.data.revision);
      queryClient.setQueryData(monitorQueryKeys.layout(input.application), null);
      input.setEditingApplication(null);
      input.setDraft(null);
      void message.success(t('monitorMetrics.layout.resetDone'));
    } catch (error) {
      await reportLayoutCommandError(error, input.resource.refetch, message, t);
    } finally {
      input.setSaving(false);
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
