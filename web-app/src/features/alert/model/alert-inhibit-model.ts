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

import { formatLabelMatchers, parseLabelMatchers } from '../shared/alert-label-matchers';
import { compactTablePageSizes } from '@/shared/pagination';

export const alertInhibitPageSizes = compactTablePageSizes;

export type AlertInhibitQuery = { search: string; pageIndex: number; pageSize: number };
export type AlertInhibitFailure = 'missing' | 'unavailable' | 'error';
export type AlertInhibitWriteOutcome = 'rejected' | 'uncertain';

export type AlertInhibitDraft = {
  id?: number;
  name: string;
  sourceLabelsText: string;
  targetLabelsText: string;
  equalLabels: string[];
  enable: boolean;
};

export type AlertInhibit = {
  id: number;
  name: string;
  sourceLabels: Record<string, string> | null;
  targetLabels: Record<string, string> | null;
  equalLabels: string[] | null;
  enable: boolean | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertInhibitPage = {
  content: AlertInhibit[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertInhibitContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertInhibitContractError';
  }
}

export class AlertInhibitMissingError extends Error {
  constructor() {
    super('Alert Inhibit detail is missing');
    this.name = 'AlertInhibitMissingError';
  }
}

export class AlertInhibitUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertInhibitUnavailableError';
  }
}

/**
 * Stable request evidence exposed by the Alert Inhibit API boundary. Transport
 * details stay private so controllers cannot depend on HTTP implementation.
 */
export class AlertInhibitRequestFailure extends Error {
  constructor(
    readonly kind: AlertInhibitFailure,
    readonly writeOutcome: AlertInhibitWriteOutcome
  ) {
    super('Alert Inhibit request failed');
    this.name = 'AlertInhibitRequestFailure';
  }
}

/** Maps domain failures to the read state understood by Alert Inhibit screens. */
export function alertInhibitFailureKind(error: unknown): AlertInhibitFailure {
  if (error instanceof AlertInhibitMissingError) return 'missing';
  if (error instanceof AlertInhibitUnavailableError) return 'unavailable';
  return error instanceof AlertInhibitRequestFailure ? error.kind : 'error';
}

/**
 * Only an explicit boundary rejection permits the receipt owner to repeat a
 * write. Every local or unknown outcome remains uncertain and requires proof.
 */
export function alertInhibitWriteOutcome(error: unknown): AlertInhibitWriteOutcome {
  return error instanceof AlertInhibitRequestFailure ? error.writeOutcome : 'uncertain';
}

export function readAlertInhibitQuery(params: URLSearchParams): AlertInhibitQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertInhibitPageSizes.includes(pageSize as (typeof alertInhibitPageSizes)[number]) ? pageSize : 8
  };
}

export function writeAlertInhibitQuery(query: AlertInhibitQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function createAlertInhibitDraft(): AlertInhibitDraft {
  return {
    name: '',
    sourceLabelsText: '',
    targetLabelsText: '',
    equalLabels: [],
    enable: true
  };
}

export function buildAlertInhibitPayload(draft: AlertInhibitDraft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    sourceLabels: parseLabelMatchers(draft.sourceLabelsText) ?? {},
    targetLabels: parseLabelMatchers(draft.targetLabelsText) ?? {},
    equalLabels: [...new Set(draft.equalLabels.map(label => label.trim()).filter(Boolean))],
    enable: draft.enable
  };
}

export function buildAlertInhibitTogglePayload(inhibit: AlertInhibit, enable: boolean) {
  return {
    id: inhibit.id,
    name: inhibit.name,
    sourceLabels: inhibit.sourceLabels,
    targetLabels: inhibit.targetLabels,
    equalLabels: inhibit.equalLabels,
    enable
  };
}

export function validateAlertInhibitDraft(draft: AlertInhibitDraft) {
  const invalid: Array<'name' | 'sourceLabels' | 'targetLabels' | 'equalLabels'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (!parseLabelMatchers(draft.sourceLabelsText)) invalid.push('sourceLabels');
  if (!parseLabelMatchers(draft.targetLabelsText)) invalid.push('targetLabels');
  if (draft.equalLabels.map(label => label.trim()).filter(Boolean).length === 0) invalid.push('equalLabels');
  return invalid;
}

export function alertInhibitDraftFromDetail(inhibit: AlertInhibit): AlertInhibitDraft {
  return {
    id: inhibit.id,
    name: inhibit.name ?? '',
    sourceLabelsText: formatLabelMatchers(inhibit.sourceLabels ?? undefined),
    targetLabelsText: formatLabelMatchers(inhibit.targetLabels ?? undefined),
    equalLabels: inhibit.equalLabels ?? [],
    enable: inhibit.enable ?? true
  };
}
