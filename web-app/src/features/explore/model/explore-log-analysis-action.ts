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

import type { LogAnalysisGroup } from '@/platform/perses';
import type { LogFacetField } from './explore-log-facets';
import type { ExploreDraftFieldUpdate, LogExploreSubmissionDraft } from './explore-submission-model';
import { readLogGroupSelection, validLogGroupSelection } from '@/shared/log-group-selection';
export function logAnalysisGroupAction(
  draft: LogExploreSubmissionDraft,
  field: LogFacetField | null,
  group: LogAnalysisGroup
): { available: boolean; update?: ExploreDraftFieldUpdate } {
  if (!validLogGroupSelection(draft.logGroupSelection)) return { available: false };
  if (group.kind === 'all') return { available: field === null };
  const additions = readLogGroupSelection(
    JSON.stringify({
      version: 1,
      groups: group.keys ?? (field ? [{ field: field.id, kind: group.kind, value: group.value }] : [])
    })
  );
  if (!additions) return { available: false };
  const current = readLogGroupSelection(draft.logGroupSelection)?.groups ?? [];
  if (
    additions.groups.some(next =>
      current.some(
        existing =>
          existing.field === next.field && (existing.kind !== next.kind || (existing.value ?? null) !== next.value)
      )
    )
  )
    return { available: false };
  const groups = [
    ...current,
    ...additions.groups.filter(next => !current.some(existing => existing.field === next.field))
  ];
  if (groups.length === current.length) return { available: true };
  const value = JSON.stringify({ version: 1, groups });
  return validLogGroupSelection(value)
    ? { available: true, update: { field: 'logGroupSelection', value } }
    : { available: false };
}
