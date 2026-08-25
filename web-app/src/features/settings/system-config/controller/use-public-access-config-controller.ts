/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  loadPublicAccessConfig,
  publicAccessConfigQueryKey,
  savePublicAccessConfig
} from '../api/public-access-config-api';
import { PublicAccessConfigContractError } from '../api/public-access-config-schema';
import {
  buildPublicAccessConfigPayload,
  createPublicAccessConfigDraft,
  publicAccessConfigDraftValid,
  samePublicAccessConfig,
  type PublicAccessConfigDraft
} from '../model/public-access-config-model';

export function usePublicAccessConfigController(canConfigure: boolean) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: publicAccessConfigQueryKey,
    queryFn: ({ signal }) => loadPublicAccessConfig(signal),
    retry: false
  });
  const [draft, setDraft] = useState<PublicAccessConfigDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const current = query.data ? (draft ?? createPublicAccessConfigDraft(query.data)) : null;
  const payload = current ? buildPublicAccessConfigPayload(current) : null;
  const dirty = Boolean(payload && query.data && !samePublicAccessConfig(payload, query.data));

  const update = (field: keyof PublicAccessConfigDraft, value: string) => {
    const baseline = query.data;
    if (!canConfigure || saving || !baseline) return;
    setDraft(previous => ({ ...(previous ?? createPublicAccessConfigDraft(baseline)), [field]: value }));
  };

  const save = async () => {
    if (!canConfigure || saving || !payload || !current || !publicAccessConfigDraftValid(current)) return;
    setSaving(true);
    try {
      const saved = await savePublicAccessConfig(payload);
      queryClient.setQueryData(publicAccessConfigQueryKey, saved);
      setDraft(null);
      void message.success(t('systemConfig.publicAccess.saveSuccess'));
    } catch {
      const reread = await proveWrite(payload);
      if (reread) {
        queryClient.setQueryData(publicAccessConfigQueryKey, reread);
        setDraft(null);
        void message.success(t('systemConfig.publicAccess.saveSuccess'));
      } else {
        void message.error(t('systemConfig.publicAccess.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  let state;
  if (query.isPending) {
    state = { kind: 'loading' } as const;
  } else if (query.isError) {
    state = {
      kind: query.error instanceof PublicAccessConfigContractError ? ('invalid' as const) : ('unavailable' as const)
    };
  } else if (query.data && current) {
    state = {
      kind: 'ready' as const,
      current,
      dirty,
      saving,
      valid: publicAccessConfigDraftValid(current)
    };
  } else {
    state = { kind: 'unavailable' } as const;
  }

  return {
    state,
    actions: {
      discard: () => !saving && setDraft(null),
      retry: () => void query.refetch(),
      save: () => void save(),
      update
    }
  };
}

async function proveWrite(intended: ReturnType<typeof buildPublicAccessConfigPayload>) {
  try {
    const current = await loadPublicAccessConfig();
    return samePublicAccessConfig(current, intended) ? current : null;
  } catch {
    return null;
  }
}
