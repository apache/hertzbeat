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
  executeFavoriteMutation,
  ownsFavoriteSource,
  type FavoriteOperation,
  type FavoriteSource,
  type MonitorMetricNotifications
} from './monitor-favorite-mutation-execution';
import {
  useMonitorFavoritePendingEvidence,
  type FavoritePendingExpectation
} from './use-monitor-favorite-pending-evidence';

export type { MonitorMetricNotifications } from './monitor-favorite-mutation-execution';

export function useMonitorFavoriteMutation(input: {
  monitorId: number | undefined;
  canonicalFavorites: string[] | undefined;
  message: MonitorMetricNotifications;
  queryClient: QueryClient;
  t: (key: string) => string;
}) {
  const { monitorId, canonicalFavorites, message, queryClient, t } = input;
  const [busyOperation, setBusyOperation] = useState<FavoriteOperation | undefined>(undefined);
  const lockedOperation = useRef<FavoriteOperation | undefined>(undefined);
  const operationCounter = useRef(0);
  const reread = useRef<AbortController | undefined>(undefined);
  const currentSource = useFavoriteSource(monitorId, reread, setBusyOperation);
  const pendingEvidence = useMonitorFavoritePendingEvidence(currentSource, canonicalFavorites);
  const toggle = useCallback(
    (metricKey: string, favorite: MonitorMetricFavoriteEvidence) =>
      runFavoriteToggle(
        {
          monitorId,
          currentSource,
          pendingEvidence,
          lockedOperation,
          operationCounter,
          reread,
          setBusyOperation,
          message,
          queryClient,
          t
        },
        metricKey,
        favorite
      ),
    [currentSource, message, monitorId, pendingEvidence, queryClient, reread, t]
  );
  const busyMetricKey =
    busyOperation && busyOperation.sourceToken === currentSource.current?.token
      ? busyOperation.metricKey
      : pendingEvidence.activeMetricKey;
  return { busyMetricKey, toggle };
}

async function runFavoriteToggle(
  input: {
    monitorId: number | undefined;
    currentSource: React.MutableRefObject<FavoriteSource | undefined>;
    pendingEvidence: ReturnType<typeof useMonitorFavoritePendingEvidence>;
    lockedOperation: React.MutableRefObject<FavoriteOperation | undefined>;
    operationCounter: React.MutableRefObject<number>;
    reread: React.MutableRefObject<AbortController | undefined>;
    setBusyOperation: React.Dispatch<React.SetStateAction<FavoriteOperation | undefined>>;
    message: MonitorMetricNotifications;
    queryClient: QueryClient;
    t: (key: string) => string;
  },
  metricKey: string,
  favorite: MonitorMetricFavoriteEvidence
) {
  const command = prepareFavoriteMutation(
    input.currentSource.current,
    input.monitorId,
    metricKey,
    favorite,
    input.pendingEvidence.reference,
    input.lockedOperation
  );
  if (!command) return;
  const operation = {
    monitorId: command.source.monitorId,
    metricKey,
    sourceToken: command.source.token,
    token: ++input.operationCounter.current
  };
  input.lockedOperation.current = operation;
  input.setBusyOperation(operation);
  try {
    await executeFavoriteMutation({
      ...input,
      operation,
      metricKey,
      desired: command.desired,
      canonicalToken: command.canonicalToken
    });
  } finally {
    if (input.lockedOperation.current?.token === operation.token) {
      input.lockedOperation.current = undefined;
      input.reread.current = undefined;
    }
    if (ownsFavoriteSource(input.currentSource.current, operation)) {
      input.setBusyOperation(current => (current?.token === operation.token ? undefined : current));
    }
  }
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
  const desired = !favorite.value;
  return {
    source: { ...source, monitorId },
    desired,
    canonicalToken: favoriteWriteToken(favorite, metricKey, desired)
  };
}

function favoriteWriteToken(favorite: MonitorMetricFavoriteEvidence, metricKey: string, desired: boolean) {
  if (desired || favorite.kind !== 'ready') return metricKey;
  return favorite.token ?? metricKey;
}

function abortFavoriteReread(reread: React.MutableRefObject<AbortController | undefined>) {
  reread.current?.abort();
  reread.current = undefined;
}
