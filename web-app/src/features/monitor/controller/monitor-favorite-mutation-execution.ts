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

import * as favoriteWorkflow from './monitor-favorite-write-workflow';
import { monitorQueryKeys } from './monitor-query-keys';
import type { FavoritePendingExpectation } from './use-monitor-favorite-pending-evidence';

export type MonitorMetricNotifications = {
  success: (text: string) => unknown;
  error: (text: string) => unknown;
};

export type FavoriteSource = { monitorId: number | undefined; token: number };
export type FavoriteOperation = { monitorId: number; metricKey: string; sourceToken: number; token: number };

export async function executeFavoriteMutation(input: {
  operation: FavoriteOperation;
  desired: boolean;
  metricKey: string;
  canonicalToken: string;
  currentSource: React.MutableRefObject<FavoriteSource | undefined>;
  reread: React.MutableRefObject<AbortController | undefined>;
  pendingEvidence: { wait: (expectation: FavoritePendingExpectation) => void };
  message: MonitorMetricNotifications;
  queryClient: QueryClient;
  t: (key: string) => string;
}) {
  const {
    operation,
    desired,
    metricKey,
    canonicalToken,
    currentSource,
    reread,
    pendingEvidence,
    message,
    queryClient,
    t
  } = input;
  const write = await favoriteWorkflow.attemptFavoriteWrite(operation.monitorId, canonicalToken, desired);
  if (!ownsFavoriteSource(currentSource.current, operation)) return;
  if (write.kind === 'rejected') {
    void message.error(t('monitorMetrics.favoriteFailed'));
    return;
  }
  void message.success(t('monitorMetrics.favoriteSaved'));
  reread.current = new AbortController();
  const verification = await favoriteWorkflow.verifyFavoriteWrite(
    operation.monitorId,
    canonicalToken,
    desired,
    reread.current.signal
  );
  if (!ownsFavoriteSource(currentSource.current, operation)) return;
  if (verification.kind === 'verified') {
    queryClient.setQueryData(monitorQueryKeys.favorites(operation.monitorId), verification.evidence);
    return;
  }
  pendingEvidence.wait({ sourceToken: operation.sourceToken, metricKey, canonicalToken, desired });
  void message.error(t(favoriteWorkflow.favoriteVerificationMessage(verification)));
  void queryClient.resetQueries({ queryKey: monitorQueryKeys.favorites(operation.monitorId), exact: true });
}

export function ownsFavoriteSource(source: FavoriteSource | undefined, operation: FavoriteOperation) {
  return source?.token === operation.sourceToken && source.monitorId === operation.monitorId;
}
