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

import { useLayoutEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/core/auth/session-context';
import { loadTelemetrySources } from '../api/explore-source-api';
import { exploreQueryKeys } from './explore-query-keys';
import type { ExploreQuery } from '../model/explore-query';

export function useTelemetrySource(query: ExploreQuery) {
  const { session } = useSession();
  const client = useQueryClient();
  const source = query.source ?? 'external';
  const previous = useRef(source);
  const identity = JSON.stringify(session ? [session.username, session.workspaceId, session.roles] : []);
  const status = useQuery({
    queryKey: exploreQueryKeys.telemetrySources(identity),
    queryFn: ({ signal }) => loadTelemetrySources(signal),
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(session?.authenticated)
  });
  useLayoutEffect(() => {
    if (previous.current === source) return;
    const retired = previous.current;
    previous.current = source;
    const filters = {
      predicate: (candidate: { queryKey: readonly unknown[] }) => isSourceQuery(candidate.queryKey, retired)
    };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }, [client, source]);
  const self = status.data?.self;
  const availability = sourceAvailability(status.isPending, status.isError, self);
  const metricState = self?.metricsStatus === 'READY' ? 'ready' : 'metricsUnavailable';
  return {
    source,
    selfAccessible: self?.accessible ?? false,
    state: availability === 'ready' && query.signal === 'metrics' ? metricState : availability,
    retry: () => void status.refetch()
  };
}

export function isSourceQuery(key: readonly unknown[], source: string) {
  const root = key.find(part => typeof part === 'string' && (part === 'explore' || part.startsWith('explore-')));
  if (
    typeof root !== 'string' ||
    !(root === 'explore' || root.startsWith('explore-')) ||
    root === 'explore-telemetry-sources'
  )
    return false;
  return (sourceFromKeyParts(key) ?? 'external') === source;
}

function sourceFromKeyParts(parts: readonly unknown[]): string | undefined {
  for (const part of parts) {
    const source = sourceFromKeyPart(part);
    if (source) return source;
  }
  return undefined;
}

function sourceFromKeyPart(part: unknown): string | undefined {
  if (Array.isArray(part)) return sourceFromKeyParts(part);
  if (typeof part === 'string' && part.startsWith('/api/')) {
    return new URLSearchParams(part.split('?')[1]).get('source') ?? 'external';
  }
  return part && typeof part === 'object' ? sourceFromRequestObject(part) : undefined;
}

function sourceFromRequestObject(part: object): string | undefined {
  if ('source' in part && (part.source === 'self' || part.source === 'external')) return part.source;
  if ('parameters' in part && part.parameters && typeof part.parameters === 'object') {
    return sourceFromRequestObject(part.parameters);
  }
  return undefined;
}

function sourceAvailability(
  pending: boolean,
  error: boolean,
  self:
    | {
        enabled: boolean;
        accessible: boolean;
        ready: boolean;
      }
    | undefined
) {
  if (pending) return 'loading';
  if (error) return 'unavailable';
  if (!self?.enabled) return 'unconfigured';
  if (!self.accessible) return 'forbidden';
  return self.ready ? 'ready' : 'unready';
}
