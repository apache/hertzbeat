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

import { structuredFacetAction } from './explore-log-structured-facet-action';
import { ExploreSignalContractError } from './explore-signal-contract';
import type { LogExploreQuery } from './explore-query';
import type { LogExploreSubmissionDraft } from './explore-submission-model';

export function calculatedFacetSelection(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: string,
  value: string | number | boolean,
  intent: 'single' | 'toggle'
) {
  const name = field.startsWith('calculated:') ? field.slice('calculated:'.length) : '';
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(name) || (typeof value === 'number' && !Number.isFinite(value)))
    throw new ExploreSignalContractError('Invalid calculated facet selection');
  return structuredFacetAction(draft, scope, undefined, String(value), '=', intent, `#${name}`);
}
