/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import {
  loadPublicAccessConfig,
  publicAccessConfigQueryKey
} from '@/features/settings/system-config/api/public-access-config-api';
import { buildAlertIntegrationPath } from '@/shared/navigation/app-paths';

import {
  loadAlertIntegrationCatalog,
  loadAlertIntegrationGuide,
  startAlertIntegrationVerification
} from '../api/alert-integration-api';
import {
  alertIntegrationFailureKind,
  buildAlertIngressContract,
  buildAlertIntegrationTokenSettingsPath,
  canManageAlertIntegrationTokens,
  type AlertIntegrationCatalog,
  type AlertIntegrationState
} from '../model/alert-integration-model';
import { alertIntegrationQueryKeys } from './alert-integration-query-keys';

export function useAlertIntegrationController() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const canManageTokens = canManageAlertIntegrationTokens(session?.roles ?? []);
  const selectedSource = useParams<{ source: string }>().source ?? '';
  const catalogQuery = useQuery({
    queryKey: alertIntegrationQueryKeys.catalog(),
    queryFn: ({ signal }) => loadAlertIntegrationCatalog(signal),
    refetchInterval: query => alertIntegrationCatalogRefreshInterval(query.state.data),
    retry: false
  });
  const catalogItem = catalogQuery.data?.items.find(item => item.source === selectedSource);
  const canonicalSource = catalogItem ? undefined : catalogQuery.data?.items[0]?.source;
  useEffect(() => {
    if (canonicalSource) void navigate(buildAlertIntegrationPath(canonicalSource), { replace: true });
  }, [canonicalSource, navigate]);
  const detailQuery = useQuery({
    queryKey: alertIntegrationQueryKeys.detail(selectedSource),
    queryFn: ({ signal }) => loadAlertIntegrationGuide(selectedSource, signal),
    enabled: catalogItem !== undefined,
    retry: false
  });
  const publicAccessQuery = useQuery({
    queryKey: publicAccessConfigQueryKey,
    queryFn: ({ signal }) => loadPublicAccessConfig(signal),
    retry: false
  });
  const verificationMutation = useMutation({
    mutationFn: (source: string) => startAlertIntegrationVerification(source),
    onSuccess: (verification, source) => {
      queryClient.setQueryData<AlertIntegrationCatalog>(alertIntegrationQueryKeys.catalog(), current =>
        current
          ? {
              items: current.items.map(item => (item.source === source ? { ...item, verification } : item))
            }
          : current
      );
    }
  });
  const state = resolveState(catalogQuery, detailQuery, catalogItem !== undefined);
  const guide = state.kind === 'ready' ? state.guide : undefined;
  const contract = guide
    ? buildAlertIngressContract(guide, configuredPublicBaseUrl(publicAccessQuery.data))
    : undefined;
  const tokenSettingsPath = buildAlertIntegrationTokenSettingsPath(selectedSource);
  return {
    state,
    selectedSource,
    contract,
    tokenSettingsPath,
    canManageTokens,
    verificationStarting: verificationMutation.isPending && verificationMutation.variables === selectedSource,
    verificationError: verificationMutation.isError && verificationMutation.variables === selectedSource,
    actions: {
      selectSource: (source: string) => {
        void navigate(buildAlertIntegrationPath(source));
      },
      retry: () => retryFailedState(state, catalogQuery, detailQuery, catalogItem !== undefined),
      startVerification: () => verificationMutation.mutateAsync(selectedSource),
      openTokenSettings: () => {
        if (canManageTokens) void navigate(tokenSettingsPath);
      }
    }
  };
}

function configuredPublicBaseUrl(config: Awaited<ReturnType<typeof loadPublicAccessConfig>> | undefined) {
  return config?.publicBaseUrl;
}

export function alertIntegrationCatalogRefreshInterval(catalog: AlertIntegrationCatalog | undefined) {
  return catalog?.items.some(item => item.verification.status === 'waiting') ? 2_000 : false;
}

type QueryEvidence<T> = { isPending: boolean; error: Error | null; data: T | undefined };

function resolveState(
  catalog: QueryEvidence<Awaited<ReturnType<typeof loadAlertIntegrationCatalog>>>,
  detail: QueryEvidence<Awaited<ReturnType<typeof loadAlertIntegrationGuide>>>,
  catalogHit: boolean
): AlertIntegrationState {
  if (catalog.isPending) return { kind: 'loading' };
  if (catalog.error) return { kind: alertIntegrationFailureKind(catalog.error) };
  if (!catalog.data) return { kind: 'error' };
  if (!catalogHit) return { kind: 'not-found', catalog: catalog.data.items };
  if (detail.isPending) return { kind: 'loading' };
  if (detail.error) return { kind: alertIntegrationFailureKind(detail.error) };
  if (!detail.data) return { kind: 'error' };
  return { kind: 'ready', catalog: catalog.data.items, guide: detail.data };
}

async function retryFailedState(
  state: AlertIntegrationState,
  catalog: QueryEvidence<unknown> & { refetch: () => Promise<unknown> },
  detail: QueryEvidence<unknown> & { refetch: () => Promise<unknown> },
  catalogHit: boolean
) {
  if (state.kind !== 'unavailable' && state.kind !== 'error') return;
  if (catalog.error || !catalog.data) {
    await catalog.refetch();
    return;
  }
  if (catalogHit && (detail.error || !detail.data)) {
    await detail.refetch();
  }
}
