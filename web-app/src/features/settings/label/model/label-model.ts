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

import type { LabelRecord as ApiLabelRecord } from '../api/label-api';

export type LabelRecord = ApiLabelRecord;
export type LabelListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: LabelRecord[]; total: number };

export function buildLabelDisplayName(label: Pick<LabelRecord, 'name' | 'tagValue'>) {
  const value = label.tagValue?.trim();
  return value ? `${label.name}:${value}` : label.name;
}

export function buildLabelMonitorPath(label: Pick<LabelRecord, 'name' | 'tagValue'>) {
  const params = new URLSearchParams({ labels: buildLabelDisplayName(label) });
  return `/monitors?${params.toString()}`;
}

export function labelTypeKey(type?: number) {
  if (type === 0) return 'labels.type.auto';
  if (type === 2) return 'labels.type.preset';
  return 'labels.type.user';
}
