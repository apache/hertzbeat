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

import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { MonitorMetricFavoriteEvidence } from '../model/monitor-detail-model';
import {
  attemptFavoriteWrite,
  favoriteVerificationMessage,
  verifyFavoriteWrite
} from './monitor-favorite-write-workflow';
import { monitorQueryKeys } from './monitor-query-keys';
import {
  useMonitorFavoritePendingEvidence,
  type FavoritePendingExpectation
} from './use-monitor-favorite-pending-evidence';

export type MonitorMetricNotifications = {
  success: (text: string) => unknown;
  error: (text: string) => unknown;
};

type FavoriteSource = { monitorId: number | undefined; token: number };
type FavoriteOperation = { monitorId: number; sourceToken: number; token: number };

export function useMonitorFavoriteMutation(input: {
  monitorId: number | undefined;
  metricKey: string;
  favorite: MonitorMetricFavoriteEvidence;
  canonicalFavorites: string[] | undefined;
  message: MonitorMetricNotifications;
  queryClient: QueryClient;
  t: (key: string) => string;
}) {
  const { monitorId, metricKey, favorite, canonicalFavorites, message, queryClient, t } = input;
  const [busyOperation, setBusyOperation] = useState<FavoriteOperation | undefined>(undefined);
  const lockedOperation = useRef<FavoriteOperation | undefined>(undefined);
  const operationCounter = useRef(0);
  const reread = useRef<AbortController | undefined>(undefined);
  const currentSource = useFavoriteSource(monitorId, reread, setBusyOperation);
  const pendingEvidence = useMonitorFavoritePendingEvidence(currentSource, canonicalFavorites, metricKey);
  const toggle = useCallback(async () => {
    const source = currentSource.current;
    const command = prepareFavoriteMutation(
      source,
      monitorId,
      metricKey,
      favorite,
      pendingEvidence.reference,
      lockedOperation
    );
    if (!command) return;
    const operation = {
      monitorId: command.source.monitorId,
      sourceToken: command.source.token,
      token: ++operationCounter.current
    };
    lockedOperation.current = operation;
    setBusyOperation(operation);
    try {
      await executeFavoriteMutation({
        operation,
        desired: command.desired,
        metricKey,
        currentSource,
        reread,
        pendingEvidence,
        message,
        queryClient,
        t
      });
    } finally {
      if (lockedOperation.current?.token === operation.token) {
        lockedOperation.current = undefined;
        reread.current = undefined;
      }
      if (ownsFavoriteSource(currentSource.current, operation)) {
        setBusyOperation(current => (current?.token === operation.token ? undefined : current));
      }
    }
  }, [currentSource, favorite, message, metricKey, monitorId, pendingEvidence, queryClient, reread, t]);
  return { busy: busyOperation?.sourceToken === currentSource.current?.token || pendingEvidence.active, toggle };
}

function useFavoriteSource(
  monitorId: number | undefined,
  reread: React.MutableRefObject<AbortController | undefined>,
  setBusyOperation: React.Dispatch<React.SetStateAction<FavoriteOperation | undefined>>
) {
  const sourceCounter = useRef(0);
  const currentSource = useRef<FavoriteSource | undefined>(undefined);
  useLayoutEffect(() => {
    const source = { monitorId, token: ++sourceCounter.current };
    currentSource.current = source;
    abortFavoriteReread(reread);
    setBusyOperation(undefined);
    return () => {
      if (currentSource.current?.token === source.token) currentSource.current = undefined;
      abortFavoriteReread(reread);
    };
  }, [monitorId, reread, setBusyOperation]);
  return currentSource;
}

function prepareFavoriteMutation(
  source: FavoriteSource | undefined,
  monitorId: number | undefined,
  metricKey: string,
  favorite: MonitorMetricFavoriteEvidence,
  pendingExpectation: React.MutableRefObject<FavoritePendingExpectation | undefined>,
  lockedOperation: React.MutableRefObject<FavoriteOperation | undefined>
) {
  if (monitorId === undefined || source === undefined || source.monitorId !== monitorId) return undefined;
  if (!metricKey || favorite.kind !== 'ready') return undefined;
  const pending = pendingExpectation.current;
  if (
    (pending?.sourceToken === source.token && pending.metricKey === metricKey) ||
    lockedOperation.current?.sourceToken === source.token
  ) {
    return undefined;
  }
  return { source: { ...source, monitorId }, desired: !favorite.value };
}

async function executeFavoriteMutation(input: {
  operation: FavoriteOperation;
  desired: boolean;
  metricKey: string;
  currentSource: React.MutableRefObject<FavoriteSource | undefined>;
  reread: React.MutableRefObject<AbortController | undefined>;
  pendingEvidence: {
    wait: (expectation: FavoritePendingExpectation) => void;
  };
  message: MonitorMetricNotifications;
  queryClient: QueryClient;
  t: (key: string) => string;
}) {
  const { operation, desired, metricKey, currentSource, reread, pendingEvidence, message, queryClient, t } = input;
  const write = await attemptFavoriteWrite(operation.monitorId, metricKey, desired);
  if (!ownsFavoriteSource(currentSource.current, operation)) return;
  if (write.kind === 'rejected') {
    void message.error(t('monitorMetrics.favoriteFailed'));
    return;
  }
  void message.success(t('monitorMetrics.favoriteSaved'));
  reread.current = new AbortController();
  const verification = await verifyFavoriteWrite(operation.monitorId, metricKey, desired, reread.current.signal);
  if (!ownsFavoriteSource(currentSource.current, operation)) return;
  if (verification.kind === 'verified') {
    queryClient.setQueryData(monitorQueryKeys.favorites(operation.monitorId), verification.evidence);
    return;
  }
  pendingEvidence.wait({ sourceToken: operation.sourceToken, metricKey, desired });
  void message.error(t(favoriteVerificationMessage(verification)));
  void queryClient.resetQueries({ queryKey: monitorQueryKeys.favorites(operation.monitorId), exact: true });
}

function ownsFavoriteSource(source: FavoriteSource | undefined, operation: FavoriteOperation) {
  return source?.token === operation.sourceToken && source.monitorId === operation.monitorId;
}

function abortFavoriteReread(reread: React.MutableRefObject<AbortController | undefined>) {
  reread.current?.abort();
  reread.current = undefined;
}
