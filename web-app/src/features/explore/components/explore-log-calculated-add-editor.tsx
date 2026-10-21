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

import type { TFunction } from 'i18next';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { LogFacetField } from '../model/explore-log-facets';
import type { LogRow } from '../model/explore-signal-contract';
import { ExploreLogCalculatedV2Editor } from './explore-log-calculated-v2-editor';

export function CalculatedAddEditor({
  open,
  raw,
  validate,
  t,
  onClose,
  onChange,
  onSyntaxChange,
  sources,
  initialExpression,
  contextRow
}: {
  open: boolean;
  raw: string | undefined;
  validate: ValidateCalculatedFields | undefined;
  t: TFunction;
  onClose: () => void;
  onChange: ((raw: string) => void) | undefined;
  onSyntaxChange: ((syntax: string) => void) | undefined;
  sources: LogFacetField[];
  initialExpression?: string | undefined;
  contextRow?: LogRow | undefined;
}) {
  if (!open || !validate || !onChange) return null;
  return (
    <ExploreLogCalculatedV2Editor
      raw={raw}
      {...(initialExpression ? { initialExpression } : {})}
      {...(contextRow ? { contextRow } : {})}
      sources={sources}
      validate={validate}
      t={t}
      onClose={onClose}
      onApply={next => {
        onChange(next);
        onSyntaxChange?.('structured-v2');
      }}
    />
  );
}
