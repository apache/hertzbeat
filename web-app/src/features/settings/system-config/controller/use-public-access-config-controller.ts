/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { App } from 'antd';
import { useLayoutEffect, useRef, useState } from 'react';
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
  const command = usePublicAccessSaveOwnership(canConfigure);
  const current = query.data ? (draft ?? createPublicAccessConfigDraft(query.data)) : null;
  const payload = current ? buildPublicAccessConfigPayload(current) : null;
  const dirty = Boolean(payload && query.data && !samePublicAccessConfig(payload, query.data));

  const update = (field: keyof PublicAccessConfigDraft, value: string) => {
    const baseline = query.data;
    if (!command.canEdit() || !baseline) return;
    setDraft(previous => ({ ...(previous ?? createPublicAccessConfigDraft(baseline)), [field]: value }));
  };

  const save = async () => {
    if (!command.canEdit() || !payload || !current || !publicAccessConfigDraftValid(current)) return;
    const owner = command.begin();
    try {
      const saved = await savePublicAccessConfig(payload);
      if (!command.isCurrent(owner)) return;
      queryClient.setQueryData(publicAccessConfigQueryKey, saved);
      setDraft(null);
      void message.success(t('systemConfig.publicAccess.saveSuccess'));
    } catch {
      if (!command.isCurrent(owner)) return;
      const reread = await proveWrite(payload);
      if (!command.isCurrent(owner)) return;
      if (reread) {
        queryClient.setQueryData(publicAccessConfigQueryKey, reread);
        setDraft(null);
        void message.success(t('systemConfig.publicAccess.saveSuccess'));
      } else {
        void message.error(t('systemConfig.publicAccess.saveFailed'));
      }
    } finally {
      command.finish(owner);
    }
  };

  return {
    state: publicAccessViewState(query, current, dirty, command.saving),
    actions: {
      discard: () => command.canEdit() && setDraft(null),
      retry: () => void query.refetch(),
      save: () => void save(),
      update
    }
  };
}

function publicAccessViewState(
  query: Pick<
    UseQueryResult<Awaited<ReturnType<typeof loadPublicAccessConfig>>>,
    'isPending' | 'isError' | 'error' | 'data'
  >,
  current: PublicAccessConfigDraft | null,
  dirty: boolean,
  saving: boolean
) {
  if (query.isPending) return { kind: 'loading' } as const;
  if (query.isError) {
    return {
      kind: query.error instanceof PublicAccessConfigContractError ? ('invalid' as const) : ('unavailable' as const)
    };
  }
  if (query.data && current) {
    return { kind: 'ready' as const, current, dirty, saving, valid: publicAccessConfigDraftValid(current) };
  }
  return { kind: 'unavailable' } as const;
}

function usePublicAccessSaveOwnership(canConfigure: boolean) {
  const [saving, setSaving] = useState(false);
  const [previousCanConfigure, setPreviousCanConfigure] = useState(canConfigure);
  if (previousCanConfigure !== canConfigure) {
    setPreviousCanConfigure(canConfigure);
    if (!canConfigure) setSaving(false);
  }
  const mountedRef = useRef(true);
  const canConfigureRef = useRef(canConfigure);
  const ownerRef = useRef<symbol | null>(null);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    canConfigureRef.current = canConfigure;
    if (!canConfigure) ownerRef.current = null;
  }, [canConfigure]);
  const canEdit = () => mountedRef.current && canConfigureRef.current && ownerRef.current === null;
  const isCurrent = (owner: symbol) => mountedRef.current && canConfigureRef.current && ownerRef.current === owner;
  return {
    canEdit,
    isCurrent,
    saving,
    begin: () => {
      const owner = Symbol('public-access-save');
      ownerRef.current = owner;
      setSaving(true);
      return owner;
    },
    finish: (owner: symbol) => {
      if (!isCurrent(owner)) return;
      ownerRef.current = null;
      setSaving(false);
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
