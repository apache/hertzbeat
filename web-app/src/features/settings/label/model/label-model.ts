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

import type { RemotePageState } from '@/shared/remote-state';

export type LabelRecord = {
  id: number;
  name: string;
  tagValue?: string;
  description?: string;
  type?: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: number | string;
  gmtUpdate?: number | string;
};

export type LabelEditorState = { value: Partial<LabelRecord>; isNew: true } | { value: LabelRecord; isNew: false };

export type LabelIdentity = Pick<LabelRecord, 'name'> & Partial<Pick<LabelRecord, 'id' | 'tagValue'>>;

export type LabelPage = {
  content: LabelRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class LabelContractError extends Error {
  readonly code: string = 'LABEL_RESPONSE_INVALID';

  constructor(message = 'Label response is invalid') {
    super(message);
    this.name = 'LabelContractError';
  }
}

export type LabelListState = RemotePageState<LabelRecord, 'unavailable' | 'error'>;

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
