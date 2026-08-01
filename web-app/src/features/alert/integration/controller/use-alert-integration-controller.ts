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

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { buildAlertIntegrationPath } from '@/shared/navigation/app-paths';

import { loadAlertIntegrationCatalog, loadAlertIntegrationGuide } from '../api/alert-integration-api';
import {
  alertIntegrationFailureKind,
  buildAlertIngressContract,
  buildAlertIntegrationTokenSettingsPath,
  type AlertIntegrationCopyState,
  type AlertIntegrationState
} from '../model/alert-integration-model';
import { alertIntegrationQueryKeys } from './alert-integration-query-keys';

export function useAlertIntegrationController() {
  const navigate = useNavigate();
  const selectedSource = useParams<{ source: string }>().source ?? '';
  const catalogQuery = useQuery({
    queryKey: alertIntegrationQueryKeys.catalog(),
    queryFn: ({ signal }) => loadAlertIntegrationCatalog(signal),
    retry: false
  });
  const catalogItem = catalogQuery.data?.items.find(item => item.source === selectedSource);
  const detailQuery = useQuery({
    queryKey: alertIntegrationQueryKeys.detail(selectedSource),
    queryFn: ({ signal }) => loadAlertIntegrationGuide(selectedSource, signal),
    enabled: catalogItem !== undefined,
    retry: false
  });
  const [copyEvidence, setCopyEvidence] = useState<AlertIntegrationCopyState>(null);
  const copyState = copyEvidence?.source === selectedSource ? copyEvidence : null;
  const state = resolveState(catalogQuery, detailQuery, catalogItem !== undefined);
  const guide = state.kind === 'ready' ? state.guide : undefined;
  const contract = guide ? buildAlertIngressContract(window.location.origin, guide) : undefined;
  const tokenSettingsPath = buildAlertIntegrationTokenSettingsPath(selectedSource);
  const copy = async (target: 'endpoint' | 'authorization', value?: string) => {
    if (!guide || guide.readiness === 'guide_blocked' || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyEvidence({ source: guide.source, target, outcome: 'copied' });
    } catch {
      setCopyEvidence({ source: guide.source, target, outcome: 'failed' });
    }
  };
  return {
    state,
    selectedSource,
    contract,
    copyState,
    tokenSettingsPath,
    actions: {
      selectSource: (source: string) => {
        setCopyEvidence(null);
        void navigate(buildAlertIntegrationPath(source));
      },
      retry: () => retryFailedState(state, catalogQuery, detailQuery, catalogItem !== undefined),
      openTokenSettings: () => navigate(tokenSettingsPath),
      copyEndpoint: () => copy('endpoint', contract?.endpoint),
      copyAuthorizationHeader: () => copy('authorization', contract?.authorizationHeader)
    }
  };
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
