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

import { useMemo, useState } from 'react';
import { rowsFromDraft, emptyRow, serializeScope, type ScopedClause } from '../model/explore-log-builder-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';

export function useLogQueryBuilder({ draft, updateField }: Pick<ExploreSubmissionViewModel, 'draft' | 'updateField'>) {
  const resource = draft.signal === 'logs' ? draft.resourceFilter : '';
  const attribute = draft.signal === 'logs' ? draft.attributeFilter : '';
  const sourceKey = resource + '\u0000' + attribute;
  const parsedRows = useMemo(() => rowsFromDraft(resource, attribute), [resource, attribute]);
  const [local, setLocal] = useState<{ sourceKey: string; rows: ScopedClause[] }>();
  const rows = local?.sourceKey === sourceKey ? local.rows : (parsedRows ?? []);
  const valid = serializeScope(rows, 'resource') !== undefined && serializeScope(rows, 'attribute') !== undefined;
  const write = (nextRows: ScopedClause[]) => {
    const resourceFilter = serializeScope(nextRows, 'resource');
    const attributeFilter = serializeScope(nextRows, 'attribute');
    setLocal({ sourceKey: (resourceFilter ?? resource) + '\u0000' + (attributeFilter ?? attribute), rows: nextRows });
    if (resourceFilter !== undefined) updateField({ field: 'resourceFilter', value: resourceFilter });
    if (attributeFilter !== undefined) updateField({ field: 'attributeFilter', value: attributeFilter });
  };
  return {
    rows,
    reset: () => setLocal(undefined),
    valid,
    lossless: Boolean(parsedRows),
    add: () => write([...rows, emptyRow()]),
    update: (index: number, changes: Partial<ScopedClause>) =>
      write(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...changes } : row))),
    remove: (index: number) => write(rows.filter((_, rowIndex) => rowIndex !== index))
  };
}
