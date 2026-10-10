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
import type { LogGroupKey } from '../../logs/log-grouping';
export function logAnalysisGroupLabel(
  group: { keys?: LogGroupKey[] | undefined; kind: string | null; value: string | null },
  t: TFunction
): string {
  return group.keys
    ? group.keys
        .map(key => (key.kind === 'value' ? JSON.stringify(key.value) : `[${groupValueLabel(key, t)}]`))
        .join(' / ')
    : groupValueLabel(group, t);
}
export function groupValueLabel(group: { kind: string | null; value: string | null }, t: TFunction) {
  return group.kind === 'value'
    ? group.value === ''
      ? t('explore.logAnalysis.empty')
      : group.value!
    : t(
        `explore.logAnalysis.${group.kind === 'all' ? 'everything' : group.kind === 'non_scalar' ? 'nonScalar' : group.kind}`
      );
}

export function logGroupingFieldLabel(field: string, t: TFunction) {
  return field.startsWith('builtin:') ? t(`explore.logFacets.builtin.${field.slice(8)}`) : field;
}
