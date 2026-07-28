/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useMemo, useState } from 'react';

import type { RemoteFailureKind, RemotePageState } from '@/shared/remote-state';

type Identified = { id: number };
type SelectionSource<Item extends Identified, Failure extends RemoteFailureKind> = RemotePageState<Item, Failure>;
type PageSelection = {
  scope: string;
  projection: object | string;
  ids: number[];
};

/**
 * Owns selection for one authoritative backend page. Query changes and fresh
 * page projections invalidate the old selection instead of reviving stale IDs.
 */
export function useAuthoritativePageSelection<
  Item extends Identified,
  Failure extends RemoteFailureKind = RemoteFailureKind
>(scope: string, source: SelectionSource<Item, Failure>) {
  const records = source.kind === 'ready' ? source.records : undefined;
  const projection = records ?? source.kind;
  const [selection, setSelection] = useState<PageSelection>({ scope, projection, ids: [] });
  const visibleIds = useMemo(() => new Set(records?.map(record => record.id) ?? []), [records]);
  const isCurrent = selection.scope === scope && selection.projection === projection;
  const selectedIds = isCurrent ? selection.ids.filter(id => visibleIds.has(id)) : [];

  const selectIds = useCallback(
    (ids: number[]) => {
      const currentIds = [...new Set(ids.filter(id => visibleIds.has(id)))].sort((left, right) => left - right);
      setSelection({ scope, projection, ids: currentIds });
    },
    [projection, scope, visibleIds]
  );

  return { selectedIds, selectIds };
}
