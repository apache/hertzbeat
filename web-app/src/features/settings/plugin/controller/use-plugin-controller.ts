/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';

import { useSession } from '@/core/auth/session-context';

import { loadPlugins, PluginRequestError } from '../api/plugin-api';
import { userCanWritePlugins, type PluginRecord, type PluginUploadDraft } from '../model/plugin-model';
import { pluginQueryKeys } from './plugin-query-keys';
import { usePluginMutations } from './use-plugin-mutations';
import { usePluginParams } from './use-plugin-params';
import { usePluginQuery } from './use-plugin-query';
import { usePluginUpload } from './use-plugin-upload';

export function usePluginController() {
  const client = useQueryClient();
  const canWrite = userCanWritePlugins(useSession().session?.roles ?? []);
  const authorized = useRef(canWrite);
  useLayoutEffect(() => {
    authorized.current = canWrite;
  }, [canWrite]);
  const state = usePluginQuery(canWrite);
  const changed = () => client.invalidateQueries({ queryKey: pluginQueryKeys.all });
  const reread = async () => (await state.result.refetch()).data ?? null;
  const readUploadCanonical = createUploadCanonicalReader(client);
  const upload = usePluginUpload(canWrite, readUploadCanonical, changed);
  const params = usePluginParams(canWrite, changed);
  const records = state.result.data?.content ?? [];
  const mutations = usePluginMutations({
    canWrite,
    query: state.query,
    getQuery: () => state.queryRef.current,
    visibleRecords: records.length,
    selectedIds: state.selectedIds,
    setSelected: state.setSelected,
    navigate: state.navigate,
    reread
  });
  const { clearOutcome, ...mutationActions } = mutations.actions;
  return {
    canWrite,
    query: state.query,
    searchDraft: state.searchDraft,
    selectedIds: state.selectedIds,
    listState: listState(state.result, state.query.search, canWrite),
    pageSizes: state.pageSizes,
    busy: upload.busy || mutations.busy || params.busy,
    params,
    uploadFailure: upload.failure,
    mutationFailure: mutations.failure,
    notice: mutations.notice,
    upload: upload.upload,
    uploadInvalid: upload.uploadInvalid,
    deleteTarget: mutations.deleteTarget,
    actions: {
      ...upload.actions,
      ...mutationActions,
      openParams: (plugin: PluginRecord) => void params.actions.open(plugin),
      openUpload: () => {
        if (authorized.current) clearOutcome();
        upload.actions.openUpload();
      },
      refresh: () => {
        if (authorized.current) void state.result.refetch();
      },
      setPage: state.setPage,
      setSearchDraft: state.setSearchDraft,
      setSelected: state.setSelected,
      submitSearch: state.submitSearch
    }
  };
}

function createUploadCanonicalReader(client: ReturnType<typeof useQueryClient>) {
  return async (draft: PluginUploadDraft) => {
    const query = { search: draft.name.trim(), pageIndex: 0 as const, pageSize: 50 as const };
    return client.fetchQuery({
      queryKey: pluginQueryKeys.page(query),
      queryFn: ({ signal }) => loadPlugins(query, signal),
      // Upload proof must bypass the application's shared 15-second cache.
      staleTime: 0
    });
  };
}

type PluginListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'search-empty' }
  | { kind: 'invalid' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: PluginRecord[]; total: number };

function listState(
  result: ReturnType<typeof usePluginQuery>['result'],
  search: string,
  canRead: boolean
): PluginListState {
  if (!canRead) return { kind: 'permission' } as const;
  if (result.isPending) return { kind: 'loading' } as const;
  if (result.error) return { kind: readFailure(result.error) } as const;
  if (!result.data) return { kind: 'error' } as const;
  if (result.data.content.length === 0) return { kind: search ? 'search-empty' : 'empty' } as const;
  return { kind: 'ready', records: result.data.content, total: result.data.totalElements } as const;
}

function readFailure(error: unknown): 'invalid' | 'permission' | 'unavailable' | 'error' {
  if (!(error instanceof PluginRequestError)) return 'error';
  if (error.kind === 'invalid' || error.kind === 'permission' || error.kind === 'unavailable') return error.kind;
  return 'error';
}
