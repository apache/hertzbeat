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

export const alertGroupPageSizes = [8, 15, 25] as const;

export type AlertGroupQuery = { search: string; pageIndex: number; pageSize: number };

export type AlertGroupDraft = {
  id?: number;
  name: string;
  groupLabels: string[];
  groupWait: number;
  groupInterval: number;
  repeatInterval: number;
  enable: boolean;
};

export type AlertGroupConverge = {
  id: number;
  name: string;
  groupLabels: string[] | null;
  groupWait: number | null;
  groupInterval: number | null;
  repeatInterval: number | null;
  enable: boolean | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertGroupPage = {
  content: AlertGroupConverge[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertGroupContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertGroupContractError';
  }
}

export class AlertGroupMissingError extends Error {
  constructor() {
    super('Alert Group detail is missing');
    this.name = 'AlertGroupMissingError';
  }
}

export function readAlertGroupQuery(params: URLSearchParams): AlertGroupQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertGroupPageSizes.includes(pageSize as typeof alertGroupPageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertGroupQuery(query: AlertGroupQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertGroupListPath(query: AlertGroupQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/groups?${params.toString()}`;
}

export function createAlertGroupDraft(): AlertGroupDraft {
  return {
    name: '',
    groupLabels: [],
    groupWait: 30,
    groupInterval: 300,
    repeatInterval: 14400,
    enable: true
  };
}

export function buildAlertGroupPayload(draft: AlertGroupDraft) {
  const groupLabels = [...new Set(draft.groupLabels.map(label => label.trim()).filter(Boolean))];
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    groupLabels,
    groupWait: draft.groupWait,
    groupInterval: draft.groupInterval,
    repeatInterval: draft.repeatInterval,
    enable: draft.enable
  };
}

export function buildAlertGroupTogglePayload(group: AlertGroupConverge, enable: boolean) {
  return {
    id: group.id,
    name: group.name,
    groupLabels: group.groupLabels,
    groupWait: group.groupWait,
    groupInterval: group.groupInterval,
    repeatInterval: group.repeatInterval,
    enable
  };
}

export function validateAlertGroupDraft(draft: AlertGroupDraft) {
  const invalid: Array<'name' | 'groupLabels'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (draft.groupLabels.map(label => label.trim()).filter(Boolean).length === 0) invalid.push('groupLabels');
  return invalid;
}

export function alertGroupDraftFromDetail(group: AlertGroupConverge): AlertGroupDraft {
  return {
    id: group.id,
    name: group.name ?? '',
    groupLabels: group.groupLabels ?? [],
    groupWait: group.groupWait ?? 30,
    groupInterval: group.groupInterval ?? 300,
    repeatInterval: group.repeatInterval ?? 14400,
    enable: group.enable ?? true
  };
}
