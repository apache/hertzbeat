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

import { useState } from 'react';
import { Segmented } from 'antd';
import type { TFunction } from 'i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';
import { ExploreLogCalculatedExtractionEditor } from './explore-log-calculated-extraction-editor';
import { FormulaEditor } from './explore-log-calculated-formula-editor';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { LogRow } from '../model/explore-signal-contract';

export function ExploreLogCalculatedV2Editor({
  raw,
  editingId,
  search,
  sort,
  analysis,
  validate,
  t,
  onClose,
  onApply,
  sources = [],
  initialExpression,
  contextRow
}: {
  raw: string | undefined;
  editingId?: string;
  search?: string;
  sort?: string | undefined;
  analysis?: string | undefined;
  validate: ValidateCalculatedFields;
  t: TFunction;
  onClose: () => void;
  onApply: (raw: string) => void;
  sources?: LogFacetField[];
  initialExpression?: string;
  contextRow?: LogRow;
}) {
  const editing = parseLogCalculatedV2(raw)?.fields.find(field => field.id === editingId);
  const [kind, setKind] = useState<'formula' | 'extraction'>(
    editing?.kind ?? (initialExpression ? 'formula' : 'extraction')
  );
  const mode = editing?.kind ?? kind;
  const modeControl = editingId ? null : (
    <Segmented
      block
      value={mode}
      onChange={value => setKind(value as 'formula' | 'extraction')}
      options={[
        { value: 'formula', label: t('explore.logCalculatedV2.formula') },
        { value: 'extraction', label: t('explore.logCalculatedV2.extraction') }
      ]}
    />
  );
  if (mode === 'extraction')
    return (
      <ExploreLogCalculatedExtractionEditor
        {...{ raw, editingId, search, sort, analysis, validate, t, onClose, onApply, sources, modeControl }}
      />
    );
  return (
    <FormulaEditor
      {...{ raw, editingId, search, sort, analysis, validate, t, onClose, onApply, modeControl }}
      {...(initialExpression ? { initialExpression } : {})}
      {...(contextRow ? { contextRow } : {})}
    />
  );
}
