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

import { apiFetch } from '@/core/http/http-client';

import { normalizeAlertRuleIds } from '../model/alert-rule-model';
import {
  alertRuleExportFilename,
  type AlertRuleExportArtifact,
  type AlertRuleExportFormat
} from '../model/alert-rule-export-model';

export type AlertRuleExportFailureKind = 'forbidden' | 'unavailable' | 'error';

export class AlertRuleExportError extends Error {
  constructor(readonly kind: AlertRuleExportFailureKind) {
    super('Alert Rule export failed');
    this.name = 'AlertRuleExportError';
  }
}

export async function requestAlertRuleExport(
  ids: readonly number[],
  format: AlertRuleExportFormat,
  signal?: AbortSignal
): Promise<AlertRuleExportArtifact> {
  let response: Response;
  try {
    const path = buildAlertRuleExportPath(ids, format);
    response = await (signal ? apiFetch(path, { signal }) : apiFetch(path));
  } catch {
    throw new AlertRuleExportError('unavailable');
  }
  if (!response.ok) throw new AlertRuleExportError(classifyStatus(response.status));
  if (isJsonContentType(response.headers.get('Content-Type'))) {
    // A failed export may arrive as an HTTP 200 JSON envelope. Its body can
    // contain private server detail and must never be surfaced or persisted.
    throw new AlertRuleExportError('error');
  }
  let data: Blob;
  try {
    data = await response.blob();
  } catch {
    throw new AlertRuleExportError('unavailable');
  }
  if (data.size === 0) throw new AlertRuleExportError('error');
  return {
    data,
    filename: alertRuleExportFilename(response.headers.get('Content-Disposition'), format)
  };
}

export function buildAlertRuleExportPath(ids: readonly number[], format: AlertRuleExportFormat) {
  const params = new URLSearchParams();
  normalizeAlertRuleIds(ids).forEach(id => params.append('ids', String(id)));
  params.set('type', format);
  return `/api/alert/defines/export?${params.toString()}`;
}

function classifyStatus(status: number): AlertRuleExportFailureKind {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 0 || status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'error';
}

function isJsonContentType(value: string | null) {
  const mediaType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType?.endsWith('/json') || mediaType?.endsWith('+json');
}
