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
import { readLogGroupSelection } from '@/shared/log-group-selection';
export function logGroupSelectionLabel(raw: string, t: TFunction): string {
  const selection = readLogGroupSelection(raw);
  if (!selection) return t('explore.logGroupSelection.invalid');
  const value = selection.groups
    .map(
      group =>
        `${group.field}: ${group.kind === 'value' ? JSON.stringify(group.value) : t(`explore.logAnalysis.${group.kind === 'non_scalar' ? 'nonScalar' : group.kind}`)}`
    )
    .join(' AND ');
  return t('explore.logGroupSelection.label', { value });
}
