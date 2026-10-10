/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useState } from 'react';
import { useLogPreferenceScope } from './use-log-preference-scope';
import type { LogFacetWorkspace } from '../model/explore-log-facet-workspace';
import type { LogFacetField } from '../model/explore-log-facets';
import { exploreLogPreferenceKey, type ExploreLogPreferenceScope } from '../model/explore-log-display-preferences';

const CORE_FACET_IDS = ['resource:host.name', 'builtin:serviceName', 'builtin:severityCategory'];
type StoredFacetState = { key: string | undefined; addedFacetIds: string[]; expandedFacetIds: string[] };

function readFacetState(key: string | undefined): StoredFacetState {
  if (!key) return { key, addedFacetIds: [], expandedFacetIds: ['builtin:severityCategory'] };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw || raw.length > 65_536) return { key, addedFacetIds: [], expandedFacetIds: ['builtin:severityCategory'] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid facet preferences');
    const value = parsed as { addedFacetIds?: unknown; expandedFacetIds?: unknown };
    return {
      key,
      addedFacetIds: validFacetIds(value.addedFacetIds),
      expandedFacetIds: validFacetIds(value.expandedFacetIds, ['builtin:severityCategory'])
    };
  } catch {
    return { key, addedFacetIds: [], expandedFacetIds: ['builtin:severityCategory'] };
  }
}

function validFacetIds(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return [
    ...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 512))
  ].slice(0, 100);
}

function writeFacetState(state: StoredFacetState) {
  if (!state.key) return;
  try {
    window.localStorage.setItem(
      state.key,
      JSON.stringify({
        addedFacetIds: state.addedFacetIds,
        expandedFacetIds: state.expandedFacetIds
      })
    );
  } catch {
    // Keep the current visit usable when browser storage is unavailable.
  }
}

function preferenceScope(scope: ExploreLogPreferenceScope | undefined) {
  return scope ? exploreLogPreferenceKey('facets', scope) : undefined;
}

export function useLogFacetWorkspace(): LogFacetWorkspace {
  const scope = useLogPreferenceScope();
  const key = preferenceScope(scope);
  const [visible, setVisible] = useState(true);
  const [availableFacetIds, setAvailable] = useState<string[]>([]);
  const [stored, setStored] = useState(() => readFacetState(key));
  if (stored.key !== key) setStored(readFacetState(key));
  const active = stored.key === key ? stored : readFacetState(key);
  const { addedFacetIds, expandedFacetIds } = active;
  const save = (next: StoredFacetState) => {
    setStored(next);
    writeFacetState(next);
  };
  const setAvailableFacetIds = useCallback((ids: readonly string[]) => {
    setAvailable(current =>
      current.length === ids.length && current.every((id, index) => id === ids[index]) ? current : [...ids]
    );
  }, []);
  const onAddFacet = (field: LogFacetField) => {
    if (!availableFacetIds.includes(field.id)) return false;
    save({
      ...active,
      addedFacetIds: addedFacetIds.includes(field.id) ? addedFacetIds : [...addedFacetIds, field.id],
      expandedFacetIds: expandedFacetIds.includes(field.id) ? expandedFacetIds : [...expandedFacetIds, field.id]
    });
    setVisible(true);
    return true;
  };
  return {
    visible,
    toggle: () => setVisible(current => !current),
    availableFacetIds,
    displayedFacetIds: [...CORE_FACET_IDS, ...addedFacetIds],
    addedFacetIds,
    expandedFacetIds,
    setAvailableFacetIds,
    onAddFacet,
    removeFacet: (id: string) => {
      if (!availableFacetIds.includes(id) || CORE_FACET_IDS.includes(id)) return false;
      save({
        ...active,
        addedFacetIds: addedFacetIds.filter(item => item !== id),
        expandedFacetIds: expandedFacetIds.filter(item => item !== id)
      });
      return true;
    },
    toggleFacet: (id: string) =>
      save({
        ...active,
        expandedFacetIds: expandedFacetIds.includes(id)
          ? expandedFacetIds.filter(item => item !== id)
          : [...expandedFacetIds, id]
      })
  };
}
