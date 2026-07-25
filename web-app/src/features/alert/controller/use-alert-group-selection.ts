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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useMemo, useState } from 'react';

import { normalizeAlertGroupIds, writeAlertGroupQuery, type AlertGroupQuery } from '../model/alert-group-model';
import type { AlertGroupListState } from '../model/alert-group-state';

type AlertGroupSelection = { scope: string; source: AlertGroupListState; ids: number[] };

export function useAlertGroupSelection(query: AlertGroupQuery, list: AlertGroupListState) {
  const scope = writeAlertGroupQuery(query).toString();
  const [selection, setSelection] = useState<AlertGroupSelection>({ scope, source: list, ids: [] });
  const visibleIds = useMemo(() => new Set(list.kind === 'ready' ? list.records.map(record => record.id) : []), [list]);
  const selectedIds =
    selection.scope === scope && selection.source === list ? selection.ids.filter(id => visibleIds.has(id)) : [];

  const selectIds = useCallback(
    (ids: number[]) => {
      const visible = new Set(list.kind === 'ready' ? list.records.map(record => record.id) : []);
      const selected = ids.filter(id => visible.has(id));
      setSelection({ scope, source: list, ids: selected.length > 0 ? normalizeAlertGroupIds(selected) : [] });
    },
    [list, scope]
  );

  return { selectedIds, selectIds };
}
